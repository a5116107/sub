package service

import (
	"bytes"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestReadAllWithLimit_OK(t *testing.T) {
	b, err := readAllWithLimit(bytes.NewReader([]byte("abc")), 10)
	require.NoError(t, err)
	require.Equal(t, []byte("abc"), b)
}

func TestReadAllWithLimit_TooLarge(t *testing.T) {
	_, err := readAllWithLimit(bytes.NewReader(bytes.Repeat([]byte("x"), 11)), 10)
	require.Error(t, err)
	require.Contains(t, err.Error(), "too large")
}

func TestReadAllWithLimit_InvalidMaxBytes(t *testing.T) {
	_, err := readAllWithLimit(bytes.NewReader(nil), 0)
	require.Error(t, err)
}
