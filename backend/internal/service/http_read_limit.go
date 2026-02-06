package service

import (
	"fmt"
	"io"
)

const (
	maxUpstreamNonStreamingBodyBytes int64 = 32 << 20 // 32 MiB
	maxCountTokensBodyBytes          int64 = 2 << 20  // 2 MiB
)

func readAllWithLimit(r io.Reader, maxBytes int64) ([]byte, error) {
	if maxBytes <= 0 {
		return nil, fmt.Errorf("invalid maxBytes: %d", maxBytes)
	}

	b, err := io.ReadAll(io.LimitReader(r, maxBytes+1))
	if err != nil {
		return nil, err
	}
	if int64(len(b)) > maxBytes {
		return nil, fmt.Errorf("response body too large (max %d bytes)", maxBytes)
	}
	return b, nil
}
