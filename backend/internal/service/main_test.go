package service

import (
	"os"
	"testing"
	"time"

	_ "github.com/Wei-Shaw/sub2api/ent/runtime"
	"github.com/Wei-Shaw/sub2api/internal/pkg/timezone"
)

func TestMain(m *testing.M) {
	// Ensure unit tests run with the same "daily reset" timezone as production
	// (default is Asia/Shanghai).
	if err := timezone.Init("Asia/Shanghai"); err != nil {
		// Fall back to a fixed +08:00 zone if tzdata isn't available.
		time.Local = time.FixedZone("Asia/Shanghai", 8*3600)
	}
	os.Exit(m.Run())
}
