package service

import "testing"

func TestScopeStickySessionKey(t *testing.T) {
	t.Parallel()

	if got := ScopeStickySessionKey(0, "abc"); got != "abc" {
		t.Fatalf("userID=0 should be passthrough, got %q", got)
	}
	if got := ScopeStickySessionKey(1, ""); got != "" {
		t.Fatalf("empty sessionHash should be passthrough, got %q", got)
	}

	a1 := ScopeStickySessionKey(1, "abc")
	a2 := ScopeStickySessionKey(1, "abc")
	if a1 == "" || a1 != a2 {
		t.Fatalf("stable scope expected, got %q vs %q", a1, a2)
	}

	b := ScopeStickySessionKey(2, "abc")
	if b == a1 {
		t.Fatalf("different userID should not collide: %q", b)
	}

	c := ScopeStickySessionKey(1, "abcd")
	if c == a1 {
		t.Fatalf("different sessionHash should not collide: %q", c)
	}
}
