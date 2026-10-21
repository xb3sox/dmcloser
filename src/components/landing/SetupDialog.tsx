import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useStrings } from "@/context/LocaleContext";
import { landingStrings } from "@/i18n/surfaces/landing";
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
  const t = useStrings(landingStrings);

  return (
    <DialogShell title={t("landing.setup.title")} onClose={onClose}>
      <p className="dialog-description">
        {t("landing.setup.description")}
      </p>
      {plan && (
        <p className="dialog-plan">
          {t("landing.setup.planBefore")} <strong>{plan}</strong>{" "}
          {t("landing.setup.planAfter")}
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
          {t("landing.setup.businessName")}
          <input
            id="setup-business"
            name="business"
            autoComplete="organization"
            placeholder={t("landing.setup.businessPlaceholder")}
            maxLength={100}
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            required
            data-autofocus
          />
        </label>
        <label htmlFor="setup-products">
          {t("landing.setup.products")}
          <textarea
            id="setup-products"
            name="products"
            placeholder={t("landing.setup.productsPlaceholder")}
            rows={2}
            maxLength={1000}
            value={products}
            onChange={(event) => setProducts(event.target.value)}
            required
          />
        </label>
        <label htmlFor="setup-tone">
          {t("landing.setup.tone")}
          <select
            id="setup-tone"
            name="tone"
            value={tone}
            onChange={(event) => setTone(event.target.value as Tone)}
          >
            <option value="friendly">{t("landing.setup.toneFriendly")}</option>
            <option value="premium">{t("landing.setup.tonePremium")}</option>
            <option value="aggressive">{t("landing.setup.toneAggressive")}</option>
          </select>
        </label>
        <button
          type="submit"
          className="closer-button closer-button-primary"
          disabled={!businessName.trim() || !products.trim()}
        >
          {t("landing.setup.submit")}
          <ArrowRight size={16} />
        </button>
        <p className="setup-note">{t("landing.setup.note")}</p>
      </form>
      <div className="workspace-create-account">
        <span>{t("landing.setup.readyPrompt")}</span>
        <a href="/workspace">
          {t("landing.setup.createLink")}
          <ArrowRight size={14} />
        </a>
      </div>
    </DialogShell>
  );
}
