# Email delivery

How transactional mail is queued, delivered, retried, and recovered. Email is
transactional only: verification links, password resets, team invitations. No
marketing.

## Flow

1. `createMailer` (`server/mail.ts:14`) builds one nodemailer transport at boot.
   It returns `null` when `SMTP_HOST` is unset.
2. A caller builds a message and enqueues it. `emailToken()`
   (`server/app.ts:359`) writes a single-use `tokens` row (1 hour expiry) for
   `verify` and `reset`, then calls `service.enqueue("email", {to, subject, text,
   purpose})`. Team invites (`server/app.ts:1180`) use a 48 hour token and enqueue
   the same shape. `purpose` is one of `verify`, `reset`, `invite`.
3. `service.enqueue` (`server/service.ts:181`) inserts into `jobs`
   (`kind='email'`, JSON payload in `payload`). The row starts as `pending`
   because `state` has a schema default.
4. The worker claims up to 100 rows using `FOR UPDATE SKIP LOCKED`, flips
   `state` to `processing`, increments `attempts`, and takes a 60 second lease
   (`server/worker.ts:100`).
5. The `email` branch (`server/worker.ts:178`) calls `sendEmail`, which reads
   `MAIL_FROM` and hands the message to SMTP. Success marks the job `done`
   implicitly by leaving the `processing` state cleared.
6. On failure the job either retries or dies (`server/worker.ts:238`):

| Failure | Retries | Outcome |
|---|---|---|
| 5xx reply, `EAUTH`, `EENVELOPE` | none | job goes `dead` on the first attempt |
| Connection refused, timeout, 4xx reply | up to 3 attempts total | then `dead` |
| No mailer configured | none | `dead`, error says email is not configured |

Backoff is `min(60000, 2000 * 2 ** attempts)` (`server/worker.ts:251`): roughly
4 seconds after the first failure, then 8 seconds, then the job dies on the third
attempt.

Every failure increments `metrics.emailFailures` and writes one JSON line to
stderr (`server/worker.ts:283`):

```json
{"event":"email.failure","id":"<job id>","purpose":"verify","dead":false,"attempts":1}
```

A `dead` email job also writes an audit row `email.needs_review` so it lands in
the workspace activity feed.

## Configuration

Read in `server/config.ts:115` and passed to the mailer.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SMTP_HOST` | yes | none | Without it, mail is never sent and signup is closed in production. |
| `SMTP_PORT` | no | `587` | Port `465` selects implicit TLS. Any other port uses STARTTLS, which is mandatory in production. |
| `SMTP_USER` | no | none | Omit for an unauthenticated relay. |
| `SMTP_PASSWORD` | no | none | Sent only when `SMTP_USER` is set. |
| `MAIL_FROM` | no | `DMCloser <hello@example.com>` | Must be a domain the SMTP provider has authorised. |
| `WORKER_KINDS` | no | all kinds | If set, it must contain `email` or no worker ever drains the queue. |
| `METRICS_TOKEN` | no | none | Without it `GET /internal/metrics` returns 404. |

What a missing `SMTP_HOST` changes:

- Production registration returns 503 "Registration is temporarily unavailable
  until email delivery is configured." (`server/app.ts:550`). Development
  registration still works.
- Verify and reset endpoints return 503 "Email delivery is not configured.
  Contact the service owner." (`server/app.ts:360`).
- Team invites are created but the email is silently skipped
  (`server/app.ts:1191`). The invite link has to be copied out of the database
  by hand.

## Resend setup

1. Create a Resend account and add the sending domain.
2. Create an API key with sending permission.
3. Set the server environment:

```sh
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=re_your_api_key_here
MAIL_FROM=DMCloser <hello@brngt.com>
```

Port 465 is implicit TLS, which is what the mailer enables when the port is
exactly 465. Port 587 with STARTTLS also works.

### DNS records

Resend shows the exact values for the domain. The shape is always these three.

SPF, a TXT record on the sending subdomain (Resend recommends a subdomain such as
`send` so the root domain's mail is untouched):

```
Type:  TXT
Name:  send.brngt.com
Value: v=spf1 include:amazonses.com ~all
TTL:   Auto
```

DKIM, one or more CNAMEs:

```
Type:  CNAME
Name:  resend._domainkey.send.brngt.com
Value: <value shown by Resend>.dkim.amazonses.com
TTL:   Auto
```

DMARC, a TXT record on `_dmarc`:

```
Type:  TXT
Name:  _dmarc.brngt.com
Value: v=DMARC1; p=none; rua=mailto:dmarc@brngt.com
TTL:   Auto
```

Start with `p=none`. Move to `p=quarantine` only after a week of clean reports.

**Warning: `brngt.com` already carries live mail records for the owner's Hostinger
mailbox.** Those are `hostingermail-a._domainkey`, `hostingermail-b._domainkey`,
`hostingermail-c._domainkey` CNAMEs plus the MX records for the domain. They must
be **added to, never replaced**. Editing an existing record instead of creating a
new one, or a DNS provider's "replace all TXT" flow, breaks inbound mail for the
owner's mailbox. Add only new records, and leave every existing `hostingermail-*`
and MX row exactly as it is.

## Verification walkthrough

1. Set all five SMTP variables, restart the server, and confirm startup logs no
   mail-configuration complaint.
2. Trigger a `reset` mail from the login screen, or register a fresh account to
   receive a `verify` link.
3. Confirm the mail arrives, the link opens, and the token is single use (opening
   the link twice fails on the second attempt).
4. Break SMTP deliberately. Set `SMTP_PASSWORD=wrong` and restart. Mail now fails
   with `EAUTH`, which is permanent, so the job dies on the first attempt.
5. Trigger another reset mail. Then confirm the failure in three places:
   - Settings, Operations (`GET /api/operations`) lists the job as `dead` with the
     rejection text.
   - Server logs show `{"event":"email.failure",...,"dead":true,"attempts":1}`.
   - The activity feed shows an `email.needs_review` entry.
6. Restore the correct `SMTP_PASSWORD` and restart. In Operations, press retry on
   the dead job. That calls `POST /api/operations/:id/retry`, which resets
   `state='pending'`, `attempts=0`, `error=NULL` and makes the job due
   immediately.
7. Confirm the mail arrives, and the job leaves the Operations list.

## Troubleshooting

| Symptom | Meaning | Action |
|---|---|---|
| 4xx reply from provider (421, 450, 451) | Transient. Provider is rate limiting or greylisting. | Nothing. The job retries after about 4s and 8s, then dies. |
| 5xx reply from provider (550, 554) | Permanent rejection, usually a bad recipient or a blocked sender. | The job dies immediately. Fix the address or the domain reputation, then retry. |
| `EAUTH` | Credentials rejected. | Fix `SMTP_USER` / `SMTP_PASSWORD`, restart, then retry the dead job. Retrying before the fix just kills it again. |
| `EENVELOPE` | `MAIL_FROM` or the recipient is not accepted by the provider. | Use an address on a domain the provider has verified. |
| Operations row: "Email is not configured on the server; the message was not sent." | Worker started without `SMTP_HOST`. | Set the SMTP variables and restart. The job is already dead, so retry it after. |
| 503 "Registration is temporarily unavailable until email delivery is configured." | Production register endpoint refuses to create accounts it cannot verify. | Set `SMTP_HOST` and restart. |
| 503 "Email delivery is not configured. Contact the service owner." | Token endpoint hit with no mailer. | Same fix. |
| Jobs stay `pending` and nothing is ever attempted | `WORKER_KINDS` is set and omits `email`. | Add `email` to the comma-separated list, or unset it to run all kinds. |
| Nothing in the activity feed | `workspace_id` is null on the job, so the audit row has no workspace to attach to. | Read `email.failure` lines in stderr instead, or query `jobs` directly. |

### Requeueing by hand

Through the UI, Operations has a retry button per dead job. The same call
directly:

```sh
curl -X POST https://app.brngt.com/api/operations/<job-id>/retry \
  -H "cookie: <owner session>"
```

The endpoint only accepts jobs in state `dead`, and refuses `deliver` jobs with
409. If no session is available, the SQL equivalent is:

```sql
UPDATE jobs
   SET state = 'pending', attempts = 0, error = NULL,
       available_at = (extract(epoch from now()) * 1000)::bigint,
       lease_until = 0
 WHERE id = '<job-id>'
   AND workspace_id = '<workspace-id>'
   AND state = 'dead';
```

Confirm with `SELECT id, kind, state, attempts, error FROM jobs WHERE kind = 'email'
ORDER BY created_at DESC LIMIT 10;`.
