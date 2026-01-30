package service

import (
	"context"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type paymentOrderRepoGetByIDStub struct {
	PaymentOrderRepository
	order *PaymentOrder
}

func (s paymentOrderRepoGetByIDStub) GetByID(_ context.Context, _ int64) (*PaymentOrder, error) {
	if s.order == nil {
		return nil, ErrPaymentOrderNotFound
	}
	clone := *s.order
	return &clone, nil
}

func TestPaymentService_GetOrder_NormalizesExpiredPendingOrderForDisplay(t *testing.T) {
	t.Parallel()

	expiredAt := time.Now().Add(-1 * time.Hour)
	order := &PaymentOrder{
		ID:        1,
		UserID:    7,
		Status:    PaymentStatusPending,
		ExpiresAt: &expiredAt,
	}

	svc := &PaymentService{
		cfg:       &config.Config{},
		orderRepo: paymentOrderRepoGetByIDStub{order: order},
	}

	got, err := svc.GetOrder(context.Background(), 7, 1)
	require.NoError(t, err)
	require.Equal(t, PaymentStatusExpired, got.Status)
}
