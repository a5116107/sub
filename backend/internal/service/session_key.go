package service

import (
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
)

// ScopeStickySessionKey scopes a user-controlled session identifier to a specific user to avoid
// cross-user collisions and "account pinning" across tenants.
//
// sessionHash is expected to already be a stable hash-ish string (often sha256 hex), but it can also be
// a short identifier extracted from request metadata.
//
// If userID <= 0 or sessionHash is empty, it returns sessionHash unchanged for backward compatibility.
func ScopeStickySessionKey(userID int64, sessionHash string) string {
	sessionHash = strings.TrimSpace(sessionHash)
	if userID <= 0 || sessionHash == "" {
		return sessionHash
	}

	var b strings.Builder
	b.Grow(len(sessionHash) + 32)
	_, _ = b.WriteString(strconv.FormatInt(userID, 10))
	_ = b.WriteByte(':')
	_, _ = b.WriteString(sessionHash)

	sum := sha256.Sum256([]byte(b.String()))
	return hex.EncodeToString(sum[:])
}
