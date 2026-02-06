package repository

import (
	"context"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/paymentorder"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

type paymentOrderRepository struct {
	client *dbent.Client
}

func NewPaymentOrderRepository(client *dbent.Client) service.PaymentOrderRepository {
	return &paymentOrderRepository{client: client}
}

func (r *paymentOrderRepository) Create(ctx context.Context, order *service.PaymentOrder) error {
	client := clientFromContext(ctx, r.client)
	builder := client.PaymentOrder.Create().
		SetOrderNo(order.OrderNo).
		SetUserID(order.UserID).
		SetProvider(order.Provider).
		SetCurrency(order.Currency).
		SetAmount(order.Amount).
		SetStatus(order.Status)

	if order.Channel != nil {
		builder.SetChannel(*order.Channel)
	}
	if order.ProviderOrderID != nil {
		builder.SetProviderOrderID(*order.ProviderOrderID)
	}
	if order.ProviderPaymentID != nil {
		builder.SetProviderPaymentID(*order.ProviderPaymentID)
	}
	if order.ProviderCheckoutID != nil {
		builder.SetProviderCheckoutID(*order.ProviderCheckoutID)
	}
	if order.ProviderPayload != nil {
		builder.SetProviderPayload(order.ProviderPayload)
	}
	if order.Description != nil {
		builder.SetDescription(*order.Description)
	}
	if order.PaidAt != nil {
		builder.SetPaidAt(*order.PaidAt)
	}
	if order.ExpiresAt != nil {
		builder.SetExpiresAt(*order.ExpiresAt)
	}

	m, err := builder.Save(ctx)
	if err != nil {
		return translatePersistenceError(err, nil, nil)
	}

	order.ID = m.ID
	order.CreatedAt = m.CreatedAt
	order.UpdatedAt = m.UpdatedAt
	return nil
}

func (r *paymentOrderRepository) GetByID(ctx context.Context, id int64) (*service.PaymentOrder, error) {
	m, err := r.client.PaymentOrder.Query().Where(paymentorder.IDEQ(id)).Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, service.ErrPaymentOrderNotFound
		}
		return nil, err
	}
	return paymentOrderEntityToService(m), nil
}

func (r *paymentOrderRepository) GetByIDForUpdate(ctx context.Context, id int64) (*service.PaymentOrder, error) {
	client := clientFromContext(ctx, r.client)
	m, err := client.PaymentOrder.Query().
		Where(paymentorder.IDEQ(id)).
		ForUpdate().
		Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, service.ErrPaymentOrderNotFound
		}
		return nil, err
	}
	return paymentOrderEntityToService(m), nil
}

func (r *paymentOrderRepository) GetByOrderNo(ctx context.Context, orderNo string) (*service.PaymentOrder, error) {
	m, err := r.client.PaymentOrder.Query().Where(paymentorder.OrderNoEQ(orderNo)).Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, service.ErrPaymentOrderNotFound
		}
		return nil, err
	}
	return paymentOrderEntityToService(m), nil
}

func (r *paymentOrderRepository) GetByProviderOrderID(ctx context.Context, provider string, providerOrderID string) (*service.PaymentOrder, error) {
	m, err := r.client.PaymentOrder.Query().
		Where(
			paymentorder.ProviderEQ(provider),
			paymentorder.ProviderOrderIDEQ(providerOrderID),
		).
		Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, service.ErrPaymentOrderNotFound
		}
		return nil, err
	}
	return paymentOrderEntityToService(m), nil
}

func (r *paymentOrderRepository) GetByProviderCheckoutID(ctx context.Context, provider string, checkoutID string) (*service.PaymentOrder, error) {
	m, err := r.client.PaymentOrder.Query().
		Where(
			paymentorder.ProviderEQ(provider),
			paymentorder.ProviderCheckoutIDEQ(checkoutID),
		).
		Only(ctx)
	if err != nil {
		if dbent.IsNotFound(err) {
			return nil, service.ErrPaymentOrderNotFound
		}
		return nil, err
	}
	return paymentOrderEntityToService(m), nil
}

func (r *paymentOrderRepository) Update(ctx context.Context, order *service.PaymentOrder) error {
	client := clientFromContext(ctx, r.client)
	builder := client.PaymentOrder.UpdateOneID(order.ID).
		SetProvider(order.Provider).
		SetCurrency(order.Currency).
		SetAmount(order.Amount).
		SetStatus(order.Status)

	if order.Channel != nil {
		builder.SetChannel(*order.Channel)
	} else {
		builder.ClearChannel()
	}

	if order.ProviderOrderID != nil {
		builder.SetProviderOrderID(*order.ProviderOrderID)
	} else {
		builder.ClearProviderOrderID()
	}
	if order.ProviderPaymentID != nil {
		builder.SetProviderPaymentID(*order.ProviderPaymentID)
	} else {
		builder.ClearProviderPaymentID()
	}
	if order.ProviderCheckoutID != nil {
		builder.SetProviderCheckoutID(*order.ProviderCheckoutID)
	} else {
		builder.ClearProviderCheckoutID()
	}

	if order.ProviderPayload != nil {
		builder.SetProviderPayload(order.ProviderPayload)
	}

	if order.Description != nil {
		builder.SetDescription(*order.Description)
	} else {
		builder.ClearDescription()
	}

	if order.PaidAt != nil {
		builder.SetPaidAt(*order.PaidAt)
	} else {
		builder.ClearPaidAt()
	}
	if order.ExpiresAt != nil {
		builder.SetExpiresAt(*order.ExpiresAt)
	} else {
		builder.ClearExpiresAt()
	}

	m, err := builder.Save(ctx)
	if err != nil {
		return translatePersistenceError(err, service.ErrPaymentOrderNotFound, nil)
	}

	order.UpdatedAt = m.UpdatedAt
	return nil
}

func paymentOrderEntityToService(m *dbent.PaymentOrder) *service.PaymentOrder {
	if m == nil {
		return nil
	}
	return &service.PaymentOrder{
		ID:                 m.ID,
		OrderNo:            m.OrderNo,
		UserID:             m.UserID,
		Provider:           m.Provider,
		Channel:            m.Channel,
		Currency:           m.Currency,
		Amount:             m.Amount,
		Status:             m.Status,
		ProviderOrderID:    m.ProviderOrderID,
		ProviderPaymentID:  m.ProviderPaymentID,
		ProviderCheckoutID: m.ProviderCheckoutID,
		ProviderPayload:    m.ProviderPayload,
		Description:        m.Description,
		PaidAt:             m.PaidAt,
		ExpiresAt:          m.ExpiresAt,
		CreatedAt:          m.CreatedAt,
		UpdatedAt:          m.UpdatedAt,
	}
}
