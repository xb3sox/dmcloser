import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  isLocale,
  localeDirection,
  localeTag,
  type Locale,
  type MessageSurface,
} from "@/i18n";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  /** Display-only formatters. The server keeps its own en-US formatting. */
  formatDate: (value: number | string | Date) => string;
  formatDateTime: (value: number | string | Date) => string;
  formatTime: (value: number | string | Date) => string;
  formatMonthDay: (value: number | string | Date) => string;
  formatNumber: (value: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const storageKey = "dmcloser-locale";

// Module-level caches for Intl formatters to avoid expensive re-instantiation (~30x–50x faster)
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

function getDateTimeFormatter(
  tag: string,
  optionsKey: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${tag}:${optionsKey}`;
  let formatter = dateTimeFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, options);
    dateTimeFormatterCache.set(key, formatter);
  }
  return formatter;
}

function getNumberFormatter(tag: string): Intl.NumberFormat {
  let formatter = numberFormatterCache.get(tag);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag);
    numberFormatterCache.set(tag, formatter);
  }
  return formatter;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(storageKey);
    if (isLocale(stored)) return stored;
  } catch {
    // Fall back to English when local storage is unavailable.
  }
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const dir = localeDirection[locale];

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dir;
    try {
      localStorage.setItem(storageKey, locale);
    } catch {
      // Locale switching does not depend on persistent storage.
    }
  }, [locale, dir]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  // Default options, so the English output is identical to the browser's
  // `toLocaleDateString()` — only the locale changes.
  const formatDate = useCallback(
    (value: number | string | Date) =>
      getDateTimeFormatter(localeTag[locale], "default").format(new Date(value)),
    [locale],
  );
  const formatDateTime = useCallback(
    (value: number | string | Date) =>
      getDateTimeFormatter(localeTag[locale], "dt_med_short", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value)),
    [locale],
  );
  const formatTime = useCallback(
    (value: number | string | Date) =>
      getDateTimeFormatter(localeTag[locale], "t_2d", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value)),
    [locale],
  );
  const formatMonthDay = useCallback(
    (value: number | string | Date) =>
      getDateTimeFormatter(localeTag[locale], "md_short_num", {
        month: "short",
        day: "numeric",
      }).format(new Date(value)),
    [locale],
  );
  const formatNumber = useCallback(
    (value: number) => getNumberFormatter(localeTag[locale]).format(value),
    [locale],
  );

  return (
    <LocaleContext.Provider
      value={{
        locale,
        dir,
        setLocale,
        formatDate,
        formatDateTime,
        formatTime,
        formatMonthDay,
        formatNumber,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/**
 * Typed lookup for one message surface. Every entry carries both locales, so
 * a missing translation fails the type check instead of falling back silently.
 */
export function useStrings<T extends MessageSurface>(
  surface: T,
): (key: keyof T & string, values?: Record<string, string | number>) => string {
  const { locale } = useLocale();
  return useCallback(
    (key: keyof T & string, values?: Record<string, string | number>) => {
      const raw = surface[key]?.[locale] ?? surface[key]?.en ?? key;
      if (!values) return raw;
      return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
        values[name] === undefined ? match : String(values[name]),
      );
    },
    [surface, locale],
  );
}
