package service

import infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"

var (
	ErrPaymentDisabled         = infraerrors.ServiceUnavailable("PAYMENT_DISABLED", "payment is disabled")
	ErrPaymentProviderInvalid  = infraerrors.BadRequest("PAYMENT_PROVIDER_INVALID", "invalid payment provider")
	ErrPaymentProviderDisabled = infraerrors.BadRequest("PAYMENT_PROVIDER_DISABLED", "payment provider is disabled")
	ErrPaymentOrderNotFound    = infraerrors.NotFound("PAYMENT_ORDER_NOT_FOUND", "payment order not found")
	ErrPaymentOrderForbidden   = infraerrors.Forbidden("PAYMENT_ORDER_FORBIDDEN", "no permission to access this payment order")
	ErrPaymentInvalidAmount    = infraerrors.BadRequest("PAYMENT_INVALID_AMOUNT", "invalid payment amount")
	ErrPaymentWebhookInvalid   = infraerrors.BadRequest("PAYMENT_WEBHOOK_INVALID", "invalid payment webhook")
)
