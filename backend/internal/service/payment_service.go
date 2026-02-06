package service

import (
	"context"
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/config"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/google/uuid"
	"github.com/imroc/req/v3"
	"github.com/tidwall/gjson"
)

type PaymentProviderInfo struct {
	Provider string   `json:"provider"`
	Channels []string `json:"channels,omitempty"`
}

type CreatePaymentResult struct {
	OrderID     int64      `json:"order_id"`
	OrderNo     string     `json:"order_no"`
	Provider    string     `json:"provider"`
	Channel     *string    `json:"channel,omitempty"`
	Currency    string     `json:"currency"`
	Amount      float64    `json:"amount"`
	Status      string     `json:"status"`
	CheckoutURL string     `json:"checkout_url"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

// PaymentService integrates third-party payment providers and credits user balance after verified callbacks.
type PaymentService struct {
	cfg                  *config.Config
	entClient            *dbent.Client
	orderRepo            PaymentOrderRepository
	userRepo             UserRepository
	redeemRepo           RedeemCodeRepository
	billingCache         *BillingCacheService
	authCacheInvalidator APIKeyAuthCacheInvalidator

	paypal *payPalClient
	creem  *creemClient
	epay   *ePayClient
}

func NewPaymentService(
	cfg *config.Config,
	entClient *dbent.Client,
	orderRepo PaymentOrderRepository,
	userRepo UserRepository,
	redeemRepo RedeemCodeRepository,
	billingCache *BillingCacheService,
	authCacheInvalidator APIKeyAuthCacheInvalidator,
) *PaymentService {
	s := &PaymentService{
		cfg:                  cfg,
		entClient:            entClient,
		orderRepo:            orderRepo,
		userRepo:             userRepo,
		redeemRepo:           redeemRepo,
		billingCache:         billingCache,
		authCacheInvalidator: authCacheInvalidator,
	}

	if cfg != nil {
		s.creem = newCreemClient(cfg)
		s.paypal = newPayPalClient(cfg)
		s.epay = newEPayClient(cfg)
	}

	return s
}

func (s *PaymentService) ListProviders() ([]PaymentProviderInfo, error) {
	if s.cfg == nil || !s.cfg.Payment.Enabled {
		return nil, ErrPaymentDisabled
	}

	var out []PaymentProviderInfo
	if s.cfg.Payment.Providers.Creem.Enabled {
		out = append(out, PaymentProviderInfo{Provider: PaymentProviderCreem})
	}
	if s.cfg.Payment.Providers.PayPal.Enabled {
		out = append(out, PaymentProviderInfo{Provider: PaymentProviderPayPal})
	}
	if s.cfg.Payment.Providers.EPay.Enabled {
		out = append(out, PaymentProviderInfo{Provider: PaymentProviderEPay, Channels: append([]string{}, s.cfg.Payment.Providers.EPay.Channels...)})
	}

	if len(out) == 0 {
		return nil, ErrPaymentDisabled
	}
	return out, nil
}

func (s *PaymentService) CreateTopUp(ctx context.Context, userID int64, amount float64, provider string, channel string) (*CreatePaymentResult, error) {
	if s.cfg == nil || !s.cfg.Payment.Enabled {
		return nil, ErrPaymentDisabled
	}
	if userID <= 0 {
		return nil, ErrInsufficientPerms
	}
	if amount <= 0 || math.IsNaN(amount) || math.IsInf(amount, 0) {
		return nil, ErrPaymentInvalidAmount
	}
	if amount < s.cfg.Payment.TopUpMin || amount > s.cfg.Payment.TopUpMax {
		return nil, ErrPaymentInvalidAmount
	}

	provider = strings.ToLower(strings.TrimSpace(provider))
	channel = strings.ToLower(strings.TrimSpace(channel))

	switch provider {
	case PaymentProviderCreem:
		if !s.cfg.Payment.Providers.Creem.Enabled {
			return nil, ErrPaymentProviderDisabled
		}
		// Creem units are integer. Enforce integer top-up amount for predictable crediting.
		if math.Abs(amount-math.Round(amount)) > 1e-9 {
			return nil, infraerrors.BadRequest("PAYMENT_AMOUNT_INTEGER_REQUIRED", "Creem top-up amount must be an integer")
		}
	case PaymentProviderPayPal:
		if !s.cfg.Payment.Providers.PayPal.Enabled {
			return nil, ErrPaymentProviderDisabled
		}
	case PaymentProviderEPay:
		if !s.cfg.Payment.Providers.EPay.Enabled {
			return nil, ErrPaymentProviderDisabled
		}
		if channel == "" {
			return nil, infraerrors.BadRequest("PAYMENT_CHANNEL_REQUIRED", "channel is required for epay")
		}
		allowed := false
		for _, ch := range s.cfg.Payment.Providers.EPay.Channels {
			if strings.EqualFold(ch, channel) {
				allowed = true
				break
			}
		}
		if !allowed {
			return nil, infraerrors.BadRequest("PAYMENT_CHANNEL_INVALID", "invalid epay channel")
		}
	default:
		return nil, ErrPaymentProviderInvalid
	}

	// Load user email for provider prefill (best effort).
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}

	now := time.Now()
	expiresAt := now.Add(s.cfg.Payment.OrderTTL)
	orderNo := s.generateOrderNo()

	var channelPtr *string
	if channel != "" {
		channelPtr = &channel
	}

	order := &PaymentOrder{
		OrderNo:   orderNo,
		UserID:    userID,
		Provider:  provider,
		Channel:   channelPtr,
		Currency:  s.cfg.Payment.BaseCurrency,
		Amount:    roundMoney(amount),
		Status:    PaymentStatusPending,
		ExpiresAt: &expiresAt,
	}

	if err := s.orderRepo.Create(ctx, order); err != nil {
		return nil, fmt.Errorf("create payment order: %w", err)
	}

	var checkoutURL string
	var providerOrderID *string
	var providerCheckoutID *string

	switch provider {
	case PaymentProviderPayPal:
		returnURL := strings.TrimRight(s.cfg.Payment.PublicBaseURL, "/") + "/billing"
		cancelURL := returnURL
		res, err := s.paypal.CreateOrder(ctx, orderNo, order.Amount, order.Currency, returnURL, cancelURL)
		if err != nil {
			_ = s.failOrder(ctx, order, err)
			return nil, err
		}
		checkoutURL = res.ApproveURL
		providerOrderID = &res.OrderID
	case PaymentProviderCreem:
		res, err := s.creem.CreateCheckout(ctx, user.Email, orderNo, int64(math.Round(order.Amount)))
		if err != nil {
			_ = s.failOrder(ctx, order, err)
			return nil, err
		}
		checkoutURL = res.CheckoutURL
		providerCheckoutID = &res.CheckoutID
	case PaymentProviderEPay:
		res, err := s.epay.BuildCheckoutURL(orderNo, order.Amount, order.Currency, channel)
		if err != nil {
			_ = s.failOrder(ctx, order, err)
			return nil, err
		}
		checkoutURL = res
	default:
		return nil, ErrPaymentProviderInvalid
	}

	if providerOrderID != nil {
		order.ProviderOrderID = providerOrderID
	}
	if providerCheckoutID != nil {
		order.ProviderCheckoutID = providerCheckoutID
	}
	if err := s.orderRepo.Update(ctx, order); err != nil {
		return nil, fmt.Errorf("update payment order: %w", err)
	}

	return &CreatePaymentResult{
		OrderID:     order.ID,
		OrderNo:     order.OrderNo,
		Provider:    order.Provider,
		Channel:     order.Channel,
		Currency:    order.Currency,
		Amount:      order.Amount,
		Status:      order.Status,
		CheckoutURL: checkoutURL,
		ExpiresAt:   order.ExpiresAt,
	}, nil
}

func (s *PaymentService) GetOrder(ctx context.Context, userID int64, orderID int64) (*PaymentOrder, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, ErrPaymentOrderForbidden
	}
	// UI semantics: if pending order is past expires_at, treat it as expired for display,
	// while keeping the DB status unchanged (late-paid callbacks may still arrive).
	if order.IsPending() && order.ExpiresAt != nil && time.Now().After(*order.ExpiresAt) {
		order.Status = PaymentStatusExpired
	}
	return order, nil
}

func (s *PaymentService) HandleCreemWebhook(ctx context.Context, signature string, body []byte) error {
	if s.cfg == nil || !s.cfg.Payment.Enabled || !s.cfg.Payment.Providers.Creem.Enabled {
		return ErrPaymentDisabled
	}
	if s.creem == nil {
		return ErrPaymentDisabled
	}
	if !s.creem.VerifySignature(signature, body) {
		return ErrPaymentWebhookInvalid
	}

	eventType := gjson.GetBytes(body, "event_type").String()
	if eventType == "" {
		eventType = gjson.GetBytes(body, "type").String()
	}
	if eventType != "checkout.completed" {
		// Ignore other events (200 OK).
		return nil
	}

	status := gjson.GetBytes(body, "data.object.status").String()
	if status == "" {
		status = gjson.GetBytes(body, "data.status").String()
	}
	if !strings.EqualFold(status, "completed") {
		return nil
	}

	orderNo := gjson.GetBytes(body, "data.object.request_id").String()
	if orderNo == "" {
		orderNo = gjson.GetBytes(body, "data.request_id").String()
	}
	if orderNo == "" {
		return ErrPaymentWebhookInvalid
	}

	checkoutID := gjson.GetBytes(body, "data.object.id").String()
	providerOrderID := gjson.GetBytes(body, "data.object.order.id").String()
	amountCentsStr := gjson.GetBytes(body, "data.object.order.amount").String()
	currency := gjson.GetBytes(body, "data.object.order.currency").String()

	var providerPayload map[string]any
	_ = json.Unmarshal(body, &providerPayload)

	// Validate currency/amount if provided (best effort).
	var paidAmount float64
	if amountCentsStr != "" {
		if v, err := strconv.ParseFloat(amountCentsStr, 64); err == nil {
			paidAmount = v / 100.0
		}
	}

	return s.markPaidByOrderNo(ctx, orderNo, PaymentProviderCreem, checkoutID, providerOrderID, currency, paidAmount, providerPayload)
}

func (s *PaymentService) HandlePayPalWebhook(ctx context.Context, headers http.Header, body []byte) error {
	if s.cfg == nil || !s.cfg.Payment.Enabled || !s.cfg.Payment.Providers.PayPal.Enabled {
		return ErrPaymentDisabled
	}
	if s.paypal == nil {
		return ErrPaymentDisabled
	}
	ok, err := s.paypal.VerifyWebhookSignature(ctx, headers, body)
	if err != nil {
		return err
	}
	if !ok {
		return ErrPaymentWebhookInvalid
	}

	eventType := gjson.GetBytes(body, "event_type").String()
	if eventType == "" {
		return nil
	}

	// Only credit on capture completed.
	if eventType != "PAYMENT.CAPTURE.COMPLETED" {
		return nil
	}

	captureStatus := gjson.GetBytes(body, "resource.status").String()
	if !strings.EqualFold(captureStatus, "COMPLETED") {
		return nil
	}

	captureID := gjson.GetBytes(body, "resource.id").String()
	orderID := gjson.GetBytes(body, "resource.supplementary_data.related_ids.order_id").String()
	if orderID == "" {
		orderID = gjson.GetBytes(body, "resource.invoice_id").String()
	}
	if orderID == "" {
		return ErrPaymentWebhookInvalid
	}

	currency := gjson.GetBytes(body, "resource.amount.currency_code").String()
	amountStr := gjson.GetBytes(body, "resource.amount.value").String()
	var paidAmount float64
	if amountStr != "" {
		if v, err := strconv.ParseFloat(amountStr, 64); err == nil {
			paidAmount = v
		}
	}

	var providerPayload map[string]any
	_ = json.Unmarshal(body, &providerPayload)

	return s.markPaidByProviderOrderID(ctx, PaymentProviderPayPal, orderID, captureID, currency, paidAmount, providerPayload)
}

// HandleEPayNotify handles EasyPay(易支付) async notify.
// It returns the raw response body that should be written back to upstream ("success" / "fail").
func (s *PaymentService) HandleEPayNotify(ctx context.Context, values url.Values) (string, error) {
	if s.cfg == nil || !s.cfg.Payment.Enabled || !s.cfg.Payment.Providers.EPay.Enabled {
		return "fail", ErrPaymentDisabled
	}
	if s.epay == nil {
		return "fail", ErrPaymentDisabled
	}

	if !s.epay.VerifyNotify(values) {
		return "fail", ErrPaymentWebhookInvalid
	}

	orderNo := strings.TrimSpace(values.Get("out_trade_no"))
	if orderNo == "" {
		return "fail", ErrPaymentWebhookInvalid
	}

	tradeStatus := strings.TrimSpace(values.Get("trade_status"))
	if tradeStatus != "" && !strings.EqualFold(tradeStatus, "TRADE_SUCCESS") && !strings.EqualFold(tradeStatus, "SUCCESS") {
		return "success", nil
	}

	tradeNo := strings.TrimSpace(values.Get("trade_no"))
	channel := strings.ToLower(strings.TrimSpace(values.Get("type")))
	moneyStr := strings.TrimSpace(values.Get("money"))
	var paidAmount float64
	if moneyStr != "" {
		if v, err := strconv.ParseFloat(moneyStr, 64); err == nil {
			paidAmount = v
		}
	}

	providerPayload := make(map[string]any, len(values))
	for k, vv := range values {
		if len(vv) == 1 {
			providerPayload[k] = vv[0]
		} else {
			providerPayload[k] = vv
		}
	}

	err := s.markPaidByOrderNo(ctx, orderNo, PaymentProviderEPay, channel, tradeNo, s.cfg.Payment.BaseCurrency, paidAmount, providerPayload)
	if err != nil {
		// Avoid losing credits: return "fail" on transient/internal errors so upstream will retry.
		// For deterministic validation errors, stop retries with "success" (order remains pending/failed for manual reconcile).
		if errors.Is(err, ErrPaymentWebhookInvalid) {
			return "success", err
		}
		return "fail", err
	}
	return "success", nil
}

func (s *PaymentService) markPaidByOrderNo(
	ctx context.Context,
	orderNo string,
	provider string,
	providerCheckoutID string,
	providerOrderID string,
	currency string,
	paidAmount float64,
	payload map[string]any,
) error {
	order, err := s.orderRepo.GetByOrderNo(ctx, orderNo)
	if err != nil {
		return err
	}
	if order.Provider != provider {
		return ErrPaymentWebhookInvalid
	}

	// Strict validations: webhooks must provide currency + amount, and must match the local order.
	if strings.TrimSpace(currency) == "" {
		return ErrPaymentWebhookInvalid
	}
	if paidAmount <= 0 || math.IsNaN(paidAmount) || math.IsInf(paidAmount, 0) {
		return ErrPaymentWebhookInvalid
	}
	if !strings.EqualFold(currency, order.Currency) {
		return ErrPaymentWebhookInvalid
	}
	if !amountAlmostEqual(paidAmount, order.Amount) {
		return ErrPaymentWebhookInvalid
	}

	if providerOrderID != "" && order.ProviderOrderID == nil {
		order.ProviderOrderID = &providerOrderID
	}
	if providerCheckoutID != "" && order.ProviderCheckoutID == nil {
		order.ProviderCheckoutID = &providerCheckoutID
	}

	return s.markOrderPaid(ctx, order, providerOrderID, payload)
}

func (s *PaymentService) markPaidByProviderOrderID(
	ctx context.Context,
	provider string,
	providerOrderID string,
	providerPaymentID string,
	currency string,
	paidAmount float64,
	payload map[string]any,
) error {
	order, err := s.orderRepo.GetByProviderOrderID(ctx, provider, providerOrderID)
	if err != nil {
		return err
	}
	// Strict validations: webhooks must provide currency + amount, and must match the local order.
	if strings.TrimSpace(currency) == "" {
		return ErrPaymentWebhookInvalid
	}
	if paidAmount <= 0 || math.IsNaN(paidAmount) || math.IsInf(paidAmount, 0) {
		return ErrPaymentWebhookInvalid
	}
	if !strings.EqualFold(currency, order.Currency) {
		return ErrPaymentWebhookInvalid
	}
	if !amountAlmostEqual(paidAmount, order.Amount) {
		return ErrPaymentWebhookInvalid
	}

	if providerPaymentID != "" {
		order.ProviderPaymentID = &providerPaymentID
	}
	return s.markOrderPaid(ctx, order, providerOrderID, payload)
}

func (s *PaymentService) markOrderPaid(ctx context.Context, order *PaymentOrder, providerRef string, payload map[string]any) error {
	if order == nil {
		return ErrPaymentOrderNotFound
	}

	// Transaction: order status -> user balance -> redeem/audit.
	tx, err := s.entClient.Tx(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	txCtx := dbent.NewTxContext(ctx, tx)

	locked, err := s.orderRepo.GetByIDForUpdate(txCtx, order.ID)
	if err != nil {
		return err
	}
	if locked.IsPaid() {
		_ = tx.Commit()
		return nil
	}
	if !locked.IsPending() && locked.Status != PaymentStatusExpired {
		_ = tx.Commit()
		return nil
	}

	now := time.Now()
	locked.Status = PaymentStatusPaid
	locked.PaidAt = &now
	if payload != nil {
		locked.ProviderPayload = payload
	}
	if locked.ProviderPaymentID == nil && order.ProviderPaymentID != nil {
		locked.ProviderPaymentID = order.ProviderPaymentID
	}
	if locked.ProviderOrderID == nil && order.ProviderOrderID != nil {
		locked.ProviderOrderID = order.ProviderOrderID
	}
	if locked.ProviderCheckoutID == nil && order.ProviderCheckoutID != nil {
		locked.ProviderCheckoutID = order.ProviderCheckoutID
	}
	if providerRef != "" && locked.ProviderOrderID == nil {
		locked.ProviderOrderID = &providerRef
	}

	if err := s.orderRepo.Update(txCtx, locked); err != nil {
		return err
	}

	if locked.Amount <= 0 {
		return ErrPaymentInvalidAmount
	}
	if err := s.userRepo.UpdateBalance(txCtx, locked.UserID, locked.Amount); err != nil {
		return fmt.Errorf("update user balance: %w", err)
	}

	// Create an adjustment record (reuse redeem_codes as audit trail, same as admin adjustments).
	if s.redeemRepo != nil {
		code, err := GenerateRedeemCode()
		if err == nil {
			notes := fmt.Sprintf("payment=%s order_no=%s provider_ref=%s", locked.Provider, locked.OrderNo, providerRef)
			adjustment := &RedeemCode{
				Code:   code,
				Type:   AdjustmentTypePaymentBalance,
				Value:  locked.Amount,
				Status: StatusUsed,
				UsedBy: &locked.UserID,
				Notes:  notes,
			}
			adjustment.UsedAt = &now
			_ = s.redeemRepo.Create(txCtx, adjustment)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	// Best-effort cache invalidation after commit.
	if s.authCacheInvalidator != nil {
		s.authCacheInvalidator.InvalidateAuthCacheByUserID(ctx, locked.UserID)
	}
	if s.billingCache != nil {
		_ = s.billingCache.InvalidateUserBalance(ctx, locked.UserID)
	}

	return nil
}

func (s *PaymentService) failOrder(ctx context.Context, order *PaymentOrder, cause error) error {
	if order == nil {
		return nil
	}
	order.Status = PaymentStatusFailed
	desc := ""
	if cause != nil {
		desc = cause.Error()
	}
	order.Description = &desc
	return s.orderRepo.Update(ctx, order)
}

func (s *PaymentService) generateOrderNo() string {
	// Compact and globally unique enough for external references.
	return "po_" + strings.ReplaceAll(uuid.NewString(), "-", "")
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

func amountAlmostEqual(a, b float64) bool {
	return math.Abs(a-b) <= 0.01
}

// =========================
// Creem
// =========================

type creemClient struct {
	apiBase       string
	apiKey        string
	webhookSecret []byte
	productID     string
	successURL    string
	http          *req.Client
}

type creemCreateResult struct {
	CheckoutID  string
	CheckoutURL string
}

func newCreemClient(cfg *config.Config) *creemClient {
	if cfg == nil || !cfg.Payment.Providers.Creem.Enabled {
		return nil
	}
	base := strings.TrimSpace(cfg.Payment.Providers.Creem.APIBaseURL)
	if base == "" {
		base = "https://api.creem.io"
	}
	return &creemClient{
		apiBase:       strings.TrimRight(base, "/"),
		apiKey:        cfg.Payment.Providers.Creem.APIKey,
		webhookSecret: []byte(cfg.Payment.Providers.Creem.WebhookSecret),
		productID:     cfg.Payment.Providers.Creem.TopUpProductID,
		successURL:    strings.TrimRight(cfg.Payment.PublicBaseURL, "/") + "/billing",
		http:          req.C().SetTimeout(15 * time.Second),
	}
}

func (c *creemClient) VerifySignature(signature string, payload []byte) bool {
	signature = strings.TrimSpace(signature)
	if signature == "" || len(c.webhookSecret) == 0 {
		return false
	}
	mac := hmac.New(sha256.New, c.webhookSecret)
	_, _ = mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(strings.ToLower(signature)), []byte(expected))
}

func (c *creemClient) CreateCheckout(ctx context.Context, customerEmail string, requestID string, units int64) (*creemCreateResult, error) {
	if c == nil {
		return nil, ErrPaymentDisabled
	}
	if strings.TrimSpace(c.apiKey) == "" || strings.TrimSpace(c.productID) == "" {
		return nil, errors.New("creem not configured")
	}
	if units <= 0 {
		return nil, ErrPaymentInvalidAmount
	}

	body := map[string]any{
		"product_id":  c.productID,
		"request_id":  requestID,
		"units":       units,
		"success_url": c.successURL,
		"customer": map[string]any{
			"email": customerEmail,
		},
		"metadata": map[string]any{
			"order_no": requestID,
		},
	}

	var resp struct {
		ID          string `json:"id"`
		CheckoutURL string `json:"checkout_url"`
	}

	r, err := c.http.R().
		SetContext(ctx).
		SetHeader("x-api-key", c.apiKey).
		SetHeader("Content-Type", "application/json").
		SetBodyJsonMarshal(body).
		SetSuccessResult(&resp).
		Post(c.apiBase + "/v1/checkouts")
	if err != nil {
		return nil, fmt.Errorf("creem create checkout: %w", err)
	}
	if r.IsErrorState() {
		return nil, fmt.Errorf("creem create checkout failed: status=%d body=%s", r.GetStatusCode(), r.String())
	}
	if strings.TrimSpace(resp.ID) == "" || strings.TrimSpace(resp.CheckoutURL) == "" {
		return nil, fmt.Errorf("creem create checkout returned empty id/checkout_url")
	}
	return &creemCreateResult{CheckoutID: resp.ID, CheckoutURL: resp.CheckoutURL}, nil
}

// =========================
// PayPal
// =========================

type payPalClient struct {
	cfg  config.PayPalPaymentConfig
	base string
	http *req.Client

	mu     sync.Mutex
	token  string
	expiry time.Time
}

type payPalCreateOrderResult struct {
	OrderID    string
	ApproveURL string
}

func newPayPalClient(cfg *config.Config) *payPalClient {
	if cfg == nil || !cfg.Payment.Providers.PayPal.Enabled {
		return nil
	}
	c := payPalClient{
		cfg:  cfg.Payment.Providers.PayPal,
		http: req.C().SetTimeout(20 * time.Second),
	}
	c.base = c.resolveBaseURL()
	return &c
}

func (c *payPalClient) resolveBaseURL() string {
	if strings.TrimSpace(c.cfg.APIBaseURL) != "" {
		return strings.TrimRight(strings.TrimSpace(c.cfg.APIBaseURL), "/")
	}
	mode := strings.ToLower(strings.TrimSpace(c.cfg.Mode))
	if mode == "live" {
		return "https://api-m.paypal.com"
	}
	return "https://api-m.sandbox.paypal.com"
}

func (c *payPalClient) getAccessToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.token != "" && time.Now().Add(30*time.Second).Before(c.expiry) {
		return c.token, nil
	}

	var resp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
		TokenType   string `json:"token_type"`
	}

	auth := base64.StdEncoding.EncodeToString([]byte(c.cfg.ClientID + ":" + c.cfg.ClientSecret))

	r, err := c.http.R().
		SetContext(ctx).
		SetHeader("Authorization", "Basic "+auth).
		SetHeader("Content-Type", "application/x-www-form-urlencoded").
		SetFormData(map[string]string{"grant_type": "client_credentials"}).
		SetSuccessResult(&resp).
		Post(c.base + "/v1/oauth2/token")
	if err != nil {
		return "", fmt.Errorf("paypal oauth token: %w", err)
	}
	if r.IsErrorState() {
		return "", fmt.Errorf("paypal oauth token failed: status=%d body=%s", r.GetStatusCode(), r.String())
	}
	if resp.AccessToken == "" {
		return "", fmt.Errorf("paypal oauth token empty")
	}
	c.token = resp.AccessToken
	c.expiry = time.Now().Add(time.Duration(resp.ExpiresIn) * time.Second)
	return c.token, nil
}

func (c *payPalClient) CreateOrder(ctx context.Context, customID string, amount float64, currency string, returnURL string, cancelURL string) (*payPalCreateOrderResult, error) {
	if c == nil {
		return nil, ErrPaymentDisabled
	}
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, err
	}

	body := map[string]any{
		"intent": "CAPTURE",
		"purchase_units": []any{
			map[string]any{
				"custom_id": customID,
				"amount": map[string]any{
					"currency_code": strings.ToUpper(currency),
					"value":         fmt.Sprintf("%.2f", amount),
				},
			},
		},
		"application_context": map[string]any{
			"return_url": returnURL,
			"cancel_url": cancelURL,
		},
	}

	var resp struct {
		ID    string `json:"id"`
		Links []struct {
			Href string `json:"href"`
			Rel  string `json:"rel"`
		} `json:"links"`
	}

	r, err := c.http.R().
		SetContext(ctx).
		SetBearerAuthToken(token).
		SetHeader("Content-Type", "application/json").
		SetBodyJsonMarshal(body).
		SetSuccessResult(&resp).
		Post(c.base + "/v2/checkout/orders")
	if err != nil {
		return nil, fmt.Errorf("paypal create order: %w", err)
	}
	if r.IsErrorState() {
		return nil, fmt.Errorf("paypal create order failed: status=%d body=%s", r.GetStatusCode(), r.String())
	}

	approve := ""
	for _, l := range resp.Links {
		if l.Rel == "approve" && l.Href != "" {
			approve = l.Href
			break
		}
	}
	if resp.ID == "" || approve == "" {
		return nil, fmt.Errorf("paypal create order returned empty id/approve link")
	}
	return &payPalCreateOrderResult{OrderID: resp.ID, ApproveURL: approve}, nil
}

func (c *payPalClient) VerifyWebhookSignature(ctx context.Context, headers http.Header, rawBody []byte) (bool, error) {
	if c == nil {
		return false, ErrPaymentDisabled
	}
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return false, err
	}

	getHeader := func(key string) string {
		return headers.Get(key)
	}

	transmissionID := getHeader("PAYPAL-TRANSMISSION-ID")
	transmissionTime := getHeader("PAYPAL-TRANSMISSION-TIME")
	certURL := getHeader("PAYPAL-CERT-URL")
	authAlgo := getHeader("PAYPAL-AUTH-ALGO")
	transmissionSig := getHeader("PAYPAL-TRANSMISSION-SIG")

	if transmissionID == "" || transmissionTime == "" || certURL == "" || authAlgo == "" || transmissionSig == "" {
		return false, fmt.Errorf("paypal webhook missing required headers")
	}

	var event any
	if err := json.Unmarshal(rawBody, &event); err != nil {
		return false, fmt.Errorf("paypal webhook body invalid json: %w", err)
	}

	payload := map[string]any{
		"transmission_id":   transmissionID,
		"transmission_time": transmissionTime,
		"cert_url":          certURL,
		"auth_algo":         authAlgo,
		"transmission_sig":  transmissionSig,
		"webhook_id":        c.cfg.WebhookID,
		"webhook_event":     event,
	}

	var resp struct {
		VerificationStatus string `json:"verification_status"`
	}

	r, err := c.http.R().
		SetContext(ctx).
		SetBearerAuthToken(token).
		SetHeader("Content-Type", "application/json").
		SetBodyJsonMarshal(payload).
		SetSuccessResult(&resp).
		Post(c.base + "/v1/notifications/verify-webhook-signature")
	if err != nil {
		return false, fmt.Errorf("paypal verify webhook signature: %w", err)
	}
	if r.IsErrorState() {
		return false, fmt.Errorf("paypal verify webhook signature failed: status=%d body=%s", r.GetStatusCode(), r.String())
	}

	return strings.EqualFold(resp.VerificationStatus, "SUCCESS"), nil
}

// =========================
// EasyPay (易支付)
// =========================

type ePayClient struct {
	cfg       config.EPayPaymentConfig
	base      string
	notifyURL string
	returnURL string
}

func newEPayClient(cfg *config.Config) *ePayClient {
	if cfg == nil || !cfg.Payment.Providers.EPay.Enabled {
		return nil
	}
	publicBase := strings.TrimRight(strings.TrimSpace(cfg.Payment.PublicBaseURL), "/")
	return &ePayClient{
		cfg:       cfg.Payment.Providers.EPay,
		base:      strings.TrimSpace(cfg.Payment.BaseCurrency),
		notifyURL: publicBase + "/api/v1/payments/webhooks/epay",
		returnURL: publicBase + "/billing",
	}
}

func (c *ePayClient) BuildCheckoutURL(orderNo string, amount float64, currency string, channel string) (string, error) {
	if c == nil {
		return "", ErrPaymentDisabled
	}
	if strings.TrimSpace(c.cfg.GatewayURL) == "" || strings.TrimSpace(c.cfg.MerchantID) == "" || strings.TrimSpace(c.cfg.MerchantKey) == "" {
		return "", errors.New("epay not configured")
	}
	if !strings.EqualFold(strings.TrimSpace(currency), strings.TrimSpace(c.base)) {
		// This project uses base_currency as unit for balance; keep it consistent in v1.
		return "", infraerrors.BadRequest("PAYMENT_CURRENCY_UNSUPPORTED", "currency not supported")
	}

	params := map[string]string{
		"pid":          c.cfg.MerchantID,
		"type":         channel,
		"out_trade_no": orderNo,
		"notify_url":   c.notifyURL,
		"return_url":   c.returnURL,
		"name":         "TopUp",
		"money":        fmt.Sprintf("%.2f", amount),
	}

	signType := strings.ToUpper(strings.TrimSpace(c.cfg.SignType))
	if signType == "" {
		signType = "MD5"
	}
	params["sign_type"] = signType
	params["sign"] = epaySign(params, c.cfg.MerchantKey)

	u, err := url.Parse(strings.TrimSpace(c.cfg.GatewayURL))
	if err != nil {
		return "", err
	}
	q := u.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func (c *ePayClient) VerifyNotify(values url.Values) bool {
	if c == nil {
		return false
	}
	sign := strings.TrimSpace(values.Get("sign"))
	signType := strings.ToUpper(strings.TrimSpace(values.Get("sign_type")))
	if signType == "" {
		signType = "MD5"
	}
	if sign == "" || signType != "MD5" {
		return false
	}

	params := make(map[string]string, len(values))
	for k := range values {
		if strings.EqualFold(k, "sign") || strings.EqualFold(k, "sign_type") {
			continue
		}
		params[k] = strings.TrimSpace(values.Get(k))
	}
	params["sign_type"] = signType

	expected := epaySign(params, c.cfg.MerchantKey)
	return strings.EqualFold(expected, sign)
}

func epaySign(params map[string]string, key string) string {
	keys := make([]string, 0, len(params))
	for k, v := range params {
		if v == "" || strings.EqualFold(k, "sign") || strings.EqualFold(k, "sign_type") {
			continue
		}
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var b strings.Builder
	for i, k := range keys {
		if i > 0 {
			_ = b.WriteByte('&')
		}
		_, _ = b.WriteString(k)
		_ = b.WriteByte('=')
		_, _ = b.WriteString(params[k])
	}
	_, _ = b.WriteString("&key=")
	_, _ = b.WriteString(key)
	sum := md5Hex(b.String())
	return strings.ToLower(sum)
}

func md5Hex(s string) string {
	h := md5.New()
	_, _ = h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}
