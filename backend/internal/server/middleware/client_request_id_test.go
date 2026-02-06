package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestClientRequestID_UsesClientHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-Id", "client-req-123")
	c.Request = req

	m := ClientRequestID()
	m(c)

	got, _ := c.Request.Context().Value(ctxkey.ClientRequestID).(string)
	if got != "client-req-123" {
		t.Fatalf("expected ctx client request id=%q, got %q", "client-req-123", got)
	}
	provided, _ := c.Request.Context().Value(ctxkey.ClientRequestIDProvided).(bool)
	if !provided {
		t.Fatalf("expected provided=true")
	}
	if rec.Header().Get("X-Client-Request-Id") != "client-req-123" {
		t.Fatalf("expected response X-Client-Request-Id=%q, got %q", "client-req-123", rec.Header().Get("X-Client-Request-Id"))
	}
}

func TestClientRequestID_GeneratesWhenMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	ClientRequestID()(c)

	got, _ := c.Request.Context().Value(ctxkey.ClientRequestID).(string)
	if _, err := uuid.Parse(got); err != nil {
		t.Fatalf("expected generated uuid, got %q (err=%v)", got, err)
	}
	provided, _ := c.Request.Context().Value(ctxkey.ClientRequestIDProvided).(bool)
	if provided {
		t.Fatalf("expected provided=false")
	}
	if rec.Header().Get("X-Client-Request-Id") != got {
		t.Fatalf("expected response X-Client-Request-Id=%q, got %q", got, rec.Header().Get("X-Client-Request-Id"))
	}
}

func TestClientRequestID_RejectsInvalidHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Idempotency-Key", "bad\nheader")
	c.Request = req

	ClientRequestID()(c)

	got, _ := c.Request.Context().Value(ctxkey.ClientRequestID).(string)
	if _, err := uuid.Parse(got); err != nil {
		t.Fatalf("expected generated uuid for invalid header, got %q (err=%v)", got, err)
	}
	provided, _ := c.Request.Context().Value(ctxkey.ClientRequestIDProvided).(bool)
	if provided {
		t.Fatalf("expected provided=false for invalid header")
	}
}
