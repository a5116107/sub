package service

import (
	"context"
	"errors"
	"testing"
)

type paymentOrderRepoStub struct {
	orderByOrderNo         map[string]*PaymentOrder
	orderByProviderOrderID map[string]*PaymentOrder
}

func (p *paymentOrderRepoStub) Create(ctx context.Context, order *PaymentOrder) error {
	return errors.New("not implemented")
}
func (p *paymentOrderRepoStub) GetByID(ctx context.Context, id int64) (*PaymentOrder, error) {
	return nil, errors.New("not implemented")
}
func (p *paymentOrderRepoStub) GetByIDForUpdate(ctx context.Context, id int64) (*PaymentOrder, error) {
	return nil, errors.New("not implemented")
}
func (p *paymentOrderRepoStub) GetByOrderNo(ctx context.Context, orderNo string) (*PaymentOrder, error) {
	if p.orderByOrderNo == nil {
		return nil, ErrPaymentOrderNotFound
	}
	if v, ok := p.orderByOrderNo[orderNo]; ok {
		return v, nil
	}
	return nil, ErrPaymentOrderNotFound
}
func (p *paymentOrderRepoStub) GetByProviderOrderID(ctx context.Context, provider string, providerOrderID string) (*PaymentOrder, error) {
	if p.orderByProviderOrderID == nil {
		return nil, ErrPaymentOrderNotFound
	}
	key := provider + ":" + providerOrderID
	if v, ok := p.orderByProviderOrderID[key]; ok {
		return v, nil
	}
	return nil, ErrPaymentOrderNotFound
}
func (p *paymentOrderRepoStub) GetByProviderCheckoutID(ctx context.Context, provider string, checkoutID string) (*PaymentOrder, error) {
	return nil, errors.New("not implemented")
}
func (p *paymentOrderRepoStub) Update(ctx context.Context, order *PaymentOrder) error {
	return errors.New("not implemented")
}

func TestPaymentService_StrictWebhookValidation_OrderNo(t *testing.T) {
	ctx := context.Background()
	order := &PaymentOrder{
		ID:       1,
		OrderNo:  "o1",
		Provider: PaymentProviderEPay,
		Currency: "USD",
		Amount:   10,
		Status:   PaymentStatusPending,
	}
	repo := &paymentOrderRepoStub{
		orderByOrderNo: map[string]*PaymentOrder{"o1": order},
	}
	svc := &PaymentService{orderRepo: repo}

	t.Run("missing_currency_rejected", func(t *testing.T) {
		err := svc.markPaidByOrderNo(ctx, "o1", PaymentProviderEPay, "", "p1", "", 10, nil)
		if !errors.Is(err, ErrPaymentWebhookInvalid) {
			t.Fatalf("expected ErrPaymentWebhookInvalid, got %v", err)
		}
	})

	t.Run("missing_amount_rejected", func(t *testing.T) {
		err := svc.markPaidByOrderNo(ctx, "o1", PaymentProviderEPay, "", "p1", "USD", 0, nil)
		if !errors.Is(err, ErrPaymentWebhookInvalid) {
			t.Fatalf("expected ErrPaymentWebhookInvalid, got %v", err)
		}
	})

	t.Run("currency_mismatch_rejected", func(t *testing.T) {
		err := svc.markPaidByOrderNo(ctx, "o1", PaymentProviderEPay, "", "p1", "EUR", 10, nil)
		if !errors.Is(err, ErrPaymentWebhookInvalid) {
			t.Fatalf("expected ErrPaymentWebhookInvalid, got %v", err)
		}
	})

	t.Run("amount_mismatch_rejected", func(t *testing.T) {
		err := svc.markPaidByOrderNo(ctx, "o1", PaymentProviderEPay, "", "p1", "USD", 9.98, nil)
		if !errors.Is(err, ErrPaymentWebhookInvalid) {
			t.Fatalf("expected ErrPaymentWebhookInvalid, got %v", err)
		}
	})
}

func TestPaymentService_StrictWebhookValidation_ProviderOrderID(t *testing.T) {
	ctx := context.Background()
	order := &PaymentOrder{
		ID:       2,
		OrderNo:  "o2",
		Provider: PaymentProviderPayPal,
		Currency: "USD",
		Amount:   15,
		Status:   PaymentStatusPending,
	}
	repo := &paymentOrderRepoStub{
		orderByProviderOrderID: map[string]*PaymentOrder{PaymentProviderPayPal + ":prov_o2": order},
	}
	svc := &PaymentService{orderRepo: repo}

	t.Run("missing_currency_rejected", func(t *testing.T) {
		err := svc.markPaidByProviderOrderID(ctx, PaymentProviderPayPal, "prov_o2", "pay_1", "", 15, nil)
		if !errors.Is(err, ErrPaymentWebhookInvalid) {
			t.Fatalf("expected ErrPaymentWebhookInvalid, got %v", err)
		}
	})

	t.Run("missing_amount_rejected", func(t *testing.T) {
		err := svc.markPaidByProviderOrderID(ctx, PaymentProviderPayPal, "prov_o2", "pay_1", "USD", 0, nil)
		if !errors.Is(err, ErrPaymentWebhookInvalid) {
			t.Fatalf("expected ErrPaymentWebhookInvalid, got %v", err)
		}
	})

	t.Run("currency_mismatch_rejected", func(t *testing.T) {
		err := svc.markPaidByProviderOrderID(ctx, PaymentProviderPayPal, "prov_o2", "pay_1", "EUR", 15, nil)
		if !errors.Is(err, ErrPaymentWebhookInvalid) {
			t.Fatalf("expected ErrPaymentWebhookInvalid, got %v", err)
		}
	})

	t.Run("amount_mismatch_rejected", func(t *testing.T) {
		err := svc.markPaidByProviderOrderID(ctx, PaymentProviderPayPal, "prov_o2", "pay_1", "USD", 14.5, nil)
		if !errors.Is(err, ErrPaymentWebhookInvalid) {
			t.Fatalf("expected ErrPaymentWebhookInvalid, got %v", err)
		}
	})
}
