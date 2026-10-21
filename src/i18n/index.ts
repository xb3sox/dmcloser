export type Locale = "en" | "ar";

export const locales: Locale[] = ["en", "ar"];

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

// Saudi Arabia uses Western Arabic numerals (0-9), so the numbering system is
// pinned to latn instead of the Arabic-Indic default of the "ar" locale.
export const localeTag: Record<Locale, string> = {
  en: "en-US",
  ar: "ar-SA-u-nu-latn",
};

export const localeName: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/**
 * One message surface: a flat key map where every entry carries both
 * locales. A missing translation is a compile error, not a silent fallback.
 */
export type MessageSurface = Record<string, { en: string; ar: string }>;

export const isLocale = (value: unknown): value is Locale =>
  value === "en" || value === "ar";
