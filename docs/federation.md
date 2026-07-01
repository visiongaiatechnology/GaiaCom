# GaiaCom Federation

GaiaCom federation lets independent nodes exchange signed protocol data units
(PDUs) without granting remote nodes authority over local users or local auth
state.

## Discovery

Nodes expose discovery metadata for server name, public key, and capability
documents. Production deployments must avoid leaking private configuration,
private IPs, SMTP credentials, database paths, JWT secrets, or storage secrets.

## PDU Validation

Inbound federation requires:

- Signature verification.
- Replay protection.
- Timestamp skew checks.
- Body hash or transcript binding.
- Destination/origin validation.
- Strict payload size limits.

## SSRF Controls

Federation egress rejects loopback, private, multicast, CGNAT, documentation,
benchmarking, metadata, IPv4-mapped IPv6, and reserved address ranges in
production mode. Non-HTTP schemes and unsafe redirects are rejected.

## Capability Checks

Top Secret federation requires the remote node to advertise the required
ML-DSA-87 capability. Legacy nodes without capability cannot silently receive or
downgrade Top Secret traffic.

## Non-Goals For Beta

Open public federation with arbitrary unknown domains is intentionally scoped.
Operators should start with controlled allowlists until abuse controls and
operational monitoring mature further.
