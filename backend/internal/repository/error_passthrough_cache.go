package repository

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/model"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/redis/go-redis/v9"
)

const (
	errorPassthroughCacheKey  = "error_passthrough_rules"
	errorPassthroughPubSubKey = "error_passthrough_rules_updated"
	errorPassthroughCacheTTL  = 24 * time.Hour
)

type errorPassthroughCache struct {
	rdb *redis.Client

	localCache []*model.ErrorPassthroughRule
	localMu    sync.RWMutex
}

// NewErrorPassthroughCache creates a cache for error-passthrough rules.
func NewErrorPassthroughCache(rdb *redis.Client) service.ErrorPassthroughCache {
	return &errorPassthroughCache{rdb: rdb}
}

func (c *errorPassthroughCache) Get(ctx context.Context) ([]*model.ErrorPassthroughRule, bool) {
	c.localMu.RLock()
	if c.localCache != nil {
		rules := c.localCache
		c.localMu.RUnlock()
		return rules, true
	}
	c.localMu.RUnlock()

	if c.rdb == nil {
		return nil, false
	}

	data, err := c.rdb.Get(ctx, errorPassthroughCacheKey).Bytes()
	if err != nil {
		if err != redis.Nil {
			log.Printf("[ErrorPassthroughCache] redis get failed: %v", err)
		}
		return nil, false
	}

	var rules []*model.ErrorPassthroughRule
	if err := json.Unmarshal(data, &rules); err != nil {
		log.Printf("[ErrorPassthroughCache] unmarshal failed: %v", err)
		return nil, false
	}

	c.localMu.Lock()
	c.localCache = rules
	c.localMu.Unlock()
	return rules, true
}

func (c *errorPassthroughCache) Set(ctx context.Context, rules []*model.ErrorPassthroughRule) error {
	c.localMu.Lock()
	c.localCache = rules
	c.localMu.Unlock()

	if c.rdb == nil {
		return nil
	}

	data, err := json.Marshal(rules)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, errorPassthroughCacheKey, data, errorPassthroughCacheTTL).Err()
}

func (c *errorPassthroughCache) Invalidate(ctx context.Context) error {
	c.localMu.Lock()
	c.localCache = nil
	c.localMu.Unlock()

	if c.rdb == nil {
		return nil
	}
	return c.rdb.Del(ctx, errorPassthroughCacheKey).Err()
}

func (c *errorPassthroughCache) NotifyUpdate(ctx context.Context) error {
	if c.rdb == nil {
		return nil
	}
	return c.rdb.Publish(ctx, errorPassthroughPubSubKey, "refresh").Err()
}

func (c *errorPassthroughCache) SubscribeUpdates(ctx context.Context, handler func()) {
	if c.rdb == nil {
		return
	}

	go func() {
		sub := c.rdb.Subscribe(ctx, errorPassthroughPubSubKey)
		defer func() { _ = sub.Close() }()

		ch := sub.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case msg := <-ch:
				if msg == nil {
					return
				}
				c.localMu.Lock()
				c.localCache = nil
				c.localMu.Unlock()
				handler()
			}
		}
	}()
}

var _ service.ErrorPassthroughCache = (*errorPassthroughCache)(nil)
