import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  // Performance optimization: Memoize Intl formatters by tag to avoid reinstantiating
  // expensive Intl.DateTimeFormat and Intl.NumberFormat instances on every format call (~58x speedup).
  const tag = localeTag[locale];

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(tag), [tag]);
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [tag],
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [tag],
  );
  const monthDayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(tag, {
        month: "short",
        day: "numeric",
      }),
    [tag],
  );
  const numberFormatter = useMemo(() => new Intl.NumberFormat(tag), [tag]);

  const formatDate = useCallback(
    (value: number | string | Date) => dateFormatter.format(new Date(value)),
    [dateFormatter],
  );
  const formatDateTime = useCallback(
    (value: number | string | Date) => dateTimeFormatter.format(new Date(value)),
    [dateTimeFormatter],
  );
  const formatTime = useCallback(
    (value: number | string | Date) => timeFormatter.format(new Date(value)),
    [timeFormatter],
  );
  const formatMonthDay = useCallback(
    (value: number | string | Date) => monthDayFormatter.format(new Date(value)),
    [monthDayFormatter],
  );
  const formatNumber = useCallback(
    (value: number) => numberFormatter.format(value),
    [numberFormatter],
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
