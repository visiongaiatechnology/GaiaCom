// STATUS: DIAMANT VGT SUPREME
//go:build !windows

package provision

import "os"

func replaceFile(source, destination string) error {
	return os.Rename(source, destination)
}
