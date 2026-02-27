package service

import (
	cryptorand "crypto/rand"
	"math/big"
	"time"
)

func boundedExponentialBackoff(base, max time.Duration, attempt int) time.Duration {
	if attempt <= 0 || base <= 0 || max <= 0 {
		return 0
	}
	if base >= max {
		return max
	}

	delay := base
	for i := 1; i < attempt; i++ {
		if delay >= max {
			return max
		}
		if delay > max/2 {
			return max
		}
		delay *= 2
	}
	if delay > max {
		return max
	}
	return delay
}

func cryptoRandIntN(n int) int {
	if n <= 1 {
		return 0
	}
	max := big.NewInt(int64(n))
	v, err := cryptorand.Int(cryptorand.Reader, max)
	if err != nil {
		return 0
	}
	return int(v.Int64())
}

func cryptoRandUnitFloat64() float64 {
	const scale = int64(1_000_000)
	v, err := cryptorand.Int(cryptorand.Reader, big.NewInt(scale))
	if err != nil {
		return 0.5
	}
	return float64(v.Int64()) / float64(scale-1)
}
