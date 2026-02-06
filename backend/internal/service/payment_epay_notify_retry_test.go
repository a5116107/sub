package service

import (
	"context"
	"errors"
	"net/url"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type paymentOrderRepoEPayStub struct {
	PaymentOrderRepository

	getErr error
	order  *PaymentOrder
}

func (s *paymentOrderRepoEPayStub) GetByOrderNo(_ context.Context, _ string) (*PaymentOrder, error) {
	if s.getErr != nil {
		return nil, s.getErr
	}
	if s.order == nil {
		return nil, ErrPaymentOrderNotFound
	}
	return s.order, nil
}

func TestPaymentService_HandleEPayNotify_ReturnsFailOnInternalError(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{}
	cfg.Payment.Enabled = true
	cfg.Payment.BaseCurrency = "USD"
	cfg.Payment.Providers.EPay.Enabled = true

	repo := &paymentOrderRepoEPayStub{getErr: errors.New("db down")}
	svc := &PaymentService{
		cfg:       cfg,
		orderRepo: repo,
		epay: &ePayClient{
			cfg:  cfg.Payment.Providers.EPay,
			base: cfg.Payment.BaseCurrency,
		},
	}

	values := url.Values{}
	values.Set("out_trade_no", "o1")
	values.Set("trade_no", "t1")
	values.Set("type", "alipay")
	values.Set("money", "10.00")
	values.Set("trade_status", "TRADE_SUCCESS")
	values.Set("sign_type", "MD5")

	params := map[string]string{
		"out_trade_no": values.Get("out_trade_no"),
		"trade_no":     values.Get("trade_no"),
		"type":         values.Get("type"),
		"money":        values.Get("money"),
		"trade_status": values.Get("trade_status"),
		"sign_type":    values.Get("sign_type"),
	}
	key := "k"
	values.Set("sign", epaySign(params, key))
	svc.epay.cfg.MerchantKey = key

	body, err := svc.HandleEPayNotify(context.Background(), values)
	require.Error(t, err)
	require.Equal(t, "fail", body)
}

func TestPaymentService_HandleEPayNotify_ReturnsSuccessOnValidationError(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{}
	cfg.Payment.Enabled = true
	cfg.Payment.BaseCurrency = "USD"
	cfg.Payment.Providers.EPay.Enabled = true

	repo := &paymentOrderRepoEPayStub{order: &PaymentOrder{Provider: PaymentProviderPayPal}}
	svc := &PaymentService{
		cfg:       cfg,
		orderRepo: repo,
		epay: &ePayClient{
			cfg:  cfg.Payment.Providers.EPay,
			base: cfg.Payment.BaseCurrency,
		},
	}

	values := url.Values{}
	values.Set("out_trade_no", "o1")
	values.Set("trade_no", "t1")
	values.Set("type", "alipay")
	values.Set("money", "10.00")
	values.Set("trade_status", "TRADE_SUCCESS")
	values.Set("sign_type", "MD5")

	params := map[string]string{
		"out_trade_no": values.Get("out_trade_no"),
		"trade_no":     values.Get("trade_no"),
		"type":         values.Get("type"),
		"money":        values.Get("money"),
		"trade_status": values.Get("trade_status"),
		"sign_type":    values.Get("sign_type"),
	}
	key := "k"
	values.Set("sign", epaySign(params, key))
	svc.epay.cfg.MerchantKey = key

	body, err := svc.HandleEPayNotify(context.Background(), values)
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrPaymentWebhookInvalid))
	require.Equal(t, "success", body)
}
