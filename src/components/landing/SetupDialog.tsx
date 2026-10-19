import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Tone } from "@/types";
import { DialogShell } from "@/components/ui/Dialog";

export { DialogShell } from "@/components/ui/Dialog";

export default function SetupDialog({
  plan,
  onClose,
  onOpenApp,
}: {
  plan: string | null;
  onClose: () => void;
  onOpenApp: () => void;
}) {
  const { state, dispatch } = useApp();
  const [businessName, setBusinessName] = useState("");
  const [products, setProducts] = useState("");
  const [tone, setTone] = useState<Tone>(state.settings.tone);

  return (
    <DialogShell title="Meet your new closer." onClose={onClose}>
      <p className="dialog-description">
        A little about your business. A lot less time in your inbox.
      </p>
      {plan && (
        <p className="dialog-plan">
          You're exploring the <strong>{plan}</strong> plan. Start with a free
          demo.
        </p>
      )}
      <form
        className="setup-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!businessName.trim() || !products.trim()) return;
          dispatch({
            type: "UPDATE_SETTINGS",
            settings: {
              businessName: businessName.trim(),
              productsSold: products.trim(),
              businessDescription: `${businessName.trim()} sells ${products.trim()}.`,
              tone,
            },
          });
          onOpenApp();
        }}
      >
        <label htmlFor="setup-business">
          Business name
          <input
            id="setup-business"
            name="business"
            autoComplete="organization"
            placeholder="e.g. Maison Studio"
            maxLength={100}
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            required
            data-autofocus
          />
        </label>
        <label htmlFor="setup-products">
          What do you sell?
          <textarea
            id="setup-products"
            name="products"
            placeholder="e.g. Thoughtfully made linen clothing and home essentials"
            rows={2}
            maxLength={1000}
            value={products}
            onChange={(event) => setProducts(event.target.value)}
            required
          />
        </label>
        <label htmlFor="setup-tone">
          Your reply tone
          <select
            id="setup-tone"
            name="tone"
            value={tone}
            onChange={(event) => setTone(event.target.value as Tone)}
          >
            <option value="friendly">Friendly and approachable</option>
            <option value="premium">Premium and polished</option>
            <option value="aggressive">Direct and sales-focused</option>
          </select>
        </label>
        <button
          type="submit"
          className="closer-button closer-button-primary"
          disabled={!businessName.trim() || !products.trim()}
        >
          Create demo workspace
          <ArrowRight size={16} />
        </button>
        <p className="setup-note">
          No credit card or real account connection. Your workspace is saved in
          this browser; no paid subscription is created.
        </p>
      </form>
      <div className="workspace-create-account">
        <span>Ready for your own inbox?</span>
        <a href="/workspace">
          Create a private workspace
          <ArrowRight size={14} />
        </a>
      </div>
    </DialogShell>
  );
}
