package service

import "time"

type APIKey struct {
	ID                 int64
	UserID             int64
	Key                string
	Name               string
	GroupID            *int64
	Status             string
	IPWhitelist        []string
	IPBlacklist        []string
	AllowBalance       bool
	AllowSubscription  bool
	SubscriptionStrict bool
	ExpiresAt          *time.Time
	QuotaLimitUSD      *float64
	QuotaUsedUSD       float64
	CreatedAt          time.Time
	UpdatedAt          time.Time
	User               *User
	Group              *Group
}

func (k *APIKey) IsActive() bool {
	return k.Status == StatusActive
}
