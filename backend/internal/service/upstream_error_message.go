package service

// ExtractUpstreamErrorMessage exposes extractUpstreamErrorMessage for callers outside the service package.
//
// Note: This does not sanitize the extracted message. Callers should apply
// sanitizeUpstreamErrorMessage when returning user-visible error details.
func ExtractUpstreamErrorMessage(body []byte) string {
	return extractUpstreamErrorMessage(body)
}

