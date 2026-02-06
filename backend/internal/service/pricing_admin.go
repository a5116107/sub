package service

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

type PricingAdminStatus struct {
	ModelCount      int       `json:"model_count"`
	LastUpdated     time.Time `json:"last_updated"`
	LocalHash       string    `json:"local_hash"`
	OverrideEnabled bool      `json:"override_enabled"`

	// Config snapshot (read-only; configured via server config/env)
	RemoteURL string `json:"remote_url,omitempty"`
	HashURL   string `json:"hash_url,omitempty"`
	DataDir   string `json:"data_dir,omitempty"`
}

func (s *PricingService) GetAdminStatus() (PricingAdminStatus, error) {
	if s == nil || s.cfg == nil {
		return PricingAdminStatus{}, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable")
	}

	s.mu.RLock()
	modelCount := len(s.pricingData)
	lastUpdated := s.lastUpdated
	localHash := s.localHash
	s.mu.RUnlock()

	return PricingAdminStatus{
		ModelCount:      modelCount,
		LastUpdated:     lastUpdated,
		LocalHash:       shortHash(localHash),
		OverrideEnabled: s.IsOverrideEnabled(),
		RemoteURL:       strings.TrimSpace(s.cfg.Pricing.RemoteURL),
		HashURL:         strings.TrimSpace(s.cfg.Pricing.HashURL),
		DataDir:         strings.TrimSpace(s.cfg.Pricing.DataDir),
	}, nil
}

func shortHash(h string) string {
	h = strings.TrimSpace(h)
	if h == "" {
		return ""
	}
	if len(h) <= 8 {
		return h
	}
	return h[:8]
}

func (s *PricingService) getOverrideMarkerPath() string {
	return filepath.Join(s.cfg.Pricing.DataDir, "model_pricing.override")
}

// IsOverrideEnabled indicates whether remote pricing sync is disabled and local pricing is pinned.
func (s *PricingService) IsOverrideEnabled() bool {
	if s == nil || s.cfg == nil {
		return false
	}
	_, err := os.Stat(s.getOverrideMarkerPath())
	return err == nil
}

func (s *PricingService) SetOverrideEnabled(enabled bool) error {
	if s == nil || s.cfg == nil {
		return infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable")
	}
	path := s.getOverrideMarkerPath()
	if enabled {
		if err := os.MkdirAll(s.cfg.Pricing.DataDir, 0755); err != nil {
			return infraerrors.InternalServer("PRICING_OVERRIDE_FAILED", "failed to enable pricing override").WithCause(err)
		}
		if err := os.WriteFile(path, []byte(time.Now().UTC().Format(time.RFC3339)+"\n"), 0644); err != nil {
			return infraerrors.InternalServer("PRICING_OVERRIDE_FAILED", "failed to enable pricing override").WithCause(err)
		}
		return nil
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return infraerrors.InternalServer("PRICING_OVERRIDE_FAILED", "failed to disable pricing override").WithCause(err)
	}
	return nil
}

func (s *PricingService) ExportPricingJSON() ([]byte, error) {
	if s == nil || s.cfg == nil {
		return nil, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable")
	}
	data, err := os.ReadFile(s.getPricingFilePath())
	if err != nil {
		if os.IsNotExist(err) {
			return nil, infraerrors.NotFound("PRICING_FILE_NOT_FOUND", "pricing file not found").WithCause(err)
		}
		return nil, infraerrors.InternalServer("PRICING_EXPORT_FAILED", "failed to read pricing file").WithCause(err)
	}
	return data, nil
}

func (s *PricingService) ImportPricingJSON(body []byte, overrideEnabled bool) (PricingAdminStatus, error) {
	if s == nil || s.cfg == nil {
		return PricingAdminStatus{}, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable")
	}
	body = []byte(strings.TrimSpace(string(body)))
	if len(body) == 0 {
		return PricingAdminStatus{}, infraerrors.BadRequest("PRICING_INVALID", "pricing file is empty")
	}

	data, err := s.parsePricingData(body)
	if err != nil {
		return PricingAdminStatus{}, infraerrors.BadRequest("PRICING_INVALID", "invalid pricing JSON").WithCause(err)
	}

	if err := os.MkdirAll(s.cfg.Pricing.DataDir, 0755); err != nil {
		return PricingAdminStatus{}, infraerrors.InternalServer("PRICING_IMPORT_FAILED", "failed to prepare pricing storage").WithCause(err)
	}

	if err := os.WriteFile(s.getPricingFilePath(), body, 0644); err != nil {
		return PricingAdminStatus{}, infraerrors.InternalServer("PRICING_IMPORT_FAILED", "failed to save pricing file").WithCause(err)
	}

	hash := sha256.Sum256(body)
	hashStr := hex.EncodeToString(hash[:])
	_ = os.WriteFile(s.getHashFilePath(), []byte(hashStr+"\n"), 0644)

	s.mu.Lock()
	s.pricingData = data
	s.lastUpdated = time.Now()
	s.localHash = hashStr
	s.mu.Unlock()

	if err := s.SetOverrideEnabled(overrideEnabled); err != nil {
		return PricingAdminStatus{}, err
	}

	return s.GetAdminStatus()
}

func (s *PricingService) SyncFromRemote(disableOverride bool) (PricingAdminStatus, error) {
	if s == nil || s.cfg == nil {
		return PricingAdminStatus{}, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable")
	}
	if disableOverride {
		if err := s.SetOverrideEnabled(false); err != nil {
			return PricingAdminStatus{}, err
		}
	}
	if err := s.downloadPricingData(); err != nil {
		return PricingAdminStatus{}, infraerrors.InternalServer("PRICING_SYNC_FAILED", "failed to sync pricing from remote").WithCause(err)
	}
	return s.GetAdminStatus()
}

