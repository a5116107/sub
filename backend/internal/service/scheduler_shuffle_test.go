package service

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestSameLastUsedAt(t *testing.T) {
	now := time.Now()
	sameSecondWithNano := time.Unix(now.Unix(), 999_999_999)
	later := now.Add(time.Second)

	require.True(t, sameLastUsedAt(nil, nil))
	require.False(t, sameLastUsedAt(nil, &now))
	require.False(t, sameLastUsedAt(&now, nil))
	require.True(t, sameLastUsedAt(&now, &sameSecondWithNano))
	require.False(t, sameLastUsedAt(&now, &later))
}

func TestShuffleWithinSortGroups_KeepGroupBoundaries(t *testing.T) {
	now := time.Now()
	sameSecond := time.Unix(now.Unix(), 0)

	accounts := []accountWithLoad{
		{account: &Account{ID: 1, Priority: 1, LastUsedAt: &now}, loadInfo: &AccountLoadInfo{LoadRate: 10}},
		{account: &Account{ID: 2, Priority: 1, LastUsedAt: &sameSecond}, loadInfo: &AccountLoadInfo{LoadRate: 10}},
		{account: &Account{ID: 3, Priority: 1, LastUsedAt: nil}, loadInfo: &AccountLoadInfo{LoadRate: 20}},
		{account: &Account{ID: 4, Priority: 2, LastUsedAt: nil}, loadInfo: &AccountLoadInfo{LoadRate: 10}},
		{account: &Account{ID: 5, Priority: 2, LastUsedAt: nil}, loadInfo: &AccountLoadInfo{LoadRate: 10}},
	}

	shuffleWithinSortGroups(accounts)

	firstGroup := []int64{accounts[0].account.ID, accounts[1].account.ID}
	require.ElementsMatch(t, []int64{1, 2}, firstGroup)
	require.Equal(t, int64(3), accounts[2].account.ID)
	lastGroup := []int64{accounts[3].account.ID, accounts[4].account.ID}
	require.ElementsMatch(t, []int64{4, 5}, lastGroup)
}

func TestSameAccountWithLoadGroup(t *testing.T) {
	now := time.Now()
	sameSecond := time.Unix(now.Unix(), 123)

	a := accountWithLoad{
		account:  &Account{Priority: 1, LastUsedAt: &now},
		loadInfo: &AccountLoadInfo{LoadRate: 10},
	}
	b := accountWithLoad{
		account:  &Account{Priority: 1, LastUsedAt: &sameSecond},
		loadInfo: &AccountLoadInfo{LoadRate: 10},
	}
	require.True(t, sameAccountWithLoadGroup(a, b))

	b.loadInfo.LoadRate = 20
	require.False(t, sameAccountWithLoadGroup(a, b))
}
