package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

// 错误定义
// 注：ErrInsufficientBalance在redeem_service.go中定义
// 注：ErrDailyLimitExceeded/ErrWeeklyLimitExceeded/ErrMonthlyLimitExceeded在subscription_service.go中定义
var (
	ErrSubscriptionInvalid       = infraerrors.Forbidden("SUBSCRIPTION_INVALID", "subscription is invalid or expired")
	ErrBillingServiceUnavailable = infraerrors.ServiceUnavailable("BILLING_SERVICE_ERROR", "Billing service temporarily unavailable. Please retry later.")
)

// subscriptionCacheData 订阅缓存数据结构（内部使用）
type subscriptionCacheData struct {
	Status        string
	ExpiresAt     time.Time
	DailyUsage    float64
	WeeklyUsage   float64
	MonthlyUsage  float64
	ReservedUsage float64
	Version       int64
}

// 缓存写入任务类型
type cacheWriteKind int

const (
	cacheWriteSetBalance cacheWriteKind = iota
	cacheWriteSetSubscription
	cacheWriteUpdateSubscriptionUsage
	cacheWriteDeductBalance
)

// 异步缓存写入工作池配置
//
// 性能优化说明：
// 原实现在请求热路径中使用 goroutine 异步更新缓存，存在以下问题：
// 1. 每次请求创建新 goroutine，高并发下产生大量短生命周期 goroutine
// 2. 无法控制并发数量，可能导致 Redis 连接耗尽
// 3. goroutine 创建/销毁带来额外开销
//
// 新实现使用固定大小的工作池：
// 1. 预创建 10 个 worker goroutine，避免频繁创建销毁
// 2. 使用带缓冲的 channel（1000）作为任务队列，平滑写入峰值
// 3. 非阻塞写入，队列满时关键任务同步回退，非关键任务丢弃并告警
// 4. 统一超时控制，避免慢操作阻塞工作池
const (
	cacheWriteWorkerCount     = 10              // 工作协程数量
	cacheWriteBufferSize      = 1000            // 任务队列缓冲大小
	cacheWriteTimeout         = 2 * time.Second // 单个写入操作超时
	cacheWriteDropLogInterval = 5 * time.Second // 丢弃日志节流间隔
)

// cacheWriteTask 缓存写入任务
type cacheWriteTask struct {
	kind             cacheWriteKind
	userID           int64
	groupID          int64
	balance          float64
	amount           float64
	subscriptionData *subscriptionCacheData
}

// BillingCacheService 计费缓存服务
// 负责余额和订阅数据的缓存管理，提供高性能的计费资格检查
type BillingCacheService struct {
	cache          BillingCache
	userRepo       UserRepository
	subRepo        UserSubscriptionRepository
	cfg            *config.Config
	circuitBreaker *billingCircuitBreaker

	cacheWriteChan     chan cacheWriteTask
	cacheWriteWg       sync.WaitGroup
	cacheWriteStopOnce sync.Once
	// 丢弃日志节流计数器（减少高负载下日志噪音）
	cacheWriteDropFullCount     uint64
	cacheWriteDropFullLastLog   int64
	cacheWriteDropClosedCount   uint64
	cacheWriteDropClosedLastLog int64
}

// NewBillingCacheService 创建计费缓存服务
func NewBillingCacheService(cache BillingCache, userRepo UserRepository, subRepo UserSubscriptionRepository, cfg *config.Config) *BillingCacheService {
	svc := &BillingCacheService{
		cache:    cache,
		userRepo: userRepo,
		subRepo:  subRepo,
		cfg:      cfg,
	}
	svc.circuitBreaker = newBillingCircuitBreaker(cfg.Billing.CircuitBreaker)
	svc.startCacheWriteWorkers()
	return svc
}

// Stop 关闭缓存写入工作池
func (s *BillingCacheService) Stop() {
	s.cacheWriteStopOnce.Do(func() {
		if s.cacheWriteChan == nil {
			return
		}
		close(s.cacheWriteChan)
		s.cacheWriteWg.Wait()
		s.cacheWriteChan = nil
	})
}

func (s *BillingCacheService) startCacheWriteWorkers() {
	s.cacheWriteChan = make(chan cacheWriteTask, cacheWriteBufferSize)
	for i := 0; i < cacheWriteWorkerCount; i++ {
		s.cacheWriteWg.Add(1)
		go s.cacheWriteWorker()
	}
}

// enqueueCacheWrite 尝试将任务入队，队列满时返回 false（并记录告警）。
func (s *BillingCacheService) enqueueCacheWrite(task cacheWriteTask) (enqueued bool) {
	if s.cacheWriteChan == nil {
		return false
	}
	defer func() {
		if recovered := recover(); recovered != nil {
			// 队列已关闭时可能触发 panic，记录后静默失败。
			s.logCacheWriteDrop(task, "closed")
			enqueued = false
		}
	}()
	select {
	case s.cacheWriteChan <- task:
		return true
	default:
		// 队列满时不阻塞主流程，交由调用方决定是否同步回退。
		s.logCacheWriteDrop(task, "full")
		return false
	}
}

func (s *BillingCacheService) cacheWriteWorker() {
	defer s.cacheWriteWg.Done()
	for task := range s.cacheWriteChan {
		ctx, cancel := context.WithTimeout(context.Background(), cacheWriteTimeout)
		switch task.kind {
		case cacheWriteSetBalance:
			s.setBalanceCache(ctx, task.userID, task.balance)
		case cacheWriteSetSubscription:
			s.setSubscriptionCache(ctx, task.userID, task.groupID, task.subscriptionData)
		case cacheWriteUpdateSubscriptionUsage:
			if s.cache != nil {
				if err := s.cache.UpdateSubscriptionUsage(ctx, task.userID, task.groupID, task.amount); err != nil {
					log.Printf("Warning: update subscription cache failed for user %d group %d: %v", task.userID, task.groupID, err)
				}
			}
		case cacheWriteDeductBalance:
			if s.cache != nil {
				if err := s.cache.DeductUserBalance(ctx, task.userID, task.amount); err != nil {
					log.Printf("Warning: deduct balance cache failed for user %d: %v", task.userID, err)
				}
			}
		}
		cancel()
	}
}

// cacheWriteKindName 用于日志中的任务类型标识，便于排查丢弃原因。
func cacheWriteKindName(kind cacheWriteKind) string {
	switch kind {
	case cacheWriteSetBalance:
		return "set_balance"
	case cacheWriteSetSubscription:
		return "set_subscription"
	case cacheWriteUpdateSubscriptionUsage:
		return "update_subscription_usage"
	case cacheWriteDeductBalance:
		return "deduct_balance"
	default:
		return "unknown"
	}
}

// logCacheWriteDrop 使用节流方式记录丢弃情况，并汇总丢弃数量。
func (s *BillingCacheService) logCacheWriteDrop(task cacheWriteTask, reason string) {
	var (
		countPtr *uint64
		lastPtr  *int64
	)
	switch reason {
	case "full":
		countPtr = &s.cacheWriteDropFullCount
		lastPtr = &s.cacheWriteDropFullLastLog
	case "closed":
		countPtr = &s.cacheWriteDropClosedCount
		lastPtr = &s.cacheWriteDropClosedLastLog
	default:
		return
	}

	atomic.AddUint64(countPtr, 1)
	now := time.Now().UnixNano()
	last := atomic.LoadInt64(lastPtr)
	if now-last < int64(cacheWriteDropLogInterval) {
		return
	}
	if !atomic.CompareAndSwapInt64(lastPtr, last, now) {
		return
	}
	dropped := atomic.SwapUint64(countPtr, 0)
	if dropped == 0 {
		return
	}
	log.Printf("Warning: cache write queue %s, dropped %d tasks in last %s (latest kind=%s user %d group %d)",
		reason,
		dropped,
		cacheWriteDropLogInterval,
		cacheWriteKindName(task.kind),
		task.userID,
		task.groupID,
	)
}

// ============================================
// 余额缓存方法
// ============================================

// GetUserBalance 获取用户余额（优先从缓存读取）
func (s *BillingCacheService) GetUserBalance(ctx context.Context, userID int64) (float64, error) {
	if s.cache == nil {
		// Redis不可用，直接查询数据库
		return s.getUserBalanceFromDB(ctx, userID)
	}

	// 尝试从缓存读取
	balance, err := s.cache.GetUserBalance(ctx, userID)
	if err == nil {
		return balance, nil
	}

	// 缓存未命中，从数据库读取
	balance, err = s.getUserBalanceFromDB(ctx, userID)
	if err != nil {
		return 0, err
	}

	// 异步建立缓存
	_ = s.enqueueCacheWrite(cacheWriteTask{
		kind:    cacheWriteSetBalance,
		userID:  userID,
		balance: balance,
	})

	return balance, nil
}

// getUserBalanceFromDB 从数据库获取用户余额
func (s *BillingCacheService) getUserBalanceFromDB(ctx context.Context, userID int64) (float64, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("get user balance: %w", err)
	}
	return user.Balance, nil
}

// setBalanceCache 设置余额缓存
func (s *BillingCacheService) setBalanceCache(ctx context.Context, userID int64, balance float64) {
	if s.cache == nil {
		return
	}
	if err := s.cache.SetUserBalance(ctx, userID, balance); err != nil {
		log.Printf("Warning: set balance cache failed for user %d: %v", userID, err)
	}
}

// DeductBalanceCache 扣减余额缓存（同步调用）
func (s *BillingCacheService) DeductBalanceCache(ctx context.Context, userID int64, amount float64) error {
	if s.cache == nil {
		return nil
	}
	return s.cache.DeductUserBalance(ctx, userID, amount)
}

// QueueDeductBalance 异步扣减余额缓存
func (s *BillingCacheService) QueueDeductBalance(userID int64, amount float64) {
	if s.cache == nil {
		return
	}
	// 队列满时同步回退，避免关键扣减被静默丢弃。
	if s.enqueueCacheWrite(cacheWriteTask{
		kind:   cacheWriteDeductBalance,
		userID: userID,
		amount: amount,
	}) {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), cacheWriteTimeout)
	defer cancel()
	if err := s.DeductBalanceCache(ctx, userID, amount); err != nil {
		log.Printf("Warning: deduct balance cache fallback failed for user %d: %v", userID, err)
	}
}

// InvalidateUserBalance 失效用户余额缓存
func (s *BillingCacheService) InvalidateUserBalance(ctx context.Context, userID int64) error {
	if s.cache == nil {
		return nil
	}
	if err := s.cache.InvalidateUserBalance(ctx, userID); err != nil {
		log.Printf("Warning: invalidate balance cache failed for user %d: %v", userID, err)
		return err
	}
	return nil
}

// ============================================
// 订阅缓存方法
// ============================================

// GetSubscriptionStatus 获取订阅状态（优先从缓存读取）
func (s *BillingCacheService) GetSubscriptionStatus(ctx context.Context, userID, groupID int64) (*subscriptionCacheData, error) {
	if s.cache == nil {
		return s.getSubscriptionFromDB(ctx, userID, groupID)
	}

	// 尝试从缓存读取
	cacheData, err := s.cache.GetSubscriptionCache(ctx, userID, groupID)
	if err == nil && cacheData != nil {
		return s.convertFromPortsData(cacheData), nil
	}

	// 缓存未命中，从数据库读取
	data, err := s.getSubscriptionFromDB(ctx, userID, groupID)
	if err != nil {
		return nil, err
	}

	// 异步建立缓存
	_ = s.enqueueCacheWrite(cacheWriteTask{
		kind:             cacheWriteSetSubscription,
		userID:           userID,
		groupID:          groupID,
		subscriptionData: data,
	})

	return data, nil
}

func (s *BillingCacheService) convertFromPortsData(data *SubscriptionCacheData) *subscriptionCacheData {
	return &subscriptionCacheData{
		Status:        data.Status,
		ExpiresAt:     data.ExpiresAt,
		DailyUsage:    data.DailyUsage,
		WeeklyUsage:   data.WeeklyUsage,
		MonthlyUsage:  data.MonthlyUsage,
		ReservedUsage: data.ReservedUsage,
		Version:       data.Version,
	}
}

func (s *BillingCacheService) convertToPortsData(data *subscriptionCacheData) *SubscriptionCacheData {
	return &SubscriptionCacheData{
		Status:        data.Status,
		ExpiresAt:     data.ExpiresAt,
		DailyUsage:    data.DailyUsage,
		WeeklyUsage:   data.WeeklyUsage,
		MonthlyUsage:  data.MonthlyUsage,
		ReservedUsage: data.ReservedUsage,
		Version:       data.Version,
	}
}

// getSubscriptionFromDB 从数据库获取订阅数据
func (s *BillingCacheService) getSubscriptionFromDB(ctx context.Context, userID, groupID int64) (*subscriptionCacheData, error) {
	sub, err := s.subRepo.GetActiveByUserIDAndGroupID(ctx, userID, groupID)
	if err != nil {
		return nil, fmt.Errorf("get subscription: %w", err)
	}

	return &subscriptionCacheData{
		Status:        sub.Status,
		ExpiresAt:     sub.ExpiresAt,
		DailyUsage:    sub.DailyUsageUSD,
		WeeklyUsage:   sub.WeeklyUsageUSD,
		MonthlyUsage:  sub.MonthlyUsageUSD,
		ReservedUsage: 0,
		Version:       sub.UpdatedAt.Unix(),
	}, nil
}

// getSubscriptionStatusEnsureCache returns subscription status and ensures a cache key exists (for reservation).
func (s *BillingCacheService) getSubscriptionStatusEnsureCache(ctx context.Context, userID, groupID int64) (*subscriptionCacheData, error) {
	if s.cache == nil {
		return s.getSubscriptionFromDB(ctx, userID, groupID)
	}
	cacheData, err := s.cache.GetSubscriptionCache(ctx, userID, groupID)
	if err == nil && cacheData != nil {
		return s.convertFromPortsData(cacheData), nil
	}
	data, err := s.getSubscriptionFromDB(ctx, userID, groupID)
	if err != nil {
		return nil, err
	}
	// Synchronous cache set: reservation needs the Redis key to exist.
	s.setSubscriptionCache(ctx, userID, groupID, data)
	return data, nil
}

// setSubscriptionCache 设置订阅缓存
func (s *BillingCacheService) setSubscriptionCache(ctx context.Context, userID, groupID int64, data *subscriptionCacheData) {
	if s.cache == nil || data == nil {
		return
	}
	if err := s.cache.SetSubscriptionCache(ctx, userID, groupID, s.convertToPortsData(data)); err != nil {
		log.Printf("Warning: set subscription cache failed for user %d group %d: %v", userID, groupID, err)
	}
}

// UpdateSubscriptionUsage 更新订阅用量缓存（同步调用）
func (s *BillingCacheService) UpdateSubscriptionUsage(ctx context.Context, userID, groupID int64, costUSD float64) error {
	if s.cache == nil {
		return nil
	}
	return s.cache.UpdateSubscriptionUsage(ctx, userID, groupID, costUSD)
}

// QueueUpdateSubscriptionUsage 异步更新订阅用量缓存
func (s *BillingCacheService) QueueUpdateSubscriptionUsage(userID, groupID int64, costUSD float64) {
	if s.cache == nil {
		return
	}
	// 队列满时同步回退，确保订阅用量及时更新。
	if s.enqueueCacheWrite(cacheWriteTask{
		kind:    cacheWriteUpdateSubscriptionUsage,
		userID:  userID,
		groupID: groupID,
		amount:  costUSD,
	}) {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), cacheWriteTimeout)
	defer cancel()
	if err := s.UpdateSubscriptionUsage(ctx, userID, groupID, costUSD); err != nil {
		log.Printf("Warning: update subscription cache fallback failed for user %d group %d: %v", userID, groupID, err)
	}
}

// InvalidateSubscription 失效指定订阅缓存
func (s *BillingCacheService) InvalidateSubscription(ctx context.Context, userID, groupID int64) error {
	if s.cache == nil {
		return nil
	}
	if err := s.cache.InvalidateSubscriptionCache(ctx, userID, groupID); err != nil {
		log.Printf("Warning: invalidate subscription cache failed for user %d group %d: %v", userID, groupID, err)
		return err
	}
	return nil
}

// ============================================
// 统一检查方法
// ============================================

// CheckBillingEligibility 检查用户是否有资格发起请求
// 余额模式：检查缓存余额 > 0
// 订阅模式：检查缓存用量未超过限额（Group限额从参数传入）
func (s *BillingCacheService) CheckBillingEligibility(ctx context.Context, user *User, apiKey *APIKey, group *Group, subscription *UserSubscription) error {
	// 简易模式：跳过所有计费检查
	if s.cfg.RunMode == config.RunModeSimple {
		return nil
	}
	if s.circuitBreaker != nil && !s.circuitBreaker.Allow() {
		return ErrBillingServiceUnavailable
	}

	// 判断计费模式
	isSubscriptionMode := group != nil && group.IsSubscriptionType() && subscription != nil

	if isSubscriptionMode {
		return s.checkSubscriptionEligibility(ctx, user.ID, group, subscription)
	}

	return s.checkBalanceEligibility(ctx, user.ID)
}

type SubscriptionUsageReservation struct {
	UserID    int64
	GroupID   int64
	AmountUSD float64
}

// CheckBillingEligibilityAndReserve checks eligibility and reserves subscription quota (USD) atomically.
//
// For subscription mode, this provides concurrency-safe enforcement and prevents single-request overage
// by reserving an estimated max cost before forwarding upstream.
func (s *BillingCacheService) CheckBillingEligibilityAndReserve(ctx context.Context, user *User, apiKey *APIKey, group *Group, subscription *UserSubscription, reserveUSD float64) (*SubscriptionUsageReservation, error) {
	// 简易模式：跳过所有计费检查
	if s.cfg.RunMode == config.RunModeSimple {
		return nil, nil
	}
	if s.circuitBreaker != nil && !s.circuitBreaker.Allow() {
		return nil, ErrBillingServiceUnavailable
	}

	isSubscriptionMode := group != nil && group.IsSubscriptionType() && subscription != nil
	if !isSubscriptionMode {
		return nil, s.checkBalanceEligibility(ctx, user.ID)
	}

	if reserveUSD <= 0 {
		return nil, ErrBillingServiceUnavailable
	}

	err := s.reserveSubscriptionEligibility(ctx, user.ID, group, subscription, reserveUSD)
	if err != nil {
		return nil, err
	}
	return &SubscriptionUsageReservation{UserID: user.ID, GroupID: group.ID, AmountUSD: reserveUSD}, nil
}

// CheckBillingEligibilityAndReserveByKey is like CheckBillingEligibilityAndReserve but binds the reservation
// to a key (e.g. server request id) to make reservation/finalization idempotent.
func (s *BillingCacheService) CheckBillingEligibilityAndReserveByKey(ctx context.Context, user *User, apiKey *APIKey, group *Group, subscription *UserSubscription, key string, reserveUSD float64) (*SubscriptionUsageReservation, error) {
	// 简易模式：跳过所有计费检查
	if s.cfg.RunMode == config.RunModeSimple {
		return nil, nil
	}
	if s.circuitBreaker != nil && !s.circuitBreaker.Allow() {
		return nil, ErrBillingServiceUnavailable
	}

	isSubscriptionMode := group != nil && group.IsSubscriptionType() && subscription != nil
	if !isSubscriptionMode {
		return nil, s.checkBalanceEligibility(ctx, user.ID)
	}
	if reserveUSD <= 0 {
		return nil, ErrBillingServiceUnavailable
	}
	key = strings.TrimSpace(key)
	if key == "" {
		// Fallback to legacy behavior when no safe key provided.
		return s.CheckBillingEligibilityAndReserve(ctx, user, apiKey, group, subscription, reserveUSD)
	}

	// Ensure cache key exists by fetching status once, mirroring reserveSubscriptionEligibility behavior.
	subData, err := s.getSubscriptionStatusEnsureCache(ctx, user.ID, group.ID)
	if err != nil {
		if s.circuitBreaker != nil {
			s.circuitBreaker.OnFailure(err)
		}
		log.Printf("ALERT: billing subscription check failed for user %d group %d: %v", user.ID, group.ID, err)
		return nil, ErrBillingServiceUnavailable.WithCause(err)
	}
	if s.circuitBreaker != nil {
		s.circuitBreaker.OnSuccess()
	}

	if subData.Status != SubscriptionStatusActive || time.Now().After(subData.ExpiresAt) {
		return nil, ErrSubscriptionInvalid
	}

	code, err := s.ReserveSubscriptionReservationByKey(ctx, user.ID, group.ID, key, reserveUSD, group.DailyLimitUSD, group.WeeklyLimitUSD, group.MonthlyLimitUSD)
	if err != nil {
		if s.circuitBreaker != nil {
			s.circuitBreaker.OnFailure(err)
		}
		return nil, ErrBillingServiceUnavailable.WithCause(err)
	}
	switch code {
	case 1, 2:
		return &SubscriptionUsageReservation{UserID: user.ID, GroupID: group.ID, AmountUSD: reserveUSD}, nil
	case 0:
		// Key missing: refresh cache synchronously then retry once (same as reserveSubscriptionEligibility).
		s.setSubscriptionCache(ctx, user.ID, group.ID, subData)
		code2, err2 := s.ReserveSubscriptionReservationByKey(ctx, user.ID, group.ID, key, reserveUSD, group.DailyLimitUSD, group.WeeklyLimitUSD, group.MonthlyLimitUSD)
		if err2 != nil {
			if s.circuitBreaker != nil {
				s.circuitBreaker.OnFailure(err2)
			}
			return nil, ErrBillingServiceUnavailable.WithCause(err2)
		}
		switch code2 {
		case 1, 2:
			return &SubscriptionUsageReservation{UserID: user.ID, GroupID: group.ID, AmountUSD: reserveUSD}, nil
		case -1:
			return nil, ErrDailyLimitExceeded
		case -2:
			return nil, ErrWeeklyLimitExceeded
		case -3:
			return nil, ErrMonthlyLimitExceeded
		default:
			return nil, ErrBillingServiceUnavailable
		}
	case -1:
		return nil, ErrDailyLimitExceeded
	case -2:
		return nil, ErrWeeklyLimitExceeded
	case -3:
		return nil, ErrMonthlyLimitExceeded
	default:
		return nil, ErrBillingServiceUnavailable
	}
}

func (s *BillingCacheService) reserveSubscriptionEligibility(ctx context.Context, userID int64, group *Group, subscription *UserSubscription, reserveUSD float64) error {
	if s.cache == nil {
		return ErrBillingServiceUnavailable
	}

	subData, err := s.getSubscriptionStatusEnsureCache(ctx, userID, group.ID)
	if err != nil {
		if s.circuitBreaker != nil {
			s.circuitBreaker.OnFailure(err)
		}
		log.Printf("ALERT: billing subscription check failed for user %d group %d: %v", userID, group.ID, err)
		return ErrBillingServiceUnavailable.WithCause(err)
	}
	if s.circuitBreaker != nil {
		s.circuitBreaker.OnSuccess()
	}

	// 检查订阅状态
	if subData.Status != SubscriptionStatusActive {
		return ErrSubscriptionInvalid
	}
	if time.Now().After(subData.ExpiresAt) {
		return ErrSubscriptionInvalid
	}

	// Atomic check+reserve inside Redis to avoid concurrency overshoot.
	code, err := s.cache.ReserveSubscriptionUsage(ctx, userID, group.ID, reserveUSD, group.DailyLimitUSD, group.WeeklyLimitUSD, group.MonthlyLimitUSD)
	if err != nil {
		if s.circuitBreaker != nil {
			s.circuitBreaker.OnFailure(err)
		}
		return ErrBillingServiceUnavailable.WithCause(err)
	}

	switch code {
	case 1:
		return nil
	case 0:
		// Key missing: refresh cache synchronously then retry once.
		s.setSubscriptionCache(ctx, userID, group.ID, subData)
		code2, err2 := s.cache.ReserveSubscriptionUsage(ctx, userID, group.ID, reserveUSD, group.DailyLimitUSD, group.WeeklyLimitUSD, group.MonthlyLimitUSD)
		if err2 != nil {
			if s.circuitBreaker != nil {
				s.circuitBreaker.OnFailure(err2)
			}
			return ErrBillingServiceUnavailable.WithCause(err2)
		}
		switch code2 {
		case 1:
			return nil
		case -1:
			return ErrDailyLimitExceeded
		case -2:
			return ErrWeeklyLimitExceeded
		case -3:
			return ErrMonthlyLimitExceeded
		default:
			return ErrBillingServiceUnavailable
		}
	case -1:
		return ErrDailyLimitExceeded
	case -2:
		return ErrWeeklyLimitExceeded
	case -3:
		return ErrMonthlyLimitExceeded
	default:
		return ErrBillingServiceUnavailable
	}
}

// FinalizeSubscriptionReservation converts reserved quota into actual usage (or releases on failure).
func (s *BillingCacheService) FinalizeSubscriptionReservation(ctx context.Context, userID, groupID int64, reservedUSD, actualUSD float64) error {
	if s.cache == nil {
		return nil
	}
	return s.cache.FinalizeSubscriptionUsage(ctx, userID, groupID, reservedUSD, actualUSD)
}

// ReserveSubscriptionReservationByKey reserves subscription quota for a specific idempotency key.
// This avoids "late finalize releases the wrong reservation" issues by binding reserved quota to a key.
func (s *BillingCacheService) ReserveSubscriptionReservationByKey(ctx context.Context, userID, groupID int64, key string, reserveUSD float64, dailyLimitUSD, weeklyLimitUSD, monthlyLimitUSD *float64) (int, error) {
	if s == nil || s.cache == nil {
		return 0, ErrBillingServiceUnavailable
	}
	return s.cache.ReserveSubscriptionUsageByKey(ctx, userID, groupID, key, reserveUSD, dailyLimitUSD, weeklyLimitUSD, monthlyLimitUSD)
}

// FinalizeSubscriptionReservationByKey finalizes reservation for a specific idempotency key.
func (s *BillingCacheService) FinalizeSubscriptionReservationByKey(ctx context.Context, userID, groupID int64, key string, reservedUSD, actualUSD float64) error {
	if s == nil || s.cache == nil {
		return nil
	}
	return s.cache.FinalizeSubscriptionUsageByKey(ctx, userID, groupID, key, reservedUSD, actualUSD)
}

// checkBalanceEligibility 检查余额模式资格
func (s *BillingCacheService) checkBalanceEligibility(ctx context.Context, userID int64) error {
	balance, err := s.GetUserBalance(ctx, userID)
	if err != nil {
		if s.circuitBreaker != nil {
			s.circuitBreaker.OnFailure(err)
		}
		log.Printf("ALERT: billing balance check failed for user %d: %v", userID, err)
		return ErrBillingServiceUnavailable.WithCause(err)
	}
	if s.circuitBreaker != nil {
		s.circuitBreaker.OnSuccess()
	}

	if balance <= 0 {
		return ErrInsufficientBalance
	}

	return nil
}

// checkSubscriptionEligibility 检查订阅模式资格
func (s *BillingCacheService) checkSubscriptionEligibility(ctx context.Context, userID int64, group *Group, subscription *UserSubscription) error {
	// 获取订阅缓存数据
	subData, err := s.GetSubscriptionStatus(ctx, userID, group.ID)
	if err != nil {
		if s.circuitBreaker != nil {
			s.circuitBreaker.OnFailure(err)
		}
		log.Printf("ALERT: billing subscription check failed for user %d group %d: %v", userID, group.ID, err)
		return ErrBillingServiceUnavailable.WithCause(err)
	}
	if s.circuitBreaker != nil {
		s.circuitBreaker.OnSuccess()
	}

	// 检查订阅状态
	if subData.Status != SubscriptionStatusActive {
		return ErrSubscriptionInvalid
	}

	// 检查是否过期
	if time.Now().After(subData.ExpiresAt) {
		return ErrSubscriptionInvalid
	}

	// 检查限额（包含 in-flight 保留额度）
	if group.HasDailyLimit() && (subData.DailyUsage+subData.ReservedUsage) >= *group.DailyLimitUSD {
		return ErrDailyLimitExceeded
	}

	if group.HasWeeklyLimit() && (subData.WeeklyUsage+subData.ReservedUsage) >= *group.WeeklyLimitUSD {
		return ErrWeeklyLimitExceeded
	}

	if group.HasMonthlyLimit() && (subData.MonthlyUsage+subData.ReservedUsage) >= *group.MonthlyLimitUSD {
		return ErrMonthlyLimitExceeded
	}

	return nil
}

type billingCircuitBreakerState int

const (
	billingCircuitClosed billingCircuitBreakerState = iota
	billingCircuitOpen
	billingCircuitHalfOpen
)

type billingCircuitBreaker struct {
	mu                sync.Mutex
	state             billingCircuitBreakerState
	failures          int
	openedAt          time.Time
	failureThreshold  int
	resetTimeout      time.Duration
	halfOpenRequests  int
	halfOpenRemaining int
}

func newBillingCircuitBreaker(cfg config.CircuitBreakerConfig) *billingCircuitBreaker {
	if !cfg.Enabled {
		return nil
	}
	resetTimeout := time.Duration(cfg.ResetTimeoutSeconds) * time.Second
	if resetTimeout <= 0 {
		resetTimeout = 30 * time.Second
	}
	halfOpen := cfg.HalfOpenRequests
	if halfOpen <= 0 {
		halfOpen = 1
	}
	threshold := cfg.FailureThreshold
	if threshold <= 0 {
		threshold = 5
	}
	return &billingCircuitBreaker{
		state:            billingCircuitClosed,
		failureThreshold: threshold,
		resetTimeout:     resetTimeout,
		halfOpenRequests: halfOpen,
	}
}

func (b *billingCircuitBreaker) Allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	switch b.state {
	case billingCircuitClosed:
		return true
	case billingCircuitOpen:
		if time.Since(b.openedAt) < b.resetTimeout {
			return false
		}
		b.state = billingCircuitHalfOpen
		b.halfOpenRemaining = b.halfOpenRequests
		log.Printf("ALERT: billing circuit breaker entering half-open state")
		fallthrough
	case billingCircuitHalfOpen:
		if b.halfOpenRemaining <= 0 {
			return false
		}
		b.halfOpenRemaining--
		return true
	default:
		return false
	}
}

func (b *billingCircuitBreaker) OnFailure(err error) {
	if b == nil {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()

	switch b.state {
	case billingCircuitOpen:
		return
	case billingCircuitHalfOpen:
		b.state = billingCircuitOpen
		b.openedAt = time.Now()
		b.halfOpenRemaining = 0
		log.Printf("ALERT: billing circuit breaker opened after half-open failure: %v", err)
		return
	default:
		b.failures++
		if b.failures >= b.failureThreshold {
			b.state = billingCircuitOpen
			b.openedAt = time.Now()
			b.halfOpenRemaining = 0
			log.Printf("ALERT: billing circuit breaker opened after %d failures: %v", b.failures, err)
		}
	}
}

func (b *billingCircuitBreaker) OnSuccess() {
	if b == nil {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()

	previousState := b.state
	previousFailures := b.failures

	b.state = billingCircuitClosed
	b.failures = 0
	b.halfOpenRemaining = 0

	// 只有状态真正发生变化时才记录日志
	if previousState != billingCircuitClosed {
		log.Printf("ALERT: billing circuit breaker closed (was %s)", circuitStateString(previousState))
	} else if previousFailures > 0 {
		log.Printf("INFO: billing circuit breaker failures reset from %d", previousFailures)
	}
}

func circuitStateString(state billingCircuitBreakerState) string {
	switch state {
	case billingCircuitClosed:
		return "closed"
	case billingCircuitOpen:
		return "open"
	case billingCircuitHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}
