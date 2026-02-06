package service

import "context"

type PaymentOrderRepository interface {
	Create(ctx context.Context, order *PaymentOrder) error
	GetByID(ctx context.Context, id int64) (*PaymentOrder, error)
	GetByIDForUpdate(ctx context.Context, id int64) (*PaymentOrder, error)
	GetByOrderNo(ctx context.Context, orderNo string) (*PaymentOrder, error)
	GetByProviderOrderID(ctx context.Context, provider string, providerOrderID string) (*PaymentOrder, error)
	GetByProviderCheckoutID(ctx context.Context, provider string, checkoutID string) (*PaymentOrder, error)
	Update(ctx context.Context, order *PaymentOrder) error
}
