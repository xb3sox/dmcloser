import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { InstagramIcon, WhatsAppIcon } from "./landing/Brand";
import { DialogShell } from "./ui/Dialog";
import Switch from "./ui/Switch";
import type { Platform, Tone } from "@/types";
import AccountSettings from "./workspace/AccountSettings";

const tones: { value: Tone; label: string; description: string }[] = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, conversational, and approachable.",
  },
  {
    value: "premium",
    label: "Premium",
    description: "Thoughtful, polished, and professional.",
  },
  {
    value: "aggressive",
    label: "Sales-focused",
    description: "Direct, clear, and focused on the next step.",
  },
];

export default function SettingsView() {
  const {
    state: { settings },
    dispatch,
    mode,
    live,
    update,
  } = useApp();
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
        <span className="app-section-label">Make it yours</span>
        <h1 id="settings-heading">Settings</h1>
        <p>Your business. Your voice. Your control.</p>
      </header>
      <div className="settings-sections">
        <section
          className="settings-section"
          aria-labelledby="business-heading"
        >
          <div className="settings-section-intro">
            <h2 id="business-heading">Business information</h2>
            <p>The context behind a more helpful reply.</p>
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
              Business name
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
              What do you sell?
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
              Business context
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
              Add approved facts such as products, pricing, and delivery
              policies.{" "}
              {mode === "demo"
                ? "Demo suggestions are examples, not live AI."
                : "Uncertain questions stay with you; only approved facts are used automatically."}
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
                Save changes
                <Check size={14} />
              </button>
              <span role="status">
                {saved
                  ? mode === "live"
                    ? "Changes saved to your workspace."
                    : "Changes saved in this browser."
                  : hasChanges
                    ? "You have unsaved changes."
                    : mode === "live"
                      ? "Saved to your workspace."
                      : "Saved in this browser."}
              </span>
            </div>
          </form>
        </section>
        <section className="settings-section" aria-labelledby="tone-heading">
          <div className="settings-section-intro">
            <h2 id="tone-heading">Reply tone</h2>
            <p>Sound like yourself, without writing every word.</p>
          </div>
          <fieldset className="settings-tone-options">
            <legend className="sr-only">Choose your reply tone</legend>
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
                  <strong>{tone.label}</strong>
                  <span>{tone.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="app-field-help">
            Tone changes are saved automatically and applied to suggested
            replies.
          </p>
        </section>
        <section
          className="settings-section"
          aria-labelledby="auto-reply-heading"
        >
          <div className="settings-toggle-row">
            <div className="settings-section-intro">
              <h2 id="auto-reply-heading">Auto-reply</h2>
              <p id="auto-reply-help">
                Allow high-confidence {mode === "demo" ? "demo " : ""}replies
                for contacts with auto-send enabled.
              </p>
            </div>
            <Switch
              label="Workspace auto-reply"
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
              ? "Enabled. Turn on auto-send in a conversation to try it."
              : "Off. Suggested replies always wait for your approval."}{" "}
            {mode === "demo"
              ? "No real messages are sent."
              : "Live replies require both switches, safe grounded content, and an open provider window."}
          </p>
          {settings.autoReplyEnabled && (
            <div className="confidence-control">
              <label htmlFor="confidence-threshold">
                Minimum confidence
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
                <span>More automation</span>
                <span>More review</span>
              </div>
            </div>
          )}
        </section>
        {mode === "demo" && (
          <>
            {" "}
            <section
              className="settings-section"
              aria-labelledby="accounts-heading"
            >
              <div className="settings-section-intro">
                <h2 id="accounts-heading">Messaging accounts</h2>
                <p>
                  Explore the setup requirements. Live connections are not
                  configured.
                </p>
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
                      <span>Not connected</span>
                    </div>
                    <button
                      className="app-text-button"
                      onClick={() => setConnection(platform)}
                      aria-label={`View ${platform === "instagram" ? "Instagram" : "WhatsApp"} setup`}
                    >
                      View setup
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
          title={`${connection === "instagram" ? "Instagram" : "WhatsApp"} setup`}
          onClose={() => setConnection(null)}
        >
          <div className="legal-copy">
            <p>
              This demo does not connect to a real messaging account. Your
              sample inbox will continue to work without a connection.
            </p>
            <h3>For a live connection</h3>
            <ul>
              <li>
                An eligible{" "}
                {connection === "instagram"
                  ? "Instagram professional"
                  : "WhatsApp Business"}{" "}
                account.
              </li>
              <li>
                A configured Meta application with approved messaging
                permissions.
              </li>
              <li>
                A secure backend, verified webhooks, and server-side access
                tokens.
              </li>
            </ul>
            <p>
              Never paste access tokens or account passwords into this demo.
              <a href="/workspace" className="app-text-button">
                Create a server-backed workspace
                <ArrowUpRight size={14} />
              </a>
            </p>
            <button
              className="closer-button closer-button-primary"
              onClick={() => setConnection(null)}
            >
              Back to settings
              <Check size={15} />
            </button>
          </div>
        </DialogShell>
      )}
    </section>
  );
}
