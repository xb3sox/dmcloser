## 2026-03-31 - Inbound Webhook Media Download Token Leakage & SSRF

**Vulnerability:**
The inbound media downloader attached the workspace's Graph API `Authorization: Bearer ${token}` header unconditionally to any media download URL received in inbound webhook payloads.

**Learning:**
Webhook payload URLs provided by external senders or third-party integrations (e.g. Instagram attachment payload URLs) can point to arbitrary domains. Forwarding Bearer authentication headers to untrusted external URLs exposes access tokens to third-party servers.

**Prevention:**
Validate that media download URLs use secure protocols (`https:`) and strictly restrict sensitive authentication headers (e.g., Bearer tokens) to verified provider domains (`*.facebook.com`, `*.instagram.com`, `*.fbcdn.net`, `*.cdninstagram.com`, `*.fbsbx.com`).
