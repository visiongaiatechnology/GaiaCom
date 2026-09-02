// STATUS: DIAMANT VGT SUPREME
package buildinfo

import (
	"regexp"
	"time"
)

var (
	Version = "2.0.0-dev"
	Commit  = "unknown"
	BuiltAt = "unknown"
)

var releaseVersionPattern = regexp.MustCompile(`^[0-9]+\.[0-9]+\.[0-9]+$`)

type Info struct {
	Product         string `json:"product"`
	Version         string `json:"version"`
	Commit          string `json:"commit"`
	BuiltAt         string `json:"built_at"`
	ProtocolVersion string `json:"protocol_version"`
}

func Current() Info {
	return Info{
		Product:         "GaiaCom",
		Version:         Version,
		Commit:          Commit,
		BuiltAt:         BuiltAt,
		ProtocolVersion: "gaiacom.v1",
	}
}

func IsRelease() bool {
	if !releaseVersionPattern.MatchString(Version) {
		return false
	}
	if !validCommit(Commit) {
		return false
	}
	_, err := time.Parse(time.RFC3339, BuiltAt)
	return err == nil
}

func validCommit(commit string) bool {
	if len(commit) < 7 || len(commit) > 64 {
		return false
	}
	for _, char := range commit {
		if (char < '0' || char > '9') && (char < 'a' || char > 'f') && (char < 'A' || char > 'F') {
			return false
		}
	}
	return true
}
