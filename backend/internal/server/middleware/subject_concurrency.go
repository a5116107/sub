package middleware

import "github.com/Wei-Shaw/sub2api/internal/service"

// computeSubjectConcurrency determines the effective user concurrency for this request.
//
// Concurrency slots are keyed by (user, group) (concurrency:user:{userID}:group:{groupID}),
// so the maxConcurrency we pass in applies per group.
//
// Rule:
//   - Default: use user.Concurrency
//   - If the request is using a group and the group specifies UserConcurrency (>0),
//     use the group's value (package concurrency).
//   - Always clamp to >=1 as a safety guard.
func computeSubjectConcurrency(userConcurrency int, group *service.Group) int {
	effective := userConcurrency
	if group != nil && group.UserConcurrency > 0 {
		effective = group.UserConcurrency
	}
	if effective < 1 {
		return 1
	}
	return effective
}
