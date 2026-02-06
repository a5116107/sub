package payloadrules

import (
	"log"
	"sync/atomic"
	"time"
)

// StatsCollector provides throttled, privacy-safe counters for payload rule usage.
// It is intentionally separate from the Engine to keep the mutation logic pure.
type StatsCollector struct {
	interval time.Duration

	totalRequests    atomic.Int64
	matchedRules     atomic.Int64
	appliedDefaults  atomic.Int64
	appliedOverrides atomic.Int64
	changedRequests  atomic.Int64

	lastLogUnix atomic.Int64
}

func NewStatsCollector(interval time.Duration) *StatsCollector {
	if interval <= 0 {
		interval = time.Minute
	}
	return &StatsCollector{interval: interval}
}

func (s *StatsCollector) Record(stats ApplyStats) {
	if s == nil {
		return
	}
	s.totalRequests.Add(1)
	if stats.MatchedRules > 0 {
		s.matchedRules.Add(int64(stats.MatchedRules))
	}
	if stats.AppliedDefaults > 0 {
		s.appliedDefaults.Add(int64(stats.AppliedDefaults))
	}
	if stats.AppliedOverrides > 0 {
		s.appliedOverrides.Add(int64(stats.AppliedOverrides))
	}
	if stats.Changed {
		s.changedRequests.Add(1)
	}
	s.maybeLog()
}

func (s *StatsCollector) maybeLog() {
	if s == nil {
		return
	}
	now := time.Now()
	nowUnix := now.Unix()
	last := s.lastLogUnix.Load()
	if last != 0 && nowUnix-last < int64(s.interval.Seconds()) {
		return
	}
	if !s.lastLogUnix.CompareAndSwap(last, nowUnix) {
		return
	}

	log.Printf(
		"[PayloadRules] totals: requests=%d changed=%d matched_rules=%d applied_default=%d applied_override=%d",
		s.totalRequests.Load(),
		s.changedRequests.Load(),
		s.matchedRules.Load(),
		s.appliedDefaults.Load(),
		s.appliedOverrides.Load(),
	)
}
