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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsServiceDisabledError(tt.body); got != tt.expected {
				t.Fatalf("unexpected result, got=%v want=%v", got, tt.expected)
			}
		})
	}
}
