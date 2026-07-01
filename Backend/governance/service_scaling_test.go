// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package governance

import "testing"

func TestReviewerSeatLimitScalesWithNodeSize(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		userCount int
		want      int
	}{
		{name: "empty node", userCount: 0, want: 0},
		{name: "small node", userCount: 1, want: 1},
		{name: "ten users", userCount: 10, want: 4},
		{name: "larger node", userCount: 25, want: 10},
	}

	for _, tt := range tests {
		got := reviewerSeatLimit(tt.userCount)
		if got != tt.want {
			t.Fatalf("%s: reviewerSeatLimit(%d) = %d, want %d", tt.name, tt.userCount, got, tt.want)
		}
	}
}

func TestActionConsensusThresholdRequiresMultipleWeightedReviewers(t *testing.T) {
	t.Parallel()

	minReviewers, minPoints := actionConsensusThreshold(10)
	if minReviewers != 2 {
		t.Fatalf("minReviewers for 10 users = %d, want 2", minReviewers)
	}
	if minPoints != 8 {
		t.Fatalf("minPoints for 10 users = %d, want 8", minPoints)
	}

	if severityWeight("critical")*1 >= minPoints {
		t.Fatal("single critical review must not reach action threshold alone")
	}
	if severityWeight("critical")*2 < minPoints {
		t.Fatal("two critical reviews should reach weighted action threshold on a 10 user node")
	}
	if severityWeight("medium")*4 < minPoints {
		t.Fatal("four medium reviews should reach weighted action threshold on a 10 user node")
	}
}

func TestConsensusActionTypeUsesSeverityPriorityOnTies(t *testing.T) {
	t.Parallel()

	got := consensusActionType(map[string]int{
		"warn":    2,
		"timeout": 2,
		"suspend": 1,
	})
	if got != "timeout" {
		t.Fatalf("consensusActionType tie = %q, want timeout", got)
	}
}
