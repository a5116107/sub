package service

import (
	"context"
	"log"
	"strings"
	"time"
)

// googleConfigErrorCooldown 服务端配置类 400 错误的临时封禁时长。
const googleConfigErrorCooldown = 1 * time.Minute

// emptyResponseCooldown 空流式响应的临时封禁时长。
const emptyResponseCooldown = 1 * time.Minute

func isGoogleProjectConfigError(lowerMsg string) bool {
	msg := strings.TrimSpace(lowerMsg)
	if msg == "" {
		return false
	}
	// Observed transient upstream message:
	// "invalid project resource name"
	return strings.Contains(msg, "invalid project resource name")
}

// tempUnscheduleGoogleConfigError 对服务端配置类 400 错误触发临时封禁，
// 避免短时间内反复调度到同一个有问题的账号。
func tempUnscheduleGoogleConfigError(ctx context.Context, repo AccountRepository, accountID int64, logPrefix string) {
	if repo == nil {
		return
	}
	until := time.Now().Add(googleConfigErrorCooldown)
	reason := "400: invalid project resource name (auto temp-unschedule 1m)"
	if err := repo.SetTempUnschedulable(ctx, accountID, until, reason); err != nil {
		log.Printf("%s temp_unschedule_failed account=%d error=%v", logPrefix, accountID, err)
	} else {
		log.Printf("%s temp_unscheduled account=%d until=%v reason=%q", logPrefix, accountID, until.Format(time.RFC3339), reason)
	}
}

// tempUnscheduleEmptyResponse 对空流式响应触发临时封禁，
// 避免短时间内反复调度到同一个返回空响应的账号。
func tempUnscheduleEmptyResponse(ctx context.Context, repo AccountRepository, accountID int64, logPrefix string) {
	if repo == nil {
		return
	}
	until := time.Now().Add(emptyResponseCooldown)
	reason := "empty stream response (auto temp-unschedule 1m)"
	if err := repo.SetTempUnschedulable(ctx, accountID, until, reason); err != nil {
		log.Printf("%s temp_unschedule_failed account=%d error=%v", logPrefix, accountID, err)
	} else {
		log.Printf("%s temp_unscheduled account=%d until=%v reason=%q", logPrefix, accountID, until.Format(time.RFC3339), reason)
	}
}

