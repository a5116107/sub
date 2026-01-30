package service

import "time"

const (
	PaymentProviderCreem  = "creem"
	PaymentProviderPayPal = "paypal"
	PaymentProviderEPay   = "epay"
)

const (
	PaymentStatusPending  = "pending"
	PaymentStatusPaid     = "paid"
	PaymentStatusFailed   = "failed"
	PaymentStatusCanceled = "canceled"
	PaymentStatusExpired  = "expired"
)

type PaymentOrder struct {
	ID int64

	OrderNo string
	UserID  int64

	Provider string
	Channel  *string

	Currency string
	Amount   float64
	Status   string

	ProviderOrderID    *string
	ProviderPaymentID  *string
	ProviderCheckoutID *string
	ProviderPayload    map[string]any

	Description *string

	PaidAt    *time.Time
	ExpiresAt *time.Time

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (o *PaymentOrder) IsPending() bool { return o != nil && o.Status == PaymentStatusPending }
func (o *PaymentOrder) IsPaid() bool    { return o != nil && o.Status == PaymentStatusPaid }
