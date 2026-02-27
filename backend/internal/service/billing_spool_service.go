package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/google/uuid"
)

type BillingSpoolEvent struct {
	Version int `json:"version"`

	// RecordedAt is when the spool event was created on this instance.
	RecordedAt time.Time `json:"recorded_at"`

	// Usage is the full usage log record to be inserted.
	Usage BillingSpoolUsageLog `json:"usage"`

	// Billing contains the ledger delta and linkage information.
	Billing BillingSpoolBilling `json:"billing"`

	// Optional: inviter id snapshot (for referral commission).
	InviterUserID *int64 `json:"inviter_user_id,omitempty"`
}

type BillingSpoolBilling struct {
	DeltaUSD float64 `json:"delta_usd"`

	BillingType int8 `json:"billing_type"`

	UserID   int64 `json:"user_id"`
	APIKeyID int64 `json:"api_key_id"`

	GroupID        *int64 `json:"group_id,omitempty"`
	SubscriptionID *int64 `json:"subscription_id,omitempty"`
}

type BillingSpoolUsageLog struct {
	UserID    int64 `json:"user_id"`
	APIKeyID  int64 `json:"api_key_id"`
	AccountID int64 `json:"account_id"`

	RequestID string `json:"request_id"`
	Model     string `json:"model"`

	BilledModel *string `json:"billed_model,omitempty"`

	GroupID        *int64 `json:"group_id,omitempty"`
	SubscriptionID *int64 `json:"subscription_id,omitempty"`

	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`

	CacheCreationTokens int `json:"cache_creation_tokens"`
	CacheReadTokens     int `json:"cache_read_tokens"`

	CacheCreation5mTokens int `json:"cache_creation_5m_tokens"`
	CacheCreation1hTokens int `json:"cache_creation_1h_tokens"`

	InputCost         float64 `json:"input_cost"`
	OutputCost        float64 `json:"output_cost"`
	CacheCreationCost float64 `json:"cache_creation_cost"`
	CacheReadCost     float64 `json:"cache_read_cost"`
	TotalCost         float64 `json:"total_cost"`
	ActualCost        float64 `json:"actual_cost"`

	RateMultiplier        float64  `json:"rate_multiplier"`
	AccountRateMultiplier *float64 `json:"account_rate_multiplier,omitempty"`

	Stream       bool `json:"stream"`
	DurationMs   *int `json:"duration_ms,omitempty"`
	FirstTokenMs *int `json:"first_token_ms,omitempty"`

	UserAgent *string `json:"user_agent,omitempty"`
	IPAddress *string `json:"ip_address,omitempty"`

	ImageCount int     `json:"image_count"`
	ImageSize  *string `json:"image_size,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

type billingSpoolApplyFunc func(ctx context.Context, ev *BillingSpoolEvent) error

// BillingSpoolService provides a best-effort, on-disk durable fallback when DB writes for usage logs fail.
//
// This protects against "upstream succeeded but local billing did not record" losses by persisting an event
// that can be replayed once infrastructure recovers.
type BillingSpoolService struct {
	entClient           *dbent.Client
	usageLogRepo        UsageLogRepository
	userRepo            UserRepository
	userSubRepo         UserSubscriptionRepository
	billingCacheService *BillingCacheService
	cfg                 *config.Config
	referralRateCache   referralCommissionRateCache

	apply billingSpoolApplyFunc

	startOnce sync.Once
	stopOnce  sync.Once
	stopCh    chan struct{}
	doneCh    chan struct{}
	wakeCh    chan struct{}

	mu       sync.Mutex
	dirsOnce sync.Once
	dirsErr  error
}

func NewBillingSpoolService(
	entClient *dbent.Client,
	usageLogRepo UsageLogRepository,
	userRepo UserRepository,
	userSubRepo UserSubscriptionRepository,
	billingCacheService *BillingCacheService,
	cfg *config.Config,
) *BillingSpoolService {
	s := &BillingSpoolService{
		entClient:           entClient,
		usageLogRepo:        usageLogRepo,
		userRepo:            userRepo,
		userSubRepo:         userSubRepo,
		billingCacheService: billingCacheService,
		cfg:                 cfg,
		stopCh:              make(chan struct{}),
		doneCh:              make(chan struct{}),
		wakeCh:              make(chan struct{}, 1),
	}
	s.apply = s.applyEventWithDB
	return s
}

func (s *BillingSpoolService) enabled() bool {
	return s != nil && s.cfg != nil && s.cfg.Billing.Spool.Enabled
}

func (s *BillingSpoolService) spoolBaseDir() string {
	if s == nil || s.cfg == nil {
		return ""
	}
	return strings.TrimSpace(s.cfg.Billing.Spool.Dir)
}

func (s *BillingSpoolService) pendingDir() string { return filepath.Join(s.spoolBaseDir(), "pending") }
func (s *BillingSpoolService) processingDir() string {
	return filepath.Join(s.spoolBaseDir(), "processing")
}
func (s *BillingSpoolService) doneDir() string { return filepath.Join(s.spoolBaseDir(), "done") }

func (s *BillingSpoolService) ensureDirs() error {
	if s == nil {
		return errors.New("nil service")
	}
	s.dirsOnce.Do(func() {
		if !s.enabled() {
			s.dirsErr = nil
			return
		}
		base := s.spoolBaseDir()
		if base == "" {
			s.dirsErr = errors.New("billing spool dir empty")
			return
		}
		if err := os.MkdirAll(s.pendingDir(), 0o755); err != nil {
			s.dirsErr = err
			return
		}
		if err := os.MkdirAll(s.processingDir(), 0o755); err != nil {
			s.dirsErr = err
			return
		}
		if err := os.MkdirAll(s.doneDir(), 0o755); err != nil {
			s.dirsErr = err
			return
		}
	})
	return s.dirsErr
}

func (s *BillingSpoolService) Start() {
	if !s.enabled() {
		return
	}
	s.startOnce.Do(func() {
		if err := s.ensureDirs(); err != nil {
			log.Printf("[BillingSpool] init failed: %v", err)
			return
		}
		// Crash recovery: any file left in processing is moved back to pending.
		_ = s.recoverProcessing()
		go s.runLoop()
	})
}

func (s *BillingSpoolService) Stop() {
	if s == nil {
		return
	}
	s.stopOnce.Do(func() {
		close(s.stopCh)
	})
	<-s.doneCh
}

func (s *BillingSpoolService) runLoop() {
	defer close(s.doneCh)

	interval := 30 * time.Second
	timeout := 5 * time.Second
	batch := 200
	if s.cfg != nil {
		if s.cfg.Billing.Spool.FlushInterval > 0 {
			interval = s.cfg.Billing.Spool.FlushInterval
		}
		if s.cfg.Billing.Spool.Timeout > 0 {
			timeout = s.cfg.Billing.Spool.Timeout
		}
		if s.cfg.Billing.Spool.BatchSize > 0 {
			batch = s.cfg.Billing.Spool.BatchSize
		}
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
		case <-s.wakeCh:
		}

		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		n, err := s.DrainOnce(ctx, batch)
		cancel()
		if err != nil {
			log.Printf("[BillingSpool] drain failed: %v", err)
			continue
		}
		if n > 0 {
			log.Printf("[BillingSpool] drained=%d", n)
		}
	}
}

func (s *BillingSpoolService) recoverProcessing() error {
	dir := s.processingDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		src := filepath.Join(dir, name)
		dst := filepath.Join(s.pendingDir(), name)
		_ = os.Rename(src, dst)
	}
	return nil
}

// Enqueue persists a billing event to disk for later replay.
func (s *BillingSpoolService) Enqueue(ctx context.Context, ev *BillingSpoolEvent) error {
	if !s.enabled() {
		return errors.New("billing spool disabled")
	}
	if ev == nil {
		return errors.New("nil event")
	}
	if err := s.ensureDirs(); err != nil {
		return err
	}

	ev.Version = 1
	if ev.RecordedAt.IsZero() {
		ev.RecordedAt = time.Now()
	}

	data, err := json.Marshal(ev)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	base := fmt.Sprintf("evt_%d_%s.json", time.Now().UnixNano(), uuid.New().String())
	tmp := filepath.Join(s.pendingDir(), base+".tmp")
	final := filepath.Join(s.pendingDir(), base)

	if err := os.WriteFile(tmp, append(data, '\n'), 0o644); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, final); err != nil {
		_ = os.Remove(tmp)
		return err
	}

	select {
	case s.wakeCh <- struct{}{}:
	default:
	}
	return nil
}

func (s *BillingSpoolService) DrainOnce(ctx context.Context, batchSize int) (int, error) {
	if !s.enabled() {
		return 0, nil
	}
	if err := s.ensureDirs(); err != nil {
		return 0, err
	}
	if batchSize <= 0 {
		batchSize = 200
	}

	files, err := s.listPendingFiles()
	if err != nil {
		return 0, err
	}
	if len(files) == 0 {
		return 0, nil
	}
	if len(files) > batchSize {
		files = files[:batchSize]
	}

	processed := 0
	for _, name := range files {
		select {
		case <-ctx.Done():
			return processed, ctx.Err()
		default:
		}

		pendingPath := filepath.Join(s.pendingDir(), name)
		processingPath := filepath.Join(s.processingDir(), name)
		if err := os.Rename(pendingPath, processingPath); err != nil {
			// Another goroutine/process picked it up; skip.
			continue
		}

		ev, err := readBillingSpoolEvent(processingPath)
		if err != nil {
			log.Printf("[BillingSpool] read failed (%s): %v", name, err)
			_ = os.Rename(processingPath, filepath.Join(s.doneDir(), name+".bad"))
			continue
		}

		if s.apply == nil {
			_ = os.Rename(processingPath, filepath.Join(s.doneDir(), name+".noop"))
			continue
		}

		if err := s.apply(ctx, ev); err != nil {
			log.Printf("[BillingSpool] apply failed (%s): %v", name, err)
			// Move back to pending for retry.
			_ = os.Rename(processingPath, filepath.Join(s.pendingDir(), name))
			continue
		}

		_ = os.Rename(processingPath, filepath.Join(s.doneDir(), name))
		processed++
	}

	return processed, nil
}

func (s *BillingSpoolService) listPendingFiles() ([]string, error) {
	entries, err := os.ReadDir(s.pendingDir())
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasSuffix(name, ".json") {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	return names, nil
}

func readBillingSpoolEvent(path string) (*BillingSpoolEvent, error) {
	cleanPath := filepath.Clean(path)
	fileName := filepath.Base(cleanPath)
	if fileName == "" || fileName == "." || fileName == string(filepath.Separator) {
		return nil, fmt.Errorf("invalid billing spool path: %s", path)
	}
	root, err := os.OpenRoot(filepath.Dir(cleanPath))
	if err != nil {
		return nil, err
	}
	defer func() { _ = root.Close() }()
	b, err := root.ReadFile(fileName)
	if err != nil {
		return nil, err
	}
	var ev BillingSpoolEvent
	if err := json.Unmarshal(b, &ev); err != nil {
		return nil, err
	}
	if ev.Billing.UserID <= 0 || ev.Billing.APIKeyID <= 0 || ev.Usage.UserID <= 0 || ev.Usage.APIKeyID <= 0 {
		return nil, errors.New("invalid billing identifiers")
	}
	if ev.Usage.RequestID == "" {
		return nil, errors.New("missing request_id")
	}
	return &ev, nil
}

func (s *BillingSpoolService) applyEventWithDB(ctx context.Context, ev *BillingSpoolEvent) error {
	if s == nil || ev == nil {
		return errors.New("nil")
	}
	if s.entClient == nil || s.usageLogRepo == nil || s.userRepo == nil || s.userSubRepo == nil {
		return errors.New("billing spool dependencies not configured")
	}

	tx, err := s.entClient.Tx(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	txCtx := dbent.NewTxContext(ctx, tx)

	ul := ev.Usage
	usageLog := &UsageLog{
		UserID:                ul.UserID,
		APIKeyID:              ul.APIKeyID,
		AccountID:             ul.AccountID,
		RequestID:             ul.RequestID,
		Model:                 ul.Model,
		BilledModel:           ul.BilledModel,
		GroupID:               ul.GroupID,
		SubscriptionID:        ul.SubscriptionID,
		InputTokens:           ul.InputTokens,
		OutputTokens:          ul.OutputTokens,
		CacheCreationTokens:   ul.CacheCreationTokens,
		CacheReadTokens:       ul.CacheReadTokens,
		CacheCreation5mTokens: ul.CacheCreation5mTokens,
		CacheCreation1hTokens: ul.CacheCreation1hTokens,
		InputCost:             ul.InputCost,
		OutputCost:            ul.OutputCost,
		CacheCreationCost:     ul.CacheCreationCost,
		CacheReadCost:         ul.CacheReadCost,
		TotalCost:             ul.TotalCost,
		ActualCost:            ul.ActualCost,
		RateMultiplier:        ul.RateMultiplier,
		AccountRateMultiplier: ul.AccountRateMultiplier,
		BillingType:           ev.Billing.BillingType,
		Stream:                ul.Stream,
		DurationMs:            ul.DurationMs,
		FirstTokenMs:          ul.FirstTokenMs,
		UserAgent:             ul.UserAgent,
		IPAddress:             ul.IPAddress,
		ImageCount:            ul.ImageCount,
		ImageSize:             ul.ImageSize,
		CreatedAt:             ul.CreatedAt,
	}

	_, err = s.usageLogRepo.Create(txCtx, usageLog)
	if err != nil {
		return err
	}

	if s.cfg != nil && s.cfg.RunMode == config.RunModeSimple {
		if err := tx.Commit(); err != nil {
			return err
		}
		return nil
	}

	delta := ev.Billing.DeltaUSD
	if delta <= 0 {
		if err := tx.Commit(); err != nil {
			return err
		}
		return nil
	}

	entry := &BillingUsageEntry{
		UsageLogID:  usageLog.ID,
		UserID:      ev.Billing.UserID,
		APIKeyID:    ev.Billing.APIKeyID,
		BillingType: ev.Billing.BillingType,
		Applied:     false,
		DeltaUSD:    delta,
		SubscriptionID: func() *int64 {
			if ev.Billing.SubscriptionID != nil {
				return ev.Billing.SubscriptionID
			}
			return nil
		}(),
	}

	_, err = s.usageLogRepo.CreateBillingUsageEntry(txCtx, entry)
	if err != nil {
		return err
	}

	alreadyApplied, lockErr := func() (bool, error) {
		// Lock by idempotency key (usage_log_id) to ensure concurrent drains don't double-apply.
		rows, err := tx.Client().QueryContext(txCtx, "SELECT applied FROM billing_usage_entries WHERE usage_log_id = $1 FOR UPDATE", entry.UsageLogID)
		if err != nil {
			return false, err
		}
		defer func() { _ = rows.Close() }()
		if !rows.Next() {
			if err := rows.Err(); err != nil {
				return false, err
			}
			return false, errors.New("billing usage entry missing")
		}
		var applied bool
		if err := rows.Scan(&applied); err != nil {
			return false, err
		}
		if err := rows.Err(); err != nil {
			return false, err
		}
		return applied, nil
	}()
	if lockErr != nil {
		return lockErr
	}

	appliedThisCall := false
	if !alreadyApplied {
		if entry.BillingType == BillingTypeSubscription {
			if ev.Billing.SubscriptionID == nil {
				return errors.New("subscription billing missing subscription_id")
			}
			if err := s.userSubRepo.IncrementUsage(txCtx, *ev.Billing.SubscriptionID, delta); err != nil {
				return err
			}
			if err := s.usageLogRepo.MarkBillingUsageEntryApplied(txCtx, entry.ID); err != nil {
				return err
			}
			appliedThisCall = true
		} else {
			if err := s.userRepo.DeductBalance(txCtx, ev.Billing.UserID, delta); err != nil {
				return err
			}
			if err := s.usageLogRepo.MarkBillingUsageEntryApplied(txCtx, entry.ID); err != nil {
				return err
			}
			appliedThisCall = true
		}
		if appliedThisCall {
			if err := tx.APIKey.UpdateOneID(ev.Billing.APIKeyID).AddQuotaUsedUsd(delta).Exec(txCtx); err != nil {
				// Do not fail the entire transaction for quota_used_usd drift; reconcile can be done later.
				log.Printf("[BillingSpool] increment api key quota used failed: %v", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if appliedThisCall && s.billingCacheService != nil {
		if entry.BillingType == BillingTypeSubscription && ev.Billing.GroupID != nil {
			s.billingCacheService.QueueUpdateSubscriptionUsage(ev.Billing.UserID, *ev.Billing.GroupID, delta)
		} else if entry.BillingType == BillingTypeBalance {
			s.billingCacheService.QueueDeductBalance(ev.Billing.UserID, delta)
		}
	}

	if appliedThisCall && ev.InviterUserID != nil {
		applyReferralCommissionBestEffort(ctx, s.entClient, &s.referralRateCache, s.billingCacheService, usageLog.ID, *ev.InviterUserID, ev.Billing.UserID, delta)
	}

	return nil
}
