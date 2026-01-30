package service

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

var inviteCodeEncoding = base32.StdEncoding.WithPadding(base32.NoPadding)

const inviteCodeMaxAttempts = 5

func GenerateInviteCode() (string, error) {
	// 6 random bytes -> 10 base32 chars (no padding). Prefix to avoid collisions with promo codes.
	bytes := make([]byte, 6)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	return "I" + strings.ToUpper(inviteCodeEncoding.EncodeToString(bytes)), nil
}

func EnsureUserInviteCode(ctx context.Context, repo UserRepository, user *User) (string, error) {
	if user == nil || repo == nil || user.ID == 0 {
		return "", errors.New("invalid arguments")
	}

	if user.InviteCode != nil && strings.TrimSpace(*user.InviteCode) != "" {
		return strings.TrimSpace(*user.InviteCode), nil
	}

	for i := 0; i < inviteCodeMaxAttempts; i++ {
		code, err := GenerateInviteCode()
		if err != nil {
			return "", err
		}

		updated, err := repo.SetInviteCodeIfEmpty(ctx, user.ID, code)
		if err != nil {
			if isUniqueViolation(err) {
				continue
			}
			return "", err
		}

		if updated {
			user.InviteCode = &code
			return code, nil
		}

		// Another writer already set it; load and return.
		fresh, err := repo.GetByID(ctx, user.ID)
		if err != nil {
			return "", err
		}
		if fresh.InviteCode != nil && strings.TrimSpace(*fresh.InviteCode) != "" {
			user.InviteCode = fresh.InviteCode
			return strings.TrimSpace(*fresh.InviteCode), nil
		}
	}

	return "", errors.New("failed to allocate invite code")
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return string(pqErr.Code) == "23505"
	}
	return false
}
