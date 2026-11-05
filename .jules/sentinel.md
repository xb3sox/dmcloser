## 2026-03-31 - Inbound Webhook Media Download Token Leakage & SSRF

**Vulnerability:**
The inbound media downloader attached the workspace's Graph API `Authorization: Bearer ${token}` header unconditionally to any media download URL received in inbound webhook payloads.

**Learning:**
Webhook payload URLs provided by external senders or third-party integrations (e.g. Instagram attachment payload URLs) can point to arbitrary domains. Forwarding Bearer authentication headers to untrusted external URLs exposes access tokens to third-party servers.

**Prevention:**
Validate that media download URLs use secure protocols (`https:`) and strictly restrict sensitive authentication headers (e.g., Bearer tokens) to verified provider domains (`*.facebook.com`, `*.instagram.com`, `*.fbcdn.net`, `*.cdninstagram.com`, `*.fbsbx.com`).

## 2026-10-31 - Inbound Webhook Media Download SSRF Against Cloud Metadata & Private Networks

**Vulnerability:**
While inbound media downloads enforced HTTPS protocol and restricted Bearer token headers, arbitrary external webhook payloads could specify HTTPS URLs targeting cloud provider metadata endpoints (e.g. `https://169.254.169.254/`), loopback services (`127.0.0.1`, `[::1]`, `localhost`), or internal RFC1918 private subnets in production.

**Learning:**
Protocol validation (`https:`) and header restriction alone do not prevent SSRF. In cloud environments, instances often run HTTPS proxies, internal TLS endpoints, or cloud services on link-local or private addresses. Inbound URLs from untrusted webhook payloads must also be validated against private/local network ranges.

**Prevention:**
Enforce network-level host classification (`isPrivateOrLocalHost`) before dispatching outbound media downloads in production, explicitly rejecting loopback, link-local / cloud metadata (169.254.0.0/16), private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7, fe80::/10), and internal hostnames (.internal, .local).
