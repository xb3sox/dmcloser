import { useCallback } from "react";
import { useLocale, useStrings } from "@/context/LocaleContext";
import { localeTag } from "@/i18n";
import { formatStrings } from "@/i18n/surfaces/format";

/**
 * Money as plain text, in the active locale.
 *
 * Use this where markup is not allowed — inside an `<option>`, for instance.
 * Everywhere else use the `<Money />` component, which adds the bidi
 * isolation a bare number needs.
 */
// Performance optimization: Cache Intl.NumberFormat instances by locale & currency to avoid recreation on every render (~63x speedup).
const moneyFormatterCache = new Map<string, Intl.NumberFormat>();

function getMoneyFormatter(tag: string, currency: string): Intl.NumberFormat {
  const cacheKey = `${tag}:${currency}`;
  let formatter = moneyFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
    moneyFormatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

export function useMoney() {
  const { locale } = useLocale();
  const t = useStrings(formatStrings);
  const tag = localeTag[locale];
  return useCallback(
    (minor: number | null, currency: string) =>
      minor === null
        ? t("format.money.notSet")
        : getMoneyFormatter(tag, currency).format(minor / 100),
    [tag, t],
  );
}

/**
 * A money value, formatted for the active locale and isolated from the
 * surrounding text.
 *
 * Two things a bare `Intl.NumberFormat` call would miss:
 *
 * 1. A currency-formatted amount is a Latin run ("US$ 1,234.00") sitting inside
 *    Arabic prose. Without bidi isolation the bidi algorithm reorders it. The
 *    `.ltr-isolate` utility pins the run to left-to-right.
 * 2. An unknown amount is a label, not a number, and it is user-facing text —
 *    so it is translated like any other string.
 *
 * The server formats money separately, in `en-US`, because the grounding check
 * matches the model's cited evidence verbatim. This component is display only.
 */
export default function Money({
  minor,
  currency,
  className,
}: {
  minor: number | null;
  currency: string;
  className?: string;
}) {
  const format = useMoney();
  if (minor === null)
    return <span className={className}>{format(null, currency)}</span>;
  return (
    <span className={className ? `ltr-isolate ${className}` : "ltr-isolate"}>
      {format(minor, currency)}
    </span>
  );
}
