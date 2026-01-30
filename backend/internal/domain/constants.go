package domain

// NOTE: This package intentionally contains only pure constants and must not
// depend on the generated Ent code. It is safe to import from Ent schemas.

// Status constants.
const (
	StatusActive   = "active"
	StatusDisabled = "disabled"
	StatusError    = "error"
	StatusUnused   = "unused"
	StatusUsed     = "used"
	StatusExpired  = "expired"
)

// Role constants.
const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)

// Platform constants.
const (
	PlatformAnthropic   = "anthropic"
	PlatformOpenAI      = "openai"
	PlatformGemini      = "gemini"
	PlatformQwen        = "qwen"
	PlatformIFlow       = "iflow"
	PlatformAntigravity = "antigravity"
)

// Redeem type constants.
const (
	RedeemTypeBalance      = "balance"
	RedeemTypeConcurrency  = "concurrency"
	RedeemTypeSubscription = "subscription"
)

// PromoCode status constants.
const (
	PromoCodeStatusActive   = "active"
	PromoCodeStatusDisabled = "disabled"
)

// Group subscription type constants.
const (
	SubscriptionTypeStandard     = "standard"
	SubscriptionTypeSubscription = "subscription"
)

// Subscription status constants.
const (
	SubscriptionStatusActive    = "active"
	SubscriptionStatusExpired   = "expired"
	SubscriptionStatusSuspended = "suspended"
)
