# Meta setup

Console click-through for connecting WhatsApp to DMCloser. Written for the
account owner, not for a developer. Work top to bottom; each section ends with
what must be true before moving on.

Console: https://developers.facebook.com/apps

## 1. Business verification

A verified business is required before a WhatsApp Business Account can send to
real numbers and before template review works reliably.

1. Create or open a Business Portfolio at https://business.facebook.com.
2. Fill in the legal business name exactly as it appears on the registration,
   plus the registered address, phone, and website.
3. Upload documents. For a Saudi clinic, Meta usually asks for some combination
   of:
   - Commercial Registration (CR) from the Ministry of Commerce.
   - VAT registration certificate from ZATCA.
   - National Address certificate (Wasel), or a utility bill showing the address.
   - A letter on company letterhead naming the person authorised to manage the
     account, when the CR does not name them.
   - The authorised person's ID or passport.
4. Submit. Review typically takes one to several business days. Rejection is
   usually a name or address mismatch between the document and the profile.

Done when: Business Settings shows the portfolio as verified.

## 2. Create the app

1. developers.facebook.com, My Apps, Create App.
2. Name it for the clinic, for example "DMCloser Leads".
3. Use case: Other, then type Business.
4. Attach the Business Portfolio from step 1.
5. Copy the App ID and App Secret from App Settings, Basic. The App Secret is
   behind a Show button and is needed for webhook signature verification:
   `META_APP_ID`, `META_APP_SECRET`.

Done when: both values are saved to the server environment.

## 3. Add WhatsApp and note the two IDs

1. In the app dashboard, add the WhatsApp product.
2. Open WhatsApp, API Setup.

Two identifiers matter, and they are different:

| Identifier | Where | Stored in the code |
|---|---|---|
| Phone number ID | API Setup, under the number | yes, on the connection row |
| WhatsApp Business Account ID (WABA ID) | API Setup, above the number, or Business Settings, Accounts, WhatsApp Accounts | no, console only |

Write both down in the team password manager. The WABA ID is not persisted
anywhere in the application, so the console is the only record. You need it to
open Business Settings, manage templates and add payment methods.

Done when: both IDs are recorded outside the console.

## 4. System user token

1. Business Settings, Users, System users, Add.
2. Name it "DMCloser server", role Admin (or Employee with the WhatsApp assets
   assigned).
3. Assign assets: the app and the WhatsApp account.
4. Generate token, select the app, and tick:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management`
5. Choose the longest expiry offered, or no expiry if available, and copy the
   token once.

This token is what the application uses to send messages, and it is separate from
the App Secret. Keep it out of the repository.

Done when: the token is stored somewhere durable; regenerating it later is the
recovery path if it leaks.

## 5. Webhook

The server exposes the endpoint already. It accepts WhatsApp and Instagram on
separate paths.

1. In the app dashboard, WhatsApp, Configuration, Edit the webhook.
2. Callback URL: `https://app.brngt.com/api/webhooks/whatsapp`

   The server registers one path per platform, `/api/webhooks/whatsapp` and
   `/api/webhooks/instagram`. A path of `/api/webhooks/meta`, seen in older notes,
   is not routed by this codebase and would return 404; only use it if the
   deployment has a proxy rewrite pointing it at the WhatsApp handler.

3. Verify token: the value of `META_WEBHOOK_VERIFY_TOKEN`. Meta sends it as
   `hub.verify_token` and the server returns the `hub.challenge` value only when
   the token matches and `hub.mode` is `subscribe`. Any other value gets 403 and
   the console will refuse to save.
4. Save. If the console reports a failure, the causes are, in order: the token
   does not match the server environment, the server is not reachable from the
   public internet, or `/api/health` is failing on that host.
5. Subscribe to fields: `messages` and `message_status`. The first carries
   inbound messages, the second carries delivery and read receipts.
6. Send a test message to the number and confirm it appears in the DMCloser inbox
   and in Business Settings, WhatsApp, Configuration, Webhook logs.

Every POST is checked against `x-hub-signature-256`, an HMAC of the raw body
signed with `META_APP_SECRET`. A mismatch is rejected with 401 before the payload
is parsed, and a payload whose `object` is not `whatsapp_business_account` is
rejected with 400. Both show up as an empty inbox, not as a visible error in the
console, so if messages do not arrive this is the first thing to check.

Done when: a real message reaches the inbox and the webhook log shows a 200.

## 6. Templates

**Why this is not optional:** WhatsApp only lets a business send a free-form
message within 24 hours of the customer's last message. Anything business
initiated, which covers every follow-up to an inbound lead that went quiet, must
use an approved template. Without an approved template the send fails and the job
is retried then failed as a delivery error.

1. WhatsApp Manager, Message templates, Create template.
2. Language: Arabic (`ar`) if the clinic writes in Arabic, plus English if the
   staff switch. One template per language.
3. Category, chosen honestly:
   - **Utility** for appointment confirmations, reminders, order or booking
     updates. Cheaper, and what most clinic messaging is.
   - **Marketing** for offers, re-engagement, promotions.
   - **Authentication** only for one-time codes.
4. Body with placeholders such as `{{1}}` for the name and `{{2}}` for the
   appointment time, plus a sample value for each placeholder.
5. Submit. Utility templates usually approve in minutes; marketing can take
   longer and gets more scrutiny.

Common rejection reasons:

- A placeholder with no sample value, or a mismatch between the number of
  placeholders in the body and the samples supplied.
- Promotional wording submitted as Utility. "Book now, 20% off" is Marketing.
  Submitting it as Utility gets it rejected and can count against the account.
- Content that reads as vague or generic, for example a body of just "Hi {{1}}".
- No evidence that recipients opted in, or a template that implies the business
  messaged first without consent.
- URLs on a domain that does not match the verified business.
- Variables at the start or end of the message with no surrounding fixed text.

Done when: at least one Utility template is Approved in the language the clinic
actually uses.

## 7. Test number vs real number

The number that ships with API Setup is a Meta test number. It can message up to
five verified recipients, cannot be used for production, and cannot be migrated.

For the real number:

1. The number must not be active on WhatsApp or WhatsApp Business on a phone.
   Delete that account first, or the registration will fail.
2. The number must be able to receive an SMS or a call for the one-time code.
3. WhatsApp Manager, Phone numbers, Add phone number. Complete display name
   review; the display name must plausibly match the business.
4. Verify the number, then set a two-step PIN and store it.
5. Add a payment method in Business Settings, WhatsApp Accounts, Payment
   settings. Messages fail once the free tier is exhausted and no card is on file.

Done when: the number shows Connected in WhatsApp Manager and a message from an
external phone reaches the DMCloser inbox.

## Done checklist

- [ ] Business Portfolio verified.
- [ ] App created and attached to the portfolio.
- [ ] WhatsApp product added.
- [ ] Phone number ID recorded and used on the connection.
- [ ] WABA ID recorded outside the console; the code stores none.
- [ ] System user token generated with messaging, management and
      business_management scopes.
- [ ] `META_GRAPH_VERSION` set, or left at the default `v26.0`.
- [ ] `META_APP_ID` set.
- [ ] `META_APP_SECRET` set. Without it every webhook POST fails signature
      verification with 401 and the inbox stays empty.
- [ ] `META_WEBHOOK_VERIFY_TOKEN` set. Without it webhook subscription returns 403
      and the console cannot save the callback.
- [ ] `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` set, only if Instagram DMs are
      being connected. The Instagram webhook signs with the Instagram secret, not
      `META_APP_SECRET`.
- [ ] Webhook callback subscribed, fields `messages` and `message_status` ticked.
- [ ] At least one Utility template approved.
- [ ] Real number connected, PIN stored, payment method on file.
- [ ] A message from an external phone arrives in the DMCloser inbox.
