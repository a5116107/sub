//go:build integration

package repository

import (
	"context"
	"testing"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/suite"
)

type APIKeyRepoSuite struct {
	suite.Suite
	ctx    context.Context
	client *dbent.Client
	repo   *apiKeyRepository
}

func (s *APIKeyRepoSuite) SetupTest() {
	s.ctx = context.Background()
	tx := testEntTx(s.T())
	s.client = tx.Client()
	s.repo = NewAPIKeyRepository(s.client).(*apiKeyRepository)
}

func TestAPIKeyRepoSuite(t *testing.T) {
	suite.Run(t, new(APIKeyRepoSuite))
}

// --- Create / GetByID / GetByKey ---

func (s *APIKeyRepoSuite) TestCreate() {
	user := s.mustCreateUser("create@test.com")
	group := s.mustCreateGroup("g-create")

	key := &service.APIKey{
		UserID:            user.ID,
		Key:               "sk-create-test",
		Name:              "Test Key",
		GroupID:           &group.ID,
		Status:            service.StatusActive,
		AllowBalance:      true,
		AllowSubscription: true,
	}

	err := s.repo.Create(s.ctx, key)
	s.Require().NoError(err, "Create")
	s.Require().NotZero(key.ID, "expected ID to be set")

	got, err := s.repo.GetByID(s.ctx, key.ID)
	s.Require().NoError(err, "GetByID")
	s.Require().Equal("sk-create-test", got.Key)
}

func (s *APIKeyRepoSuite) TestGetByID_NotFound() {
	_, err := s.repo.GetByID(s.ctx, 999999)
	s.Require().Error(err, "expected error for non-existent ID")
}

func (s *APIKeyRepoSuite) TestGetByKey() {
	user := s.mustCreateUser("getbykey@test.com")
	group := s.mustCreateGroup("g-key")

	key := &service.APIKey{
		UserID:  user.ID,
		Key:     "sk-getbykey",
		Name:    "My Key",
		GroupID: &group.ID,
		Status:  service.StatusActive,
	}
	s.Require().NoError(s.repo.Create(s.ctx, key))

	got, err := s.repo.GetByKey(s.ctx, key.Key)
	s.Require().NoError(err, "GetByKey")
	s.Require().Equal(key.ID, got.ID)
	s.Require().NotNil(got.User, "expected User preload")
	s.Require().Equal(user.ID, got.User.ID)
	s.Require().NotNil(got.Group, "expected Group preload")
	s.Require().Equal(group.ID, got.Group.ID)
}

func (s *APIKeyRepoSuite) TestGetByKey_NotFound() {
	_, err := s.repo.GetByKey(s.ctx, "non-existent-key")
	s.Require().Error(err, "expected error for non-existent key")
}

// --- Update ---

func (s *APIKeyRepoSuite) TestUpdate() {
	user := s.mustCreateUser("update@test.com")
	group := s.mustCreateGroup("g-update")
	key := &service.APIKey{
		UserID:            user.ID,
		Key:               "sk-update",
		Name:              "Original",
		GroupID:           &group.ID,
		Status:            service.StatusActive,
		AllowBalance:      true,
		AllowSubscription: true,
	}
	s.Require().NoError(s.repo.Create(s.ctx, key))

	key.Name = "Renamed"
	key.Status = service.StatusDisabled
	err := s.repo.Update(s.ctx, key)
	s.Require().NoError(err, "Update")

	got, err := s.repo.GetByID(s.ctx, key.ID)
	s.Require().NoError(err, "GetByID after update")
	s.Require().Equal("sk-update", got.Key, "Update should not change key")
	s.Require().Equal(user.ID, got.UserID, "Update should not change user_id")
	s.Require().Equal("Renamed", got.Name)
	s.Require().Equal(service.StatusDisabled, got.Status)
}

// --- Delete ---

func (s *APIKeyRepoSuite) TestDelete() {
	user := s.mustCreateUser("delete@test.com")
	group := s.mustCreateGroup("g-delete")
	key := &service.APIKey{
		UserID:            user.ID,
		Key:               "sk-delete",
		Name:              "Delete Me",
		GroupID:           &group.ID,
		Status:            service.StatusActive,
		AllowBalance:      true,
		AllowSubscription: true,
	}
	s.Require().NoError(s.repo.Create(s.ctx, key))

	err := s.repo.Delete(s.ctx, key.ID)
	s.Require().NoError(err, "Delete")

	_, err = s.repo.GetByID(s.ctx, key.ID)
	s.Require().Error(err, "expected error after delete")
}

// --- ListByUserID / CountByUserID ---

func (s *APIKeyRepoSuite) TestListByUserID() {
	user := s.mustCreateUser("listbyuser@test.com")
	group := s.mustCreateGroup("g-list-user")
	s.mustCreateApiKey(user.ID, "sk-list-1", "Key 1", group.ID)
	s.mustCreateApiKey(user.ID, "sk-list-2", "Key 2", group.ID)

	keys, page, err := s.repo.ListByUserID(s.ctx, user.ID, pagination.PaginationParams{Page: 1, PageSize: 10})
	s.Require().NoError(err, "ListByUserID")
	s.Require().Len(keys, 2)
	s.Require().Equal(int64(2), page.Total)
}

func (s *APIKeyRepoSuite) TestListByUserID_Pagination() {
	user := s.mustCreateUser("paging@test.com")
	group := s.mustCreateGroup("g-paging")
	for i := 0; i < 5; i++ {
		s.mustCreateApiKey(user.ID, "sk-page-"+string(rune('a'+i)), "Key", group.ID)
	}

	keys, page, err := s.repo.ListByUserID(s.ctx, user.ID, pagination.PaginationParams{Page: 1, PageSize: 2})
	s.Require().NoError(err)
	s.Require().Len(keys, 2)
	s.Require().Equal(int64(5), page.Total)
	s.Require().Equal(3, page.Pages)
}

func (s *APIKeyRepoSuite) TestCountByUserID() {
	user := s.mustCreateUser("count@test.com")
	group := s.mustCreateGroup("g-count-user")
	s.mustCreateApiKey(user.ID, "sk-count-1", "K1", group.ID)
	s.mustCreateApiKey(user.ID, "sk-count-2", "K2", group.ID)

	count, err := s.repo.CountByUserID(s.ctx, user.ID)
	s.Require().NoError(err, "CountByUserID")
	s.Require().Equal(int64(2), count)
}

// --- ListByGroupID / CountByGroupID ---

func (s *APIKeyRepoSuite) TestListByGroupID() {
	user := s.mustCreateUser("listbygroup@test.com")
	group := s.mustCreateGroup("g-list")

	s.mustCreateApiKey(user.ID, "sk-grp-1", "K1", group.ID)
	s.mustCreateApiKey(user.ID, "sk-grp-2", "K2", group.ID)

	keys, page, err := s.repo.ListByGroupID(s.ctx, group.ID, pagination.PaginationParams{Page: 1, PageSize: 10})
	s.Require().NoError(err, "ListByGroupID")
	s.Require().Len(keys, 2)
	s.Require().Equal(int64(2), page.Total)
	// User preloaded
	s.Require().NotNil(keys[0].User)
}

func (s *APIKeyRepoSuite) TestCountByGroupID() {
	user := s.mustCreateUser("countgroup@test.com")
	group := s.mustCreateGroup("g-count")
	s.mustCreateApiKey(user.ID, "sk-gc-1", "K1", group.ID)

	count, err := s.repo.CountByGroupID(s.ctx, group.ID)
	s.Require().NoError(err, "CountByGroupID")
	s.Require().Equal(int64(1), count)
}

// --- ExistsByKey ---

func (s *APIKeyRepoSuite) TestExistsByKey() {
	user := s.mustCreateUser("exists@test.com")
	group := s.mustCreateGroup("g-exists")
	s.mustCreateApiKey(user.ID, "sk-exists", "K", group.ID)

	exists, err := s.repo.ExistsByKey(s.ctx, "sk-exists")
	s.Require().NoError(err, "ExistsByKey")
	s.Require().True(exists)

	notExists, err := s.repo.ExistsByKey(s.ctx, "sk-not-exists")
	s.Require().NoError(err)
	s.Require().False(notExists)
}

func (s *APIKeyRepoSuite) TestExistsByKey_IncludesSoftDeleted() {
	user := s.mustCreateUser("exists-soft@test.com")
	group := s.mustCreateGroup("g-exists-soft")
	key := s.mustCreateApiKey(user.ID, "sk-exists-soft", "K", group.ID)

	s.Require().NoError(s.repo.Delete(s.ctx, key.ID), "Delete")

	exists, err := s.repo.ExistsByKey(s.ctx, "sk-exists-soft")
	s.Require().NoError(err, "ExistsByKey after delete")
	s.Require().True(exists, "expected ExistsByKey to include soft-deleted records")
}

// --- SearchAPIKeys ---

func (s *APIKeyRepoSuite) TestSearchAPIKeys() {
	user := s.mustCreateUser("search@test.com")
	group := s.mustCreateGroup("g-search")
	s.mustCreateApiKey(user.ID, "sk-search-1", "Production Key", group.ID)
	s.mustCreateApiKey(user.ID, "sk-search-2", "Development Key", group.ID)

	found, err := s.repo.SearchAPIKeys(s.ctx, user.ID, "prod", 10)
	s.Require().NoError(err, "SearchAPIKeys")
	s.Require().Len(found, 1)
	s.Require().Contains(found[0].Name, "Production")
}

func (s *APIKeyRepoSuite) TestSearchAPIKeys_NoKeyword() {
	user := s.mustCreateUser("searchnokw@test.com")
	group := s.mustCreateGroup("g-search-nk")
	s.mustCreateApiKey(user.ID, "sk-nk-1", "K1", group.ID)
	s.mustCreateApiKey(user.ID, "sk-nk-2", "K2", group.ID)

	found, err := s.repo.SearchAPIKeys(s.ctx, user.ID, "", 10)
	s.Require().NoError(err)
	s.Require().Len(found, 2)
}

func (s *APIKeyRepoSuite) TestSearchAPIKeys_NoUserID() {
	user := s.mustCreateUser("searchnouid@test.com")
	group := s.mustCreateGroup("g-search-nu")
	s.mustCreateApiKey(user.ID, "sk-nu-1", "TestKey", group.ID)

	found, err := s.repo.SearchAPIKeys(s.ctx, 0, "testkey", 10)
	s.Require().NoError(err)
	s.Require().Len(found, 1)
}

// --- Combined CRUD/Search/Group Update ---

func (s *APIKeyRepoSuite) TestCRUD_Search_UpdateGroup() {
	user := s.mustCreateUser("k@example.com")
	group := s.mustCreateGroup("g-k")
	group2 := s.mustCreateGroup("g-k-2")
	key := s.mustCreateApiKey(user.ID, "sk-test-1", "My Key", group.ID)
	key.GroupID = &group.ID

	got, err := s.repo.GetByKey(s.ctx, key.Key)
	s.Require().NoError(err, "GetByKey")
	s.Require().Equal(key.ID, got.ID)
	s.Require().NotNil(got.User)
	s.Require().Equal(user.ID, got.User.ID)
	s.Require().NotNil(got.Group)
	s.Require().Equal(group.ID, got.Group.ID)

	key.Name = "Renamed"
	key.Status = service.StatusDisabled
	key.GroupID = &group2.ID
	s.Require().NoError(s.repo.Update(s.ctx, key), "Update")

	got2, err := s.repo.GetByID(s.ctx, key.ID)
	s.Require().NoError(err, "GetByID")
	s.Require().Equal("sk-test-1", got2.Key, "Update should not change key")
	s.Require().Equal(user.ID, got2.UserID, "Update should not change user_id")
	s.Require().Equal("Renamed", got2.Name)
	s.Require().Equal(service.StatusDisabled, got2.Status)
	s.Require().NotNil(got2.GroupID)
	s.Require().Equal(group2.ID, *got2.GroupID)

	keys, page, err := s.repo.ListByUserID(s.ctx, user.ID, pagination.PaginationParams{Page: 1, PageSize: 10})
	s.Require().NoError(err, "ListByUserID")
	s.Require().Equal(int64(1), page.Total)
	s.Require().Len(keys, 1)

	exists, err := s.repo.ExistsByKey(s.ctx, "sk-test-1")
	s.Require().NoError(err, "ExistsByKey")
	s.Require().True(exists, "expected key to exist")

	found, err := s.repo.SearchAPIKeys(s.ctx, user.ID, "renam", 10)
	s.Require().NoError(err, "SearchAPIKeys")
	s.Require().Len(found, 1)
	s.Require().Equal(key.ID, found[0].ID)

	// CountByGroupID
	k2 := s.mustCreateApiKey(user.ID, "sk-test-2", "Group1 Key", group.ID)
	k2.GroupID = &group.ID

	countGroup1, err := s.repo.CountByGroupID(s.ctx, group.ID)
	s.Require().NoError(err, "CountByGroupID group1")
	s.Require().Equal(int64(1), countGroup1)

	countGroup2, err := s.repo.CountByGroupID(s.ctx, group2.ID)
	s.Require().NoError(err, "CountByGroupID group2")
	s.Require().Equal(int64(1), countGroup2)
}

func (s *APIKeyRepoSuite) mustCreateUser(email string) *service.User {
	s.T().Helper()

	u, err := s.client.User.Create().
		SetEmail(email).
		SetPasswordHash("test-password-hash").
		SetStatus(service.StatusActive).
		SetRole(service.RoleUser).
		Save(s.ctx)
	s.Require().NoError(err, "create user")
	return userEntityToService(u)
}

func (s *APIKeyRepoSuite) mustCreateGroup(name string) *service.Group {
	s.T().Helper()

	g, err := s.client.Group.Create().
		SetName(name).
		SetStatus(service.StatusActive).
		Save(s.ctx)
	s.Require().NoError(err, "create group")
	return groupEntityToService(g)
}

func (s *APIKeyRepoSuite) mustCreateApiKey(userID int64, key, name string, groupID int64) *service.APIKey {
	s.T().Helper()

	gid := groupID
	k := &service.APIKey{
		UserID:            userID,
		Key:               key,
		Name:              name,
		GroupID:           &gid,
		Status:            service.StatusActive,
		AllowBalance:      true,
		AllowSubscription: true,
	}
	s.Require().NoError(s.repo.Create(s.ctx, k), "create api key")
	return k
}
