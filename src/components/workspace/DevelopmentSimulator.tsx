import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useStrings } from "@/context/LocaleContext";
import { workspaceStrings } from "@/i18n/surfaces/workspace";
import { DialogShell } from "../ui/Dialog";

export default function DevelopmentSimulator() {
  const { live } = useApp();
  const t = useStrings(workspaceStrings);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Alex");
  const [text, setText] = useState("Hi! Can you tell me about your products?");
  const [platform, setPlatform] = useState("instagram");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (
    !live?.snapshot.capabilities.simulator ||
    live.snapshot.user.role !== "owner"
  )
    return null;
  return (
    <>
      <button className="app-text-button" onClick={() => setOpen(true)}>
        <Plus size={14} />
        {t("workspace.simulator.open")}
      </button>
      {open && (
        <DialogShell
          title={t("workspace.simulator.title")}
          onClose={() => setOpen(false)}
        >
          <p className="dialog-description">
            {t("workspace.simulator.description")}
          </p>
          <form
            className="setup-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setPending(true);
              try {
                await live.request("/development/inbound", {
                  method: "POST",
                  body: { name, text, platform },
                });
                await live.refresh();
                setOpen(false);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : t("workspace.common.tryAgain"),
                );
              } finally {
                setPending(false);
              }
            }}
          >
            <label htmlFor="simulate-name">
              {t("workspace.simulator.field.name")}
              <input
                id="simulate-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label htmlFor="simulate-channel">
              {t("workspace.simulator.field.channel")}
              <select
                id="simulate-channel"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
              >
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label htmlFor="simulate-message">
              {t("workspace.simulator.field.message")}
              <textarea
                id="simulate-message"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                maxLength={4000}
                required
              />
            </label>
            {error && (
              <p role="alert" className="workspace-form-error">
                {error}
              </p>
            )}
            <button
              className="closer-button closer-button-primary"
              disabled={pending}
            >
              {t("workspace.simulator.submit")}
              <ArrowRight size={15} />
            </button>
          </form>
        </DialogShell>
      )}
    </>
  );
}
