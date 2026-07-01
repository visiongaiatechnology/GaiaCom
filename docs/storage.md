# GaiaCom Storage and GaiaDrive

GaiaCom storage handles encrypted attachments, GaiaDrive cloud objects,
GaiaDrop payloads, and temporary sharing grants.

## Invariants

- The server stores encrypted chunks, not native plaintext content.
- Storage roots must be outside the public web root.
- Local filesystem paths are jail-checked.
- S3/MinIO object keys are prefix-validated and traversal-resistant.
- ACL checks run before metadata or object downloads.

## Access Modes

- Owner access: owner may read own metadata/chunks.
- Explicit grant: recipient may access a file until the grant expires.
- Public access: public flag is explicit and still mediated by API.
- Revoked/expired grants: access must fail with 403 or neutral 404.

## Limits and Cleanup

The beta enforces upload body limits, chunk limits, max file envelope limits,
per-user quota, pending upload TTL, stale pending cleanup, expired access grant
cleanup, and object-store delete paths.

## S3/MinIO Adapter

The S3 adapter exists so node operators can store encrypted chunks in object
storage instead of local disk. It is not a trust boundary bypass: S3 must not
receive cleartext files, thumbnails, previews, private keys, or plaintext
metadata.

## Beta Known Gap

Cross-device GaiaDrive sync is partially implemented through server-backed
encrypted records and grants, but the final multi-device recovery/key-share
model remains a beta limitation and must be documented before wider release.
