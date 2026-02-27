package service

import "strings"

const (
	Failover400KeywordCategorySensitive = "sensitive"
	Failover400KeywordCategoryTemporary = "temporary"
)

type Failover400KeywordMatch struct {
	Category string
	Keyword  string
}

var defaultFailoverSensitive400Keywords = []string{
	"insufficient balance",
	"insufficient credit",
	"insufficient credits",
	"credit balance",
	"out of quota",
	"quota exceeded",
	"payment required",
	"billing issue",
	"余额不足",
	"积分不足",
	"额度不足",
	"配额不足",
}

var defaultFailoverTemporary400Keywords = []string{
	"temporarily unavailable",
	"service unavailable",
	"under maintenance",
	"maintenance",
	"try again later",
	"server overloaded",
	"overloaded",
	"服务暂时不可用",
	"服务不可用",
	"维护中",
	"稍后重试",
	"暂时不可用",
}

var defaultFailoverRequestErrorKeywords = []string{
	"eof",
	" eof",
	": eof",
	"connection reset by peer",
	"broken pipe",
	"tls:",
	"handshake failure",
	"http2: client connection lost",
	"dial tcp",
	"no such host",
	"i/o timeout",
	"timeout awaiting response headers",
	"server misbehaving",
}

func matchFailoverOn400WithKeywords(respBody []byte, sensitiveKeywords, temporaryKeywords []string) *Failover400KeywordMatch {
	msg := strings.ToLower(strings.TrimSpace(extractUpstreamErrorMessage(respBody)))
	if msg == "" {
		msg = strings.ToLower(strings.TrimSpace(string(respBody)))
	}
	if msg == "" {
		return nil
	}

	for _, keyword := range sensitiveKeywords {
		trimmed := strings.TrimSpace(keyword)
		normalized := strings.ToLower(trimmed)
		if normalized != "" && strings.Contains(msg, normalized) {
			return &Failover400KeywordMatch{Category: Failover400KeywordCategorySensitive, Keyword: trimmed}
		}
	}

	for _, keyword := range temporaryKeywords {
		trimmed := strings.TrimSpace(keyword)
		normalized := strings.ToLower(trimmed)
		if normalized != "" && strings.Contains(msg, normalized) {
			return &Failover400KeywordMatch{Category: Failover400KeywordCategoryTemporary, Keyword: trimmed}
		}
	}

	return nil
}

func shouldFailoverOnRequestErrorWithKeywords(errMsg string, keywords []string) bool {
	msg := strings.ToLower(strings.TrimSpace(errMsg))
	if msg == "" {
		return false
	}

	for _, keyword := range keywords {
		normalized := strings.ToLower(strings.TrimSpace(keyword))
		if normalized != "" && strings.Contains(msg, normalized) {
			return true
		}
	}

	return false
}
