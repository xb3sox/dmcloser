import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { DialogShell } from "../ui/Dialog";

export default function DevelopmentSimulator() {
  const { live } = useApp();
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
        Test an inbound message
      </button>
      {open && (
        <DialogShell
          title="Test your inbox pipeline"
          onClose={() => setOpen(false)}
        >
          <p className="dialog-description">
            Development only. This writes a message to your database and
            exercises the AI job pipeline. It cannot send to a real account.
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
                    : "Please try again.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            <label htmlFor="simulate-name">
              Contact name
              <input
                id="simulate-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label htmlFor="simulate-channel">
              Channel
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
              Inbound message
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
              Add test message
              <ArrowRight size={15} />
            </button>
          </form>
        </DialogShell>
      )}
    </>
  );
}
