package service

import "context"

// UserGroupRateRepository provides user-specific group rate multiplier overrides.
//
// These rates override group default rate_multiplier during billing calculation.
type UserGroupRateRepository interface {
	// GetUserGroupRates returns all user-specific group multipliers.
	// Key is group_id, value is rate_multiplier.
	GetUserGroupRates(ctx context.Context, userID int64) (map[int64]float64, error)

	// GetUserGroupRate returns user's specific multiplier for one group.
	// Returns nil when no override exists.
	GetUserGroupRate(ctx context.Context, userID, groupID int64) (*float64, error)

	// SyncUserGroupRates updates user-specific multipliers by group.
	// map value nil means delete override for that group.
	// Empty map means delete all overrides for this user.
	SyncUserGroupRates(ctx context.Context, userID int64, rates map[int64]*float64) error
}

func resolveUserGroupRateRepository(userRepo UserRepository) UserGroupRateRepository {
	if userRepo == nil {
		return nil
	}
	repo, ok := userRepo.(UserGroupRateRepository)
	if !ok {
		return nil
	}
	return repo
}
