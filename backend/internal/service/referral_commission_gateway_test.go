package service

import "testing"

func TestNormalizeReferralCommissionRate(t *testing.T) {
	t.Parallel()

	tests := []struct {
		raw  string
		want float64
	}{
		{"", 0},
		{"   ", 0},
		{"abc", 0},
		{"-0.1", 0},
		{"0", 0},
		{"0.25", 0.25},
		{"1", 1},
		{"1.5", 1},
		{" 0.5 ", 0.5},
	}

	for _, tt := range tests {
		got := normalizeReferralCommissionRate(tt.raw)
		if got != tt.want {
			t.Fatalf("normalizeReferralCommissionRate(%q)=%v, want %v", tt.raw, got, tt.want)
		}
	}
}
