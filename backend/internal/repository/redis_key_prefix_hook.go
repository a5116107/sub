package repository

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	redisclient "github.com/redis/go-redis/v9"
)

type keyPrefixHook struct {
	prefix string
}

func (h keyPrefixHook) DialHook(next redisclient.DialHook) redisclient.DialHook { return next }

func (h keyPrefixHook) ProcessHook(next redisclient.ProcessHook) redisclient.ProcessHook {
	return func(ctx context.Context, cmd redisclient.Cmder) error {
		h.prefixCmd(cmd)
		return next(ctx, cmd)
	}
}

func (h keyPrefixHook) ProcessPipelineHook(next redisclient.ProcessPipelineHook) redisclient.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redisclient.Cmder) error {
		for _, cmd := range cmds {
			h.prefixCmd(cmd)
		}
		return next(ctx, cmds)
	}
}

func (h keyPrefixHook) prefixCmd(cmd redisclient.Cmder) {
	if h.prefix == "" {
		return
	}

	args := cmd.Args()
	if len(args) < 2 {
		return
	}

	prefixOne := func(i int) {
		if i < 0 || i >= len(args) {
			return
		}

		switch v := args[i].(type) {
		case string:
			if v != "" && !strings.HasPrefix(v, h.prefix) {
				args[i] = h.prefix + v
			}
		case []byte:
			s := string(v)
			if s != "" && !strings.HasPrefix(s, h.prefix) {
				args[i] = []byte(h.prefix + s)
			}
		}
	}

	switch strings.ToLower(cmd.Name()) {
	case "get", "getdel", "set", "setnx", "setex", "psetex",
		"incr", "decr", "incrby", "decrby", "incrbyfloat",
		"expire", "pexpire", "expireat", "pexpireat", "ttl", "pttl",
		"hgetall", "hget", "hset", "hdel", "hincrby", "hincrbyfloat", "hexists",
		"zadd", "zcard", "zrange", "zrangebyscore", "zrem", "zremrangebyscore", "zrevrange", "zrevrangebyscore", "zscore",
		"sadd", "srem", "smembers", "scard":
		prefixOne(1)
	case "exists", "del", "unlink", "touch":
		for i := 1; i < len(args); i++ {
			prefixOne(i)
		}
	case "mget":
		for i := 1; i < len(args); i++ {
			prefixOne(i)
		}
	case "mset", "msetnx":
		for i := 1; i < len(args); i += 2 {
			prefixOne(i)
		}
	case "rename", "renamenx":
		prefixOne(1)
		prefixOne(2)
	case "eval", "evalsha", "eval_ro", "evalsha_ro":
		if len(args) < 3 {
			return
		}
		numKeys, err := strconv.Atoi(fmt.Sprint(args[2]))
		if err != nil || numKeys <= 0 {
			return
		}
		for i := 0; i < numKeys && 3+i < len(args); i++ {
			prefixOne(3 + i)
		}
	case "scan":
		for i := 2; i+1 < len(args); i++ {
			if strings.EqualFold(fmt.Sprint(args[i]), "match") {
				prefixOne(i + 1)
				break
			}
		}
	case "publish":
		prefixOne(1)
	case "subscribe", "psubscribe", "unsubscribe", "punsubscribe":
		for i := 1; i < len(args); i++ {
			prefixOne(i)
		}
	}
}
