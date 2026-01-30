package sub2api

import (
	"fmt"
)

// HTTPError represents a non-2xx HTTP response without an envelope contract (gateway APIs).
type HTTPError struct {
	Status int
	Body   []byte
}

func (e *HTTPError) Error() string {
	if e == nil {
		return "http error"
	}
	if len(e.Body) == 0 {
		return fmt.Sprintf("http error: status=%d", e.Status)
	}
	return fmt.Sprintf("http error: status=%d body=%s", e.Status, truncateForError(e.Body, 2048))
}

// APIError represents a non-2xx response from the admin APIs (envelope contract).
type APIError struct {
	Status   int
	Code     int
	Message  string
	Reason   string
	Metadata map[string]string
	Body     []byte
}

func (e *APIError) Error() string {
	if e == nil {
		return "api error"
	}
	msg := e.Message
	if msg == "" {
		msg = "api error"
	}
	if e.Reason != "" {
		return fmt.Sprintf("%s: status=%d code=%d reason=%s", msg, e.Status, e.Code, e.Reason)
	}
	return fmt.Sprintf("%s: status=%d code=%d", msg, e.Status, e.Code)
}

func truncateForError(b []byte, limit int) string {
	if limit <= 0 || len(b) <= limit {
		return string(b)
	}
	return string(b[:limit]) + "…"
}
