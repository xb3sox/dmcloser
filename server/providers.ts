import type { Config } from "./config.ts";
import { HttpError } from "./security.ts";

export interface IncomingMessageMedia {
  id?: string;
  url?: string;
  mimeType?: string;
  filename?: string;
  type?: string;
}

export interface IncomingMessage {
  platform: "instagram" | "whatsapp";
  accountId: string;
  externalId: string;
  providerId: string;
  name: string;
  text: string;
  timestamp: number;
  reviewOnly: boolean;
  media?: IncomingMessageMedia;
}
export interface DeliveryUpdate {
  platform: "instagram" | "whatsapp";
  accountId: string;
  providerId: string;
  status: string;
  localId?: string;
}

export const ALLOWED_MEDIA_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
export const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function normalizeWebhook(
  platform: "instagram" | "whatsapp",
  payload: any,
): { messages: IncomingMessage[]; statuses: DeliveryUpdate[] } {
  const messages: IncomingMessage[] = [];
  const statuses: DeliveryUpdate[] = [];
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    if (platform === "instagram") {
      for (const event of Array.isArray(entry.messaging)
        ? entry.messaging
        : []) {
        const message = event?.message;
        if (
          message?.is_echo ||
          !message?.mid ||
          !event?.sender?.id ||
          !entry.id
        )
          continue;
        const attachment = Array.isArray(message.attachments)
          ? message.attachments[0]
          : null;
        const media: IncomingMessageMedia | undefined = attachment
          ? {
              id: attachment.id || attachment.payload?.id,
              url: attachment.payload?.url,
              type: attachment.type,
              mimeType:
                attachment.type === "image"
                  ? "image/jpeg"
                  : attachment.type === "video"
                    ? "video/mp4"
                    : undefined,
            }
          : undefined;
        messages.push({
          platform,
          accountId: String(entry.id),
          externalId: String(event.sender.id),
          providerId: String(message.mid),
          name: `Instagram ${String(event.sender.id).slice(-6)}`,
          text:
            typeof message.text === "string"
              ? message.text.slice(0, 4000)
              : "[Media message: review in Instagram]",
          timestamp: Number(event.timestamp) || Date.now(),
          reviewOnly: typeof message.text !== "string",
          media,
        });
      }
    } else {
      for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
        const value = change?.value;
        const accountId = value?.metadata?.phone_number_id;
        if (!accountId) continue;
        for (const message of Array.isArray(value.messages)
          ? value.messages
          : []) {
          if (!message?.id || !message?.from) continue;
          const contact = (
            Array.isArray(value.contacts) ? value.contacts : []
          ).find((item: any) => item?.wa_id === message.from);
          const isText = message.type === "text";
          const mediaObj = !isText ? message[message.type] : undefined;
          const media: IncomingMessageMedia | undefined = mediaObj
            ? {
                id: mediaObj.id,
                url: mediaObj.url,
                mimeType: mediaObj.mime_type,
                filename: mediaObj.filename,
                type: message.type,
              }
            : undefined;
          messages.push({
            platform,
            accountId: String(accountId),
            externalId: String(message.from),
            providerId: String(message.id),
            name: String(contact?.profile?.name || message.from).slice(0, 100),
            text:
              isText && typeof message.text?.body === "string"
                ? message.text.body.slice(0, 4000)
                : "[Media message: review in WhatsApp]",
            timestamp: Number(message.timestamp) * 1000 || Date.now(),
            reviewOnly: !isText,
            media,
          });
        }
        for (const status of Array.isArray(value.statuses)
          ? value.statuses
          : [])
          if (
            status?.id &&
            ["sent", "delivered", "read", "failed"].includes(status.status)
          )
            statuses.push({
              platform,
              accountId: String(accountId),
              providerId: String(status.id),
              status: status.status,
              localId: status.biz_opaque_callback_data,
            });
      }
    }
  }
  return { messages, statuses };
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public retrySafe = false,
    public ambiguous = false,
    public authError = false,
  ) {
    super(message);
  }
}

export class MetaProvider {
  constructor(
    private config: Config,
    private fetcher: typeof fetch = fetch,
  ) {}

  private async json(
    url: string,
    options: RequestInit,
    sending = false,
  ): Promise<any> {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new ProviderError(
        sending
          ? "Delivery outcome is unknown. Check the provider inbox before sending again."
          : "The provider could not be reached. Please try again.",
        !sending,
        sending,
      );
    }
    if (!response.ok) {
      if (response.status === 429)
        throw new ProviderError(
          "Provider rate limit. Delivery will retry safely.",
          true,
        );
      if (response.status >= 500)
        throw new ProviderError(
          "Provider unavailable; delivery needs reconciliation.",
          !sending,
          sending,
        );
      if ([401, 403].includes(response.status))
        throw new ProviderError(
          "Messaging permission expired or was denied. Reconnect this account.",
          false,
          false,
          true,
        );
      throw new ProviderError(
        "The provider rejected this request. Check account permissions and the messaging window.",
      );
    }
    try {
      return await response.json();
    } catch {
      throw new ProviderError(
        "Provider returned an invalid response.",
        false,
        sending,
      );
    }
  }

  async inspectWhatsApp(phoneId: string, token: string) {
    const profile = await this.json(
      `https://graph.facebook.com/${this.config.graphVersion}/${encodeURIComponent(phoneId)}?fields=id,display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (String(profile.id) !== phoneId)
      throw new HttpError(400, "The phone number ID could not be verified.");
    return String(
      profile.verified_name || profile.display_phone_number || phoneId,
    );
  }

  async exchangeInstagram(code: string) {
    const body = new URLSearchParams({
      client_id: this.config.instagramAppId!,
      client_secret: this.config.instagramSecret!,
      grant_type: "authorization_code",
      redirect_uri: `${this.config.publicUrl}/api/integrations/instagram/callback`,
      code,
    });
    const short = await this.json(
      "https://api.instagram.com/oauth/access_token",
      { method: "POST", body },
    );
    if (!short.access_token)
      throw new HttpError(502, "Instagram did not return an access token.");
    const query = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: this.config.instagramSecret!,
      access_token: short.access_token,
    });
    const long = await this.json(
      `https://graph.instagram.com/access_token?${query}`,
      {},
    );
    if (!long.access_token)
      throw new HttpError(502, "Instagram token exchange failed.");
    const profile = await this.json(
      `https://graph.instagram.com/${this.config.graphVersion}/me?fields=user_id,username`,
      { headers: { Authorization: `Bearer ${long.access_token}` } },
    );
    const accountId = String(
      profile.user_id || profile.id || short.user_id || "",
    );
    if (!/^\d+$/.test(accountId))
      throw new HttpError(502, "Instagram account ID could not be verified.");
    await this.json(
      `https://graph.instagram.com/${this.config.graphVersion}/${accountId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${long.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscribed_fields: ["messages", "messaging_seen"],
        }),
      },
    );
    return {
      accountId,
      label: String(profile.username || accountId),
      token: String(long.access_token),
      expiresAt: Date.now() + Number(long.expires_in || 5184000) * 1000,
    };
  }

  async refreshInstagram(token: string) {
    const value = await this.json(
      `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token })}`,
      {},
    );
    if (!value.access_token) throw new Error("Instagram token refresh failed.");
    return {
      token: String(value.access_token),
      expiresAt: Date.now() + Number(value.expires_in || 5184000) * 1000,
    };
  }

  async send(
    platform: string,
    accountId: string,
    recipient: string,
    token: string,
    text: string,
    localId: string,
  ) {
    if (platform === "instagram" && Buffer.byteLength(text, "utf8") > 1000)
      throw new ProviderError(
        "Instagram replies must be 1000 UTF-8 bytes or less.",
      );
    if (text.length > 4096)
      throw new ProviderError(
        "WhatsApp replies must be 4096 characters or less.",
      );
    const body =
      platform === "instagram"
        ? { recipient: { id: recipient }, message: { text } }
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient,
            type: "text",
            text: { preview_url: false, body: text },
            biz_opaque_callback_data: localId,
          };
    const host =
      platform === "instagram" ? "graph.instagram.com" : "graph.facebook.com";
    const result = await this.json(
      `https://${host}/${this.config.graphVersion}/${encodeURIComponent(accountId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      true,
    );
    const id =
      platform === "instagram" ? result.message_id : result.messages?.[0]?.id;
    if (!id)
      throw new ProviderError(
        "Provider accepted a request without a receipt. Check the provider inbox.",
        false,
        true,
      );
    return String(id);
  }

  async downloadMedia(
    media: IncomingMessageMedia,
    token: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename?: string }> {
    let downloadUrl = media.url;
    let mimeType = media.mimeType;
    let filename = media.filename;

    if (!downloadUrl && media.id) {
      const meta = await this.json(
        `https://graph.facebook.com/${this.config.graphVersion}/${encodeURIComponent(media.id)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      downloadUrl = meta.url;
      if (meta.mime_type) mimeType = meta.mime_type;
      if (meta.file_size && Number(meta.file_size) > MAX_MEDIA_SIZE_BYTES) {
        throw new ProviderError(
          `Media file exceeds maximum allowed size of 10MB.`,
        );
      }
    }

    if (!downloadUrl) {
      throw new ProviderError("Media URL could not be resolved.");
    }

    if (mimeType && !ALLOWED_MEDIA_MIMES.has(mimeType)) {
      throw new ProviderError(`Unsupported media MIME type: ${mimeType}`);
    }

    let response: Response;
    try {
      response = await this.fetcher(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ProviderError("Failed to download media file from provider.");
    }

    if (!response.ok) {
      throw new ProviderError(
        `Provider rejected media download with status ${response.status}.`,
      );
    }

    const headerMime = response.headers.get("content-type")?.split(";")[0].trim();
    if (headerMime) mimeType = headerMime;

    if (!mimeType || !ALLOWED_MEDIA_MIMES.has(mimeType)) {
      throw new ProviderError(
        `Unsupported media MIME type: ${mimeType || "unknown"}`,
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_MEDIA_SIZE_BYTES) {
      throw new ProviderError(
        `Media file exceeds maximum allowed size of 10MB.`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_MEDIA_SIZE_BYTES) {
      throw new ProviderError(
        `Media file exceeds maximum allowed size of 10MB.`,
      );
    }

    return { buffer, mimeType, filename };
  }
}
