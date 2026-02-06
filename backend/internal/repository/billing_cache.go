package repository

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/redis/go-redis/v9"
)

const (
	billingBalanceKeyPrefix = "billing:balance:"
	billingSubKeyPrefix     = "billing:sub:"
	billingCacheTTL         = 5 * time.Minute
)

// billingBalanceKey generates the Redis key for user balance cache.
func billingBalanceKey(userID int64) string {
	return fmt.Sprintf("%s%d", billingBalanceKeyPrefix, userID)
}

// billingSubKey generates the Redis key for subscription cache.
func billingSubKey(userID, groupID int64) string {
	return fmt.Sprintf("%s%d:%d", billingSubKeyPrefix, userID, groupID)
}

const (
	subFieldStatus        = "status"
	subFieldExpiresAt     = "expires_at"
	subFieldDailyUsage    = "daily_usage"
	subFieldWeeklyUsage   = "weekly_usage"
	subFieldMonthlyUsage  = "monthly_usage"
	subFieldReservedUsage = "reserved_usage"
	subFieldVersion       = "version"
)

var (
	deductBalanceScript = redis.NewScript(`
		local current = redis.call('GET', KEYS[1])
		if current == false then
			return 0
		end
		local newVal = tonumber(current) - tonumber(ARGV[1])
		redis.call('SET', KEYS[1], newVal)
		redis.call('EXPIRE', KEYS[1], ARGV[2])
		return 1
	`)

	updateSubUsageScript = redis.NewScript(`
		local exists = redis.call('EXISTS', KEYS[1])
		if exists == 0 then
			return 0
		end
		local cost = tonumber(ARGV[1])
		redis.call('HINCRBYFLOAT', KEYS[1], 'daily_usage', cost)
		redis.call('HINCRBYFLOAT', KEYS[1], 'weekly_usage', cost)
		redis.call('HINCRBYFLOAT', KEYS[1], 'monthly_usage', cost)
		redis.call('EXPIRE', KEYS[1], ARGV[2])
		return 1
	`)

	reserveSubUsageScript = redis.NewScript(`
		local exists = redis.call('EXISTS', KEYS[1])
		if exists == 0 then
			return 0
		end

		local reserve = tonumber(ARGV[1])
		if reserve == nil or reserve <= 0 then
			return 0
		end

		local ttl = tonumber(ARGV[2])
		local dailyLimit = tonumber(ARGV[3])
		local weeklyLimit = tonumber(ARGV[4])
		local monthlyLimit = tonumber(ARGV[5])

		local dailyUsage = tonumber(redis.call('HGET', KEYS[1], 'daily_usage') or '0')
		local weeklyUsage = tonumber(redis.call('HGET', KEYS[1], 'weekly_usage') or '0')
		local monthlyUsage = tonumber(redis.call('HGET', KEYS[1], 'monthly_usage') or '0')
		local reserved = tonumber(redis.call('HGET', KEYS[1], 'reserved_usage') or '0')

		if dailyLimit ~= nil and dailyLimit >= 0 and (dailyUsage + reserved + reserve) > dailyLimit then
			return -1
		end
		if weeklyLimit ~= nil and weeklyLimit >= 0 and (weeklyUsage + reserved + reserve) > weeklyLimit then
			return -2
		end
		if monthlyLimit ~= nil and monthlyLimit >= 0 and (monthlyUsage + reserved + reserve) > monthlyLimit then
			return -3
		end

		redis.call('HINCRBYFLOAT', KEYS[1], 'reserved_usage', reserve)
		redis.call('EXPIRE', KEYS[1], ttl)
		return 1
	`)

	finalizeSubUsageScript = redis.NewScript(`
		local exists = redis.call('EXISTS', KEYS[1])
		if exists == 0 then
			return 0
		end

		local reservedDelta = tonumber(ARGV[1])
		local actual = tonumber(ARGV[2])
		local ttl = tonumber(ARGV[3])

		if reservedDelta ~= nil and reservedDelta > 0 then
			local reserved = tonumber(redis.call('HGET', KEYS[1], 'reserved_usage') or '0')
			local newReserved = reserved - reservedDelta
			if newReserved < 0 then
				newReserved = 0
			end
			redis.call('HSET', KEYS[1], 'reserved_usage', newReserved)
		end

		if actual ~= nil and actual > 0 then
			redis.call('HINCRBYFLOAT', KEYS[1], 'daily_usage', actual)
			redis.call('HINCRBYFLOAT', KEYS[1], 'weekly_usage', actual)
			redis.call('HINCRBYFLOAT', KEYS[1], 'monthly_usage', actual)
		end

		redis.call('EXPIRE', KEYS[1], ttl)
		return 1
	`)

	reserveSubUsageByKeyScript = redis.NewScript(`
		local base = KEYS[1]
		local rkey = KEYS[2]

		local exists = redis.call('EXISTS', base)
		if exists == 0 then
			return 0
		end

		local reserve = tonumber(ARGV[1])
		if reserve == nil or reserve <= 0 then
			return 0
		end

		local ttl = tonumber(ARGV[2])
		local dailyLimit = tonumber(ARGV[3])
		local weeklyLimit = tonumber(ARGV[4])
		local monthlyLimit = tonumber(ARGV[5])

		local dailyUsage = tonumber(redis.call('HGET', base, 'daily_usage') or '0')
		local weeklyUsage = tonumber(redis.call('HGET', base, 'weekly_usage') or '0')
		local monthlyUsage = tonumber(redis.call('HGET', base, 'monthly_usage') or '0')

		local reservedTotal = tonumber(redis.call('HGET', base, 'reserved_usage') or '0')
		local already = tonumber(redis.call('GET', rkey) or '0')
		if already ~= nil and already > 0 then
			-- idempotent: already reserved under this key
			redis.call('EXPIRE', rkey, ttl)
			redis.call('EXPIRE', base, ttl)
			return 2
		end

		if dailyLimit ~= nil and dailyLimit >= 0 and (dailyUsage + reservedTotal + reserve) > dailyLimit then
			return -1
		end
		if weeklyLimit ~= nil and weeklyLimit >= 0 and (weeklyUsage + reservedTotal + reserve) > weeklyLimit then
			return -2
		end
		if monthlyLimit ~= nil and monthlyLimit >= 0 and (monthlyUsage + reservedTotal + reserve) > monthlyLimit then
			return -3
		end

		redis.call('SET', rkey, reserve, 'EX', ttl)
		redis.call('HINCRBYFLOAT', base, 'reserved_usage', reserve)
		redis.call('EXPIRE', base, ttl)
		return 1
	`)

	finalizeSubUsageByKeyScript = redis.NewScript(`
		local base = KEYS[1]
		local rkey = KEYS[2]

		local exists = redis.call('EXISTS', base)
		if exists == 0 then
			return 0
		end

		local ttl = tonumber(ARGV[3])
		local reservedDelta = tonumber(ARGV[1])
		local actual = tonumber(ARGV[2])

		local held = tonumber(redis.call('GET', rkey) or '0')
		if held == nil or held <= 0 then
			-- already finalized or never reserved under this key
			redis.call('EXPIRE', base, ttl)
			return 2
		end

		-- Do not allow releasing more than held
		local release = held
		if reservedDelta ~= nil and reservedDelta > 0 and reservedDelta < held then
			release = reservedDelta
		end

		local reservedTotal = tonumber(redis.call('HGET', base, 'reserved_usage') or '0')
		local newReserved = reservedTotal - release
		if newReserved < 0 then
			newReserved = 0
		end
		redis.call('HSET', base, 'reserved_usage', newReserved)

		if actual ~= nil and actual > 0 then
			redis.call('HINCRBYFLOAT', base, 'daily_usage', actual)
			redis.call('HINCRBYFLOAT', base, 'weekly_usage', actual)
			redis.call('HINCRBYFLOAT', base, 'monthly_usage', actual)
		end

		redis.call('DEL', rkey)
		redis.call('EXPIRE', base, ttl)
		return 1
	`)
)

type billingCache struct {
	rdb *redis.Client
}

func NewBillingCache(rdb *redis.Client) service.BillingCache {
	return &billingCache{rdb: rdb}
}

func (c *billingCache) GetUserBalance(ctx context.Context, userID int64) (float64, error) {
	key := billingBalanceKey(userID)
	val, err := c.rdb.Get(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	return strconv.ParseFloat(val, 64)
}

func (c *billingCache) SetUserBalance(ctx context.Context, userID int64, balance float64) error {
	key := billingBalanceKey(userID)
	return c.rdb.Set(ctx, key, balance, billingCacheTTL).Err()
}

func (c *billingCache) DeductUserBalance(ctx context.Context, userID int64, amount float64) error {
	key := billingBalanceKey(userID)
	_, err := deductBalanceScript.Run(ctx, c.rdb, []string{key}, amount, int(billingCacheTTL.Seconds())).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		log.Printf("Warning: deduct balance cache failed for user %d: %v", userID, err)
	}
	return nil
}

func (c *billingCache) InvalidateUserBalance(ctx context.Context, userID int64) error {
	key := billingBalanceKey(userID)
	return c.rdb.Del(ctx, key).Err()
}

func (c *billingCache) GetSubscriptionCache(ctx context.Context, userID, groupID int64) (*service.SubscriptionCacheData, error) {
	key := billingSubKey(userID, groupID)
	result, err := c.rdb.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	if len(result) == 0 {
		return nil, redis.Nil
	}
	return c.parseSubscriptionCache(result)
}

func (c *billingCache) parseSubscriptionCache(data map[string]string) (*service.SubscriptionCacheData, error) {
	result := &service.SubscriptionCacheData{}

	result.Status = data[subFieldStatus]
	if result.Status == "" {
		return nil, errors.New("invalid cache: missing status")
	}

	if expiresStr, ok := data[subFieldExpiresAt]; ok {
		expiresAt, err := strconv.ParseInt(expiresStr, 10, 64)
		if err == nil {
			result.ExpiresAt = time.Unix(expiresAt, 0)
		}
	}

	if dailyStr, ok := data[subFieldDailyUsage]; ok {
		result.DailyUsage, _ = strconv.ParseFloat(dailyStr, 64)
	}

	if weeklyStr, ok := data[subFieldWeeklyUsage]; ok {
		result.WeeklyUsage, _ = strconv.ParseFloat(weeklyStr, 64)
	}

	if monthlyStr, ok := data[subFieldMonthlyUsage]; ok {
		result.MonthlyUsage, _ = strconv.ParseFloat(monthlyStr, 64)
	}

	if reservedStr, ok := data[subFieldReservedUsage]; ok {
		result.ReservedUsage, _ = strconv.ParseFloat(reservedStr, 64)
	}

	if versionStr, ok := data[subFieldVersion]; ok {
		result.Version, _ = strconv.ParseInt(versionStr, 10, 64)
	}

	return result, nil
}

func (c *billingCache) SetSubscriptionCache(ctx context.Context, userID, groupID int64, data *service.SubscriptionCacheData) error {
	if data == nil {
		return nil
	}

	key := billingSubKey(userID, groupID)

	fields := map[string]any{
		subFieldStatus:       data.Status,
		subFieldExpiresAt:    data.ExpiresAt.Unix(),
		subFieldDailyUsage:   data.DailyUsage,
		subFieldWeeklyUsage:  data.WeeklyUsage,
		subFieldMonthlyUsage: data.MonthlyUsage,
		subFieldVersion:      data.Version,
	}
	if data.ReservedUsage != 0 {
		fields[subFieldReservedUsage] = data.ReservedUsage
	}

	pipe := c.rdb.Pipeline()
	pipe.HSet(ctx, key, fields)
	pipe.Expire(ctx, key, billingCacheTTL)
	_, err := pipe.Exec(ctx)
	return err
}

func (c *billingCache) UpdateSubscriptionUsage(ctx context.Context, userID, groupID int64, cost float64) error {
	key := billingSubKey(userID, groupID)
	_, err := updateSubUsageScript.Run(ctx, c.rdb, []string{key}, cost, int(billingCacheTTL.Seconds())).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		log.Printf("Warning: update subscription usage cache failed for user %d group %d: %v", userID, groupID, err)
	}
	return nil
}

func (c *billingCache) ReserveSubscriptionUsage(ctx context.Context, userID, groupID int64, reserveUSD float64, dailyLimitUSD, weeklyLimitUSD, monthlyLimitUSD *float64) (int, error) {
	key := billingSubKey(userID, groupID)

	limitArg := func(v *float64) float64 {
		if v == nil || *v <= 0 {
			return -1
		}
		return *v
	}

	// Return codes:
	//  1  ok
	//  0  key missing (caller should refresh cache)
	// -1  daily exceeded
	// -2  weekly exceeded
	// -3  monthly exceeded
	res, err := reserveSubUsageScript.Run(
		ctx,
		c.rdb,
		[]string{key},
		reserveUSD,
		int(billingCacheTTL.Seconds()),
		limitArg(dailyLimitUSD),
		limitArg(weeklyLimitUSD),
		limitArg(monthlyLimitUSD),
	).Int()
	if err != nil && !errors.Is(err, redis.Nil) {
		log.Printf("Warning: reserve subscription usage cache failed for user %d group %d: %v", userID, groupID, err)
		return 0, err
	}
	return res, nil
}

func (c *billingCache) FinalizeSubscriptionUsage(ctx context.Context, userID, groupID int64, reservedUSD, actualUSD float64) error {
	key := billingSubKey(userID, groupID)
	_, err := finalizeSubUsageScript.Run(ctx, c.rdb, []string{key}, reservedUSD, actualUSD, int(billingCacheTTL.Seconds())).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		log.Printf("Warning: finalize subscription usage cache failed for user %d group %d: %v", userID, groupID, err)
		return err
	}
	return nil
}

func (c *billingCache) ReserveSubscriptionUsageByKey(ctx context.Context, userID, groupID int64, key string, reserveUSD float64, dailyLimitUSD, weeklyLimitUSD, monthlyLimitUSD *float64) (int, error) {
	base := billingSubKey(userID, groupID)
	rkey := fmt.Sprintf("%sres:%s", base+":", strings.TrimSpace(key))

	limitArg := func(v *float64) float64 {
		if v == nil || *v <= 0 {
			return -1
		}
		return *v
	}

	res, err := reserveSubUsageByKeyScript.Run(
		ctx,
		c.rdb,
		[]string{base, rkey},
		reserveUSD,
		int(billingCacheTTL.Seconds()),
		limitArg(dailyLimitUSD),
		limitArg(weeklyLimitUSD),
		limitArg(monthlyLimitUSD),
	).Int()
	if err != nil && !errors.Is(err, redis.Nil) {
		log.Printf("Warning: reserve subscription usage by key failed for user %d group %d: %v", userID, groupID, err)
		return 0, err
	}
	return res, nil
}

func (c *billingCache) FinalizeSubscriptionUsageByKey(ctx context.Context, userID, groupID int64, key string, reservedUSD, actualUSD float64) error {
	base := billingSubKey(userID, groupID)
	rkey := fmt.Sprintf("%sres:%s", base+":", strings.TrimSpace(key))
	_, err := finalizeSubUsageByKeyScript.Run(ctx, c.rdb, []string{base, rkey}, reservedUSD, actualUSD, int(billingCacheTTL.Seconds())).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		log.Printf("Warning: finalize subscription usage by key failed for user %d group %d: %v", userID, groupID, err)
		return err
	}
	return nil
}

func (c *billingCache) InvalidateSubscriptionCache(ctx context.Context, userID, groupID int64) error {
	key := billingSubKey(userID, groupID)
	return c.rdb.Del(ctx, key).Err()
}
