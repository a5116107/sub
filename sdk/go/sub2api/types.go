package sub2api

// Envelope is the standard JSON response wrapper used by sub2api's REST admin APIs.
// Note: gateway endpoints (OpenAI/Anthropic/Gemini compatible) do NOT use this envelope.
type Envelope[T any] struct {
	Code     int               `json:"code"`
	Message  string            `json:"message"`
	Reason   string            `json:"reason,omitempty"`
	Metadata map[string]string `json:"metadata,omitempty"`
	Data     T                 `json:"data,omitempty"`
}

// PaginatedData matches the server-side response envelope for paginated admin endpoints.
type PaginatedData[T any] struct {
	Items    []T   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
	Pages    int   `json:"pages"`
}
