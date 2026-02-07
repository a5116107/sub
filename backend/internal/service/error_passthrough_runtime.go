package service

import "github.com/gin-gonic/gin"

const errorPassthroughServiceContextKey = "error_passthrough_service"

// BindErrorPassthroughService binds passthrough service to request context
// so service-layer non-failover paths can reuse passthrough rules.
func BindErrorPassthroughService(c *gin.Context, svc *ErrorPassthroughService) {
	if c == nil || svc == nil {
		return
	}
	c.Set(errorPassthroughServiceContextKey, svc)
}

func getBoundErrorPassthroughService(c *gin.Context) *ErrorPassthroughService {
	if c == nil {
		return nil
	}
	val, ok := c.Get(errorPassthroughServiceContextKey)
	if !ok {
		return nil
	}
	serviceValue, ok := val.(*ErrorPassthroughService)
	if !ok {
		return nil
	}
	return serviceValue
}

// applyErrorPassthroughRule rewrites error response parameters by matching
// configured passthrough rules. If no rule matched, defaults are returned.
func applyErrorPassthroughRule(
	c *gin.Context,
	platform string,
	upstreamStatus int,
	responseBody []byte,
	defaultStatus int,
	defaultErrType string,
	defaultErrMsg string,
) (status int, errType string, errMsg string, matched bool) {
	status = defaultStatus
	errType = defaultErrType
	errMsg = defaultErrMsg

	svc := getBoundErrorPassthroughService(c)
	if svc == nil {
		return status, errType, errMsg, false
	}

	rule := svc.MatchRule(platform, upstreamStatus, responseBody)
	if rule == nil {
		return status, errType, errMsg, false
	}

	status = upstreamStatus
	if !rule.PassthroughCode && rule.ResponseCode != nil {
		status = *rule.ResponseCode
	}

	errMsg = ExtractUpstreamErrorMessage(responseBody)
	if !rule.PassthroughBody && rule.CustomMessage != nil {
		errMsg = *rule.CustomMessage
	}

	errType = "upstream_error"
	return status, errType, errMsg, true
}
