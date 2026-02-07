package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/stretchr/testify/require"
)

type bindAccountsCall struct {
	groupID    int64
	accountIDs []int64
}

type groupRepoStubForCopyAccounts struct {
	createAssignedID int64
	created          *Group
	updated          *Group
	getByIDResult    *Group
	getByIDErr       error
	getByIDLiteMap   map[int64]*Group
	getByIDLiteErr   error

	getAccountIDsByGroupIDsCalls [][]int64
	accountIDsByGroupIDsResult   []int64
	accountIDsByGroupIDsErr      error

	deleteAccountGroupsCalls []int64
	deleteAccountGroupsErr   error

	bindAccountsCalls []bindAccountsCall
	bindAccountsErr   error
}

func (s *groupRepoStubForCopyAccounts) Create(_ context.Context, group *Group) error {
	s.created = group
	if s.createAssignedID > 0 {
		group.ID = s.createAssignedID
	}
	return nil
}

func (s *groupRepoStubForCopyAccounts) GetByID(_ context.Context, _ int64) (*Group, error) {
	if s.getByIDErr != nil {
		return nil, s.getByIDErr
	}
	return s.getByIDResult, nil
}

func (s *groupRepoStubForCopyAccounts) GetByIDLite(_ context.Context, id int64) (*Group, error) {
	if s.getByIDLiteErr != nil {
		return nil, s.getByIDLiteErr
	}
	if group, ok := s.getByIDLiteMap[id]; ok {
		return group, nil
	}
	return nil, ErrGroupNotFound
}

func (s *groupRepoStubForCopyAccounts) Update(_ context.Context, group *Group) error {
	s.updated = group
	return nil
}

func (s *groupRepoStubForCopyAccounts) Delete(_ context.Context, _ int64) error {
	panic("unexpected Delete call")
}

func (s *groupRepoStubForCopyAccounts) DeleteCascade(_ context.Context, _ int64) ([]int64, error) {
	panic("unexpected DeleteCascade call")
}

func (s *groupRepoStubForCopyAccounts) List(_ context.Context, _ pagination.PaginationParams) ([]Group, *pagination.PaginationResult, error) {
	panic("unexpected List call")
}

func (s *groupRepoStubForCopyAccounts) ListWithFilters(_ context.Context, _ pagination.PaginationParams, _, _, _ string, _ *bool) ([]Group, *pagination.PaginationResult, error) {
	panic("unexpected ListWithFilters call")
}

func (s *groupRepoStubForCopyAccounts) ListActive(_ context.Context) ([]Group, error) {
	panic("unexpected ListActive call")
}

func (s *groupRepoStubForCopyAccounts) ListActiveByPlatform(_ context.Context, _ string) ([]Group, error) {
	panic("unexpected ListActiveByPlatform call")
}

func (s *groupRepoStubForCopyAccounts) ExistsByName(_ context.Context, _ string) (bool, error) {
	panic("unexpected ExistsByName call")
}

func (s *groupRepoStubForCopyAccounts) GetAccountCount(_ context.Context, _ int64) (int64, error) {
	panic("unexpected GetAccountCount call")
}

func (s *groupRepoStubForCopyAccounts) DeleteAccountGroupsByGroupID(_ context.Context, groupID int64) (int64, error) {
	s.deleteAccountGroupsCalls = append(s.deleteAccountGroupsCalls, groupID)
	if s.deleteAccountGroupsErr != nil {
		return 0, s.deleteAccountGroupsErr
	}
	return 1, nil
}

func (s *groupRepoStubForCopyAccounts) GetAccountIDsByGroupIDs(_ context.Context, groupIDs []int64) ([]int64, error) {
	copied := append([]int64(nil), groupIDs...)
	s.getAccountIDsByGroupIDsCalls = append(s.getAccountIDsByGroupIDsCalls, copied)
	if s.accountIDsByGroupIDsErr != nil {
		return nil, s.accountIDsByGroupIDsErr
	}
	return append([]int64(nil), s.accountIDsByGroupIDsResult...), nil
}

func (s *groupRepoStubForCopyAccounts) BindAccountsToGroup(_ context.Context, groupID int64, accountIDs []int64) error {
	call := bindAccountsCall{
		groupID:    groupID,
		accountIDs: append([]int64(nil), accountIDs...),
	}
	s.bindAccountsCalls = append(s.bindAccountsCalls, call)
	return s.bindAccountsErr
}

func TestAdminService_CreateGroup_CopyAccountsFromGroups_BindsDeduplicatedSources(t *testing.T) {
	repo := &groupRepoStubForCopyAccounts{
		createAssignedID:           1001,
		getByIDLiteMap:             map[int64]*Group{11: {ID: 11, Platform: PlatformAnthropic}, 22: {ID: 22, Platform: PlatformAnthropic}},
		accountIDsByGroupIDsResult: []int64{201, 202},
	}
	svc := &adminServiceImpl{groupRepo: repo}

	group, err := svc.CreateGroup(context.Background(), &CreateGroupInput{
		Name:                     "copy-target",
		Platform:                 PlatformAnthropic,
		RateMultiplier:           1.0,
		CopyAccountsFromGroupIDs: []int64{11, 22, 11},
	})
	require.NoError(t, err)
	require.NotNil(t, group)

	require.Len(t, repo.getAccountIDsByGroupIDsCalls, 1)
	require.Equal(t, []int64{11, 22}, repo.getAccountIDsByGroupIDsCalls[0])
	require.Len(t, repo.bindAccountsCalls, 1)
	require.Equal(t, int64(1001), repo.bindAccountsCalls[0].groupID)
	require.Equal(t, []int64{201, 202}, repo.bindAccountsCalls[0].accountIDs)
	require.Equal(t, int64(2), group.AccountCount)
}

func TestAdminService_UpdateGroup_CopyAccountsFromSelfRejected(t *testing.T) {
	repo := &groupRepoStubForCopyAccounts{
		getByIDResult: &Group{
			ID:               9,
			Name:             "target",
			Platform:         PlatformAnthropic,
			Status:           StatusActive,
			RateMultiplier:   1.0,
			SubscriptionType: SubscriptionTypeStandard,
		},
	}
	svc := &adminServiceImpl{groupRepo: repo}

	_, err := svc.UpdateGroup(context.Background(), 9, &UpdateGroupInput{
		CopyAccountsFromGroupIDs: []int64{9},
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "cannot copy accounts from self")
	require.Empty(t, repo.deleteAccountGroupsCalls)
	require.Empty(t, repo.bindAccountsCalls)
}

func TestAdminService_UpdateGroup_CopyAccounts_ReplacesExistingBindings(t *testing.T) {
	repo := &groupRepoStubForCopyAccounts{
		getByIDResult: &Group{
			ID:               9,
			Name:             "target",
			Platform:         PlatformAnthropic,
			Status:           StatusActive,
			RateMultiplier:   1.0,
			SubscriptionType: SubscriptionTypeStandard,
		},
		getByIDLiteMap: map[int64]*Group{
			11: {ID: 11, Platform: PlatformAnthropic},
			22: {ID: 22, Platform: PlatformAnthropic},
		},
		accountIDsByGroupIDsResult: []int64{301, 302},
	}
	svc := &adminServiceImpl{groupRepo: repo}

	group, err := svc.UpdateGroup(context.Background(), 9, &UpdateGroupInput{
		CopyAccountsFromGroupIDs: []int64{11, 22, 11},
	})
	require.NoError(t, err)
	require.NotNil(t, group)

	require.Len(t, repo.getAccountIDsByGroupIDsCalls, 1)
	require.Equal(t, []int64{11, 22}, repo.getAccountIDsByGroupIDsCalls[0])
	require.Equal(t, []int64{9}, repo.deleteAccountGroupsCalls)
	require.Len(t, repo.bindAccountsCalls, 1)
	require.Equal(t, int64(9), repo.bindAccountsCalls[0].groupID)
	require.Equal(t, []int64{301, 302}, repo.bindAccountsCalls[0].accountIDs)
}
