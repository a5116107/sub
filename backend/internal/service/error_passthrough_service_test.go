package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/model"
	"github.com/stretchr/testify/require"
)

type mockErrorPassthroughRepo struct {
	rules []*model.ErrorPassthroughRule
}

func (m *mockErrorPassthroughRepo) List(ctx context.Context) ([]*model.ErrorPassthroughRule, error) {
	return m.rules, nil
}

func (m *mockErrorPassthroughRepo) GetByID(ctx context.Context, id int64) (*model.ErrorPassthroughRule, error) {
	for _, item := range m.rules {
		if item.ID == id {
			return item, nil
		}
	}
	return nil, nil
}

func (m *mockErrorPassthroughRepo) Create(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error) {
	rule.ID = int64(len(m.rules) + 1)
	m.rules = append(m.rules, rule)
	return rule, nil
}

func (m *mockErrorPassthroughRepo) Update(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error) {
	for index, item := range m.rules {
		if item.ID == rule.ID {
			m.rules[index] = rule
			return rule, nil
		}
	}
	return rule, nil
}

func (m *mockErrorPassthroughRepo) Delete(ctx context.Context, id int64) error {
	next := make([]*model.ErrorPassthroughRule, 0, len(m.rules))
	for _, item := range m.rules {
		if item.ID != id {
			next = append(next, item)
		}
	}
	m.rules = next
	return nil
}

func newPassthroughServiceForTest(rules []*model.ErrorPassthroughRule) *ErrorPassthroughService {
	svc := NewErrorPassthroughService(&mockErrorPassthroughRepo{rules: rules}, nil)
	svc.setLocalCache(rules)
	return svc
}

func TestErrorPassthroughServiceMatchRuleAnyMode(t *testing.T) {
	rules := []*model.ErrorPassthroughRule{
		{
			ID:              1,
			Name:            "code-or-keyword",
			Enabled:         true,
			Priority:        1,
			ErrorCodes:      []int{422},
			Keywords:        []string{"context limit"},
			MatchMode:       model.MatchModeAny,
			Platforms:       []string{PlatformAnthropic},
			PassthroughCode: true,
			PassthroughBody: true,
		},
	}
	svc := newPassthroughServiceForTest(rules)

	matchedByCode := svc.MatchRule(PlatformAnthropic, 422, []byte(`{"error":{"message":"other"}}`))
	require.NotNil(t, matchedByCode)
	require.Equal(t, int64(1), matchedByCode.ID)

	matchedByKeyword := svc.MatchRule(PlatformAnthropic, 500, []byte(`{"error":{"message":"Context Limit exceeded"}}`))
	require.NotNil(t, matchedByKeyword)
	require.Equal(t, int64(1), matchedByKeyword.ID)
}

func TestErrorPassthroughServiceMatchRuleAllMode(t *testing.T) {
	rules := []*model.ErrorPassthroughRule{
		{
			ID:              1,
			Name:            "all-required",
			Enabled:         true,
			Priority:        1,
			ErrorCodes:      []int{429},
			Keywords:        []string{"quota"},
			MatchMode:       model.MatchModeAll,
			Platforms:       []string{PlatformOpenAI},
			PassthroughCode: true,
			PassthroughBody: true,
		},
	}
	svc := newPassthroughServiceForTest(rules)

	notMatched := svc.MatchRule(PlatformOpenAI, 429, []byte(`{"error":{"message":"rate limited"}}`))
	require.Nil(t, notMatched)

	matched := svc.MatchRule(PlatformOpenAI, 429, []byte(`{"error":{"message":"quota exceeded"}}`))
	require.NotNil(t, matched)
}

func TestErrorPassthroughServiceMatchRulePriorityAndPlatform(t *testing.T) {
	ruleMessage := "masked error"
	ruleCode := 503
	rules := []*model.ErrorPassthroughRule{
		{
			ID:              10,
			Name:            "generic",
			Enabled:         true,
			Priority:        10,
			ErrorCodes:      []int{500},
			MatchMode:       model.MatchModeAny,
			Platforms:       []string{},
			PassthroughCode: true,
			PassthroughBody: true,
		},
		{
			ID:              20,
			Name:            "platform-specific-high-priority",
			Enabled:         true,
			Priority:        1,
			ErrorCodes:      []int{500},
			MatchMode:       model.MatchModeAny,
			Platforms:       []string{PlatformGemini},
			PassthroughCode: false,
			ResponseCode:    &ruleCode,
			PassthroughBody: false,
			CustomMessage:   &ruleMessage,
		},
	}
	svc := newPassthroughServiceForTest(rules)

	matchedGemini := svc.MatchRule(PlatformGemini, 500, []byte(`{"error":{"message":"internal"}}`))
	require.NotNil(t, matchedGemini)
	require.Equal(t, int64(20), matchedGemini.ID)

	matchedOpenAI := svc.MatchRule(PlatformOpenAI, 500, []byte(`{"error":{"message":"internal"}}`))
	require.NotNil(t, matchedOpenAI)
	require.Equal(t, int64(10), matchedOpenAI.ID)
}

func TestErrorPassthroughRuleValidate(t *testing.T) {
	validRule := &model.ErrorPassthroughRule{
		Name:            "valid",
		Enabled:         true,
		Priority:        1,
		ErrorCodes:      []int{500},
		MatchMode:       model.MatchModeAny,
		PassthroughCode: true,
		PassthroughBody: true,
	}
	require.NoError(t, validRule.Validate())

	invalidRule := &model.ErrorPassthroughRule{
		Name:            "",
		Enabled:         true,
		ErrorCodes:      []int{500},
		MatchMode:       model.MatchModeAny,
		PassthroughCode: true,
		PassthroughBody: true,
	}
	require.Error(t, invalidRule.Validate())
}
