import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useStrings } from "@/context/LocaleContext";
import { settingsStrings } from "@/i18n/surfaces/settings";
import { InstagramIcon, WhatsAppIcon } from "./landing/Brand";
import { DialogShell } from "./ui/Dialog";
import Switch from "./ui/Switch";
import type { Platform, Tone } from "@/types";
import AccountSettings from "./workspace/AccountSettings";

const tones = [
  {
    value: "friendly",
    labelKey: "settings.tone.friendly.label",
    descriptionKey: "settings.tone.friendly.description",
  },
  {
    value: "premium",
    labelKey: "settings.tone.premium.label",
    descriptionKey: "settings.tone.premium.description",
  },
  {
    value: "aggressive",
    labelKey: "settings.tone.aggressive.label",
    descriptionKey: "settings.tone.aggressive.description",
  },
] as const satisfies {
  value: Tone;
  labelKey: string;
  descriptionKey: string;
}[];

export default function SettingsView() {
  const {
    state: { settings },
    dispatch,
    mode,
    live,
    update,
  } = useApp();
  const t = useStrings(settingsStrings);
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [products, setProducts] = useState(settings.productsSold);
  const [description, setDescription] = useState(settings.businessDescription);
  const [saved, setSaved] = useState(false);
  const [connection, setConnection] = useState<Platform | null>(null);
  const hasChanges =
    businessName !== settings.businessName ||
    products !== settings.productsSold ||
    description !== settings.businessDescription;
  const valid =
    !!businessName.trim() && !!products.trim() && !!description.trim();

  function editField(update: () => void) {
    setSaved(false);
    update();
  }

  return (
    <section className="settings-page" aria-labelledby="settings-heading">
      <header className="settings-page-header">
        <span className="app-section-label">{t("settings.page.eyebrow")}</span>
        <h1 id="settings-heading">{t("settings.page.title")}</h1>
        <p>{t("settings.page.subtitle")}</p>
      </header>
      <div className="settings-sections">
        <section
          className="settings-section"
          aria-labelledby="business-heading"
        >
          <div className="settings-section-intro">
            <h2 id="business-heading">{t("settings.business.title")}</h2>
            <p>{t("settings.business.description")}</p>
          </div>
          <form
            className="business-settings-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!valid) return;
              const success = await update({
                type: "UPDATE_SETTINGS",
                settings: {
                  businessName: businessName.trim(),
                  productsSold: products.trim(),
                  businessDescription: description.trim(),
                },
              });
              if (!success) return;
              setBusinessName(businessName.trim());
              setProducts(products.trim());
              setDescription(description.trim());
              setSaved(true);
            }}
          >
            <label htmlFor="business-name">
              {t("settings.business.name")}
              <input
                id="business-name"
                name="businessName"
                autoComplete="organization"
                type="text"
                required
                maxLength={100}
                value={businessName}
                onChange={(event) =>
                  editField(() => setBusinessName(event.target.value))
                }
              />
            </label>
            <label htmlFor="business-products">
              {t("settings.business.products")}
              <input
                id="business-products"
                name="products"
                type="text"
                required
                maxLength={1000}
                value={products}
                onChange={(event) =>
                  editField(() => setProducts(event.target.value))
                }
              />
            </label>
            <label htmlFor="business-description">
              {t("settings.business.context")}
              <textarea
                id="business-description"
                name="description"
                required
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(event) =>
                  editField(() => setDescription(event.target.value))
                }
                aria-describedby="business-context-help"
              />
            </label>
            <p id="business-context-help" className="app-field-help">
              {t("settings.business.help")}{" "}
              {mode === "demo"
                ? t("settings.business.helpDemo")
                : t("settings.business.helpLive")}
            </p>
            <div className="settings-save-row">
              <button
                className="app-small-button"
                type="submit"
                disabled={
                  !hasChanges ||
                  !valid ||
                  !!live?.pending ||
                  (mode === "live" && live?.snapshot.user.role !== "owner")
                }
              >
                {t("settings.business.save")}
                <Check size={14} />
              </button>
              <span role="status">
                {saved
                  ? mode === "live"
                    ? t("settings.business.savedLive")
                    : t("settings.business.savedDemo")
                  : hasChanges
                    ? t("settings.business.unsaved")
                    : mode === "live"
                      ? t("settings.business.storedLive")
                      : t("settings.business.storedDemo")}
              </span>
            </div>
          </form>
        </section>
        <section className="settings-section" aria-labelledby="tone-heading">
          <div className="settings-section-intro">
            <h2 id="tone-heading">{t("settings.tone.title")}</h2>
            <p>{t("settings.tone.description")}</p>
          </div>
          <fieldset className="settings-tone-options">
            <legend className="sr-only">{t("settings.tone.legend")}</legend>
            {tones.map((tone) => (
              <label
                key={tone.value}
                className={settings.tone === tone.value ? "is-selected" : ""}
              >
                <input
                  type="radio"
                  name="reply-tone"
                  value={tone.value}
                  checked={settings.tone === tone.value}
                  disabled={
                    !!live?.pending ||
                    (mode === "live" && live?.snapshot.user.role !== "owner")
                  }
                  onChange={() =>
                    dispatch({ type: "SET_TONE", tone: tone.value })
                  }
                />
                <span>
                  <strong>{t(tone.labelKey)}</strong>
                  <span>{t(tone.descriptionKey)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="app-field-help">{t("settings.tone.help")}</p>
        </section>
        <section
          className="settings-section"
          aria-labelledby="auto-reply-heading"
        >
          <div className="settings-toggle-row">
            <div className="settings-section-intro">
              <h2 id="auto-reply-heading">{t("settings.autoReply.title")}</h2>
              <p id="auto-reply-help">
                {mode === "demo"
                  ? t("settings.autoReply.allowDemo")
                  : t("settings.autoReply.allow")}
              </p>
            </div>
            <Switch
              label={t("settings.autoReply.switchLabel")}
              checked={settings.autoReplyEnabled}
              onChange={() => dispatch({ type: "TOGGLE_AUTO_REPLY" })}
              describedBy="auto-reply-help"
              disabled={
                !!live?.pending ||
                (mode === "live" && live?.snapshot.user.role !== "owner")
              }
            />
          </div>
          <p className="app-field-help">
            {settings.autoReplyEnabled
              ? t("settings.autoReply.enabled")
              : t("settings.autoReply.off")}{" "}
            {mode === "demo"
              ? t("settings.autoReply.demoNote")
              : t("settings.autoReply.liveNote")}
          </p>
          {settings.autoReplyEnabled && (
            <div className="confidence-control">
              <label htmlFor="confidence-threshold">
                {t("settings.autoReply.minimumConfidence")}
                <output htmlFor="confidence-threshold">
                  {settings.autoSendConfidenceThreshold}%
                </output>
              </label>
              <input
                type="range"
                id="confidence-threshold"
                min={50}
                max={100}
                step={5}
                value={settings.autoSendConfidenceThreshold}
                disabled={
                  !!live?.pending ||
                  (mode === "live" && live?.snapshot.user.role !== "owner")
                }
                onChange={(event) =>
                  dispatch({
                    type: "UPDATE_SETTINGS",
                    settings: {
                      autoSendConfidenceThreshold: Number(event.target.value),
                    },
                  })
                }
              />
              <div>
                <span>{t("settings.autoReply.moreAutomation")}</span>
                <span>{t("settings.autoReply.moreReview")}</span>
              </div>
            </div>
          )}
        </section>
        {mode === "live" && (
          <section
            className="settings-section"
            aria-labelledby="analytics-heading"
          >
            <div className="settings-toggle-row">
              <div className="settings-section-intro">
                <h2 id="analytics-heading">{t("settings.analytics.title")}</h2>
                <p id="analytics-help">{t("settings.analytics.description")}</p>
              </div>
              <Switch
                label={t("settings.analytics.consent")}
                checked={settings.analyticsConsent === true}
                describedBy="analytics-help"
                disabled={
                  !!live?.pending || live?.snapshot.user.role !== "owner"
                }
                onChange={() =>
                  void update({
                    type: "UPDATE_SETTINGS",
                    settings: {
                      analyticsConsent: settings.analyticsConsent !== true,
                    },
                  })
                }
              />
            </div>
          </section>
        )}
        {mode === "demo" && (
          <>
            {" "}
            <section
              className="settings-section"
              aria-labelledby="accounts-heading"
            >
              <div className="settings-section-intro">
                <h2 id="accounts-heading">{t("settings.accounts.title")}</h2>
                <p>{t("settings.accounts.description")}</p>
              </div>
              <div className="account-connections">
                {(["instagram", "whatsapp"] as const).map((platform) => (
                  <div className="account-row" key={platform}>
                    <span className="account-icon">
                      {platform === "instagram" ? (
                        <InstagramIcon />
                      ) : (
                        <WhatsAppIcon />
                      )}
                    </span>
                    <div>
                      <strong>
                        {platform === "instagram" ? "Instagram" : "WhatsApp"}
                      </strong>
                      <span>{t("settings.accounts.notConnected")}</span>
                    </div>
                    <button
                      className="app-text-button"
                      onClick={() => setConnection(platform)}
                      aria-label={t("settings.accounts.viewSetupLabel", {
                        platform:
                          platform === "instagram" ? "Instagram" : "WhatsApp",
                      })}
                    >
                      {t("settings.accounts.viewSetup")}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {mode === "live" && <AccountSettings />}
      </div>
      {connection && (
        <DialogShell
          title={t("settings.accounts.dialogTitle", {
            platform: connection === "instagram" ? "Instagram" : "WhatsApp",
          })}
          onClose={() => setConnection(null)}
        >
          <div className="legal-copy">
            <p>{t("settings.accounts.demoNotice")}</p>
            <h3>{t("settings.accounts.liveHeading")}</h3>
            <ul>
              <li>
                {t("settings.accounts.eligibleAccount", {
                  kind: t(
                    connection === "instagram"
                      ? "settings.accounts.kind.instagram"
                      : "settings.accounts.kind.whatsapp",
                  ),
                })}
              </li>
              <li>{t("settings.accounts.metaApplication")}</li>
              <li>{t("settings.accounts.secureBackend")}</li>
            </ul>
            <p>
              {t("settings.accounts.neverPaste")}
              <a href="/workspace" className="app-text-button">
                {t("settings.accounts.createWorkspace")}
                <ArrowUpRight size={14} />
              </a>
            </p>
            <button
              className="closer-button closer-button-primary"
              onClick={() => setConnection(null)}
            >
              {t("settings.accounts.backToSettings")}
              <Check size={15} />
            </button>
          </div>
        </DialogShell>
      )}
    </section>
  );
}
