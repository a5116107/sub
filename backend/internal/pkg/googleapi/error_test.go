package googleapi

import "testing"

func TestExtractActivationURL(t *testing.T) {
	body := `{
		"error": {
			"code": 403,
			"status": "PERMISSION_DENIED",
			"details": [
				{
					"@type": "type.googleapis.com/google.rpc.ErrorInfo",
					"reason": "SERVICE_DISABLED",
					"metadata": {
						"activationUrl": "https://console.cloud.google.com/apis/api/cloudaicompanion.googleapis.com/overview?project=my-project"
					}
				}
			]
		}
	}`

	got := ExtractActivationURL(body)
	want := "https://console.cloud.google.com/apis/api/cloudaicompanion.googleapis.com/overview?project=my-project"
	if got != want {
		t.Fatalf("unexpected activation URL, got=%q want=%q", got, want)
	}
}

func TestExtractActivationURLFromHelpLinks(t *testing.T) {
	body := `{
		"error": {
			"code": 403,
			"status": "PERMISSION_DENIED",
			"details": [
				{
					"@type": "type.googleapis.com/google.rpc.Help",
					"links": [
						{
							"description": "Google developers console API activation",
							"url": "https://console.cloud.google.com/apis/api/cloudaicompanion.googleapis.com/overview?project=test"
						}
					]
				}
			]
		}
	}`

	got := ExtractActivationURL(body)
	want := "https://console.cloud.google.com/apis/api/cloudaicompanion.googleapis.com/overview?project=test"
	if got != want {
		t.Fatalf("unexpected activation URL, got=%q want=%q", got, want)
	}
}

func TestExtractActivationURL_DevelopersConsoleLink(t *testing.T) {
	body := `{
		"error": {
			"code": 403,
			"message": "Gemini for Google Cloud API has not been used in project project-6eca5881-ab73-4736-843 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/cloudaicompanion.googleapis.com/overview?project=project-6eca5881-ab73-4736-843 then retry.",
			"status": "PERMISSION_DENIED",
			"details": [
				{
					"@type": "type.googleapis.com/google.rpc.ErrorInfo",
					"reason": "SERVICE_DISABLED",
					"metadata": {
						"activationUrl": "https://console.developers.google.com/apis/api/cloudaicompanion.googleapis.com/overview?project=project-6eca5881-ab73-4736-843"
					}
				}
			]
		}
	}`

	got := ExtractActivationURL(body)
	want := "https://console.developers.google.com/apis/api/cloudaicompanion.googleapis.com/overview?project=project-6eca5881-ab73-4736-843"
	if got != want {
		t.Fatalf("unexpected activation URL, got=%q want=%q", got, want)
	}
}

func TestIsServiceDisabledError(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		expected bool
	}{
		{
			name: "service disabled",
			body: `{
				"error": {
					"code": 403,
					"status": "PERMISSION_DENIED",
					"details": [
						{
							"@type": "type.googleapis.com/google.rpc.ErrorInfo",
							"reason": "SERVICE_DISABLED"
						}
					]
				}
			}`,
			expected: true,
		},
		{
			name: "other reason",
			body: `{
				"error": {
					"code": 403,
					"status": "PERMISSION_DENIED",
					"details": [
						{
							"@type": "type.googleapis.com/google.rpc.ErrorInfo",
							"reason": "OTHER_REASON"
						}
					]
				}
			}`,
			expected: false,
		},
		{
			name:     "invalid JSON",
			body:     `invalid json`,
			expected: false,
		},
		{
			name: "404 error",
			body: `{
				"error": {
					"code": 404,
					"status": "NOT_FOUND"
				}
			}`,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsServiceDisabledError(tt.body); got != tt.expected {
				t.Fatalf("unexpected result, got=%v want=%v", got, tt.expected)
			}
		})
	}
}

func TestParseError(t *testing.T) {
	body := `{
		"error": {
			"code": 403,
			"message": "API not enabled",
			"status": "PERMISSION_DENIED"
		}
	}`

	errResp, err := ParseError(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if errResp.Error.Code != 403 {
		t.Fatalf("unexpected code, got=%d", errResp.Error.Code)
	}
	if errResp.Error.Status != "PERMISSION_DENIED" {
		t.Fatalf("unexpected status, got=%q", errResp.Error.Status)
	}
	if errResp.Error.Message != "API not enabled" {
		t.Fatalf("unexpected message, got=%q", errResp.Error.Message)
	}
}

func TestParseError_InvalidJSON(t *testing.T) {
	_, err := ParseError(`invalid json`)
	if err == nil {
		t.Fatal("expected parse error")
	}
}
