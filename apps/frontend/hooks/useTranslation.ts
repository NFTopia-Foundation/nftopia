"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import enCommon from "@/locales/en/common.json";
import frCommon from "@/locales/fr/common.json";

// Type definitions
type Locale = "en" | "fr";
type Namespace = "common";

interface TranslationData {
  [key: string]: any;
}

interface UseTranslationReturn {
  t: (key: string, options?: TranslationOptions) => string;
  locale: Locale;
  locales: Locale[];
  changeLocale: (newLocale: Locale) => void;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  formatRelativeTime: (date: Date | string) => string;
}

interface TranslationOptions {
  count?: number;
  [key: string]: any;
}

// Translation data mapping
const translations: Record<Locale, Record<Namespace, TranslationData>> = {
  en: {
    common: enCommon,
  },
  fr: {
    common: frCommon,
  },
};

// Pluralization rules
const pluralRules: Record<Locale, (count: number) => number> = {
  en: (count: number) => (count === 1 ? 0 : 1),
  fr: (count: number) => (count === 0 || count === 1 ? 0 : 1),
};

// Number formatting
const numberFormatters: Record<Locale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-US"),
  fr: new Intl.NumberFormat("fr-FR"),
};

// Currency formatting
const currencyFormatters: Record<Locale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  fr: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }),
};

// Date formatting
const dateFormatters: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-US"),
  fr: new Intl.DateTimeFormat("fr-FR"),
};

// Relative time formatting
const relativeTimeFormatters: Record<Locale, Intl.RelativeTimeFormat> = {
  en: new Intl.RelativeTimeFormat("en", { numeric: "auto" }),
  fr: new Intl.RelativeTimeFormat("fr", { numeric: "auto" }),
};

export function useTranslation(): UseTranslationReturn {
  const router = useRouter();
  const pathname = usePathname();

  // Extract locale from pathname
  const locale = useMemo(() => {
    const pathSegments = pathname?.split("/") || [];
    const pathLocale = pathSegments[1];
    return pathLocale === "en" || pathLocale === "fr"
      ? (pathLocale as Locale)
      : "en";
  }, [pathname]);

  const locales: Locale[] = ["en", "fr"];

  // Get translation function
  const t = useCallback(
    (key: string, options: TranslationOptions = {}): string => {
      const { count, ...interpolationOptions } = options;

      // Split key by dot notation (e.g., "navigation.explore")
      const keys = key.split(".");
      let translation: any = translations[locale as Locale]?.common;

      // Navigate through the nested object
      for (const k of keys) {
        if (
          translation &&
          typeof translation === "object" &&
          k in translation
        ) {
          translation = translation[k];
        } else {
          // Fallback to English if translation not found
          let fallbackTranslation: any = translations.en?.common;
          for (const fallbackKey of keys) {
            if (
              fallbackTranslation &&
              typeof fallbackTranslation === "object" &&
              fallbackKey in fallbackTranslation
            ) {
              fallbackTranslation = fallbackTranslation[fallbackKey];
            } else {
              return key; // Return key if no translation found
            }
          }
          translation = fallbackTranslation;
          break;
        }
      }

      // Handle pluralization
      if (
        count !== undefined &&
        typeof translation === "object" &&
        translation.one &&
        translation.other
      ) {
        const pluralIndex = pluralRules[locale as Locale](count);
        translation = pluralIndex === 0 ? translation.one : translation.other;
      }

      // Handle interpolation
      if (typeof translation === "string") {
        return translation.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return interpolationOptions[key] !== undefined
            ? String(interpolationOptions[key])
            : match;
        });
      }

      return typeof translation === "string" ? translation : key;
    },
    [locale]
  );

  // Change locale function
  const changeLocale = useCallback(
    (newLocale: Locale) => {
      // Remove current locale from pathname and add new one
      const pathSegments = pathname?.split("/") || [];
      const currentLocale = pathSegments[1];

      if (currentLocale === "en" || currentLocale === "fr") {
        // Replace locale in path
        pathSegments[1] = newLocale;
      } else {
        // Insert locale at beginning
        pathSegments.splice(1, 0, newLocale);
      }

      const newPath = pathSegments.join("/");
      router.push(newPath);
    },
    [router, pathname]
  );

  // Format number
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      const formatter = new Intl.NumberFormat(locale, options);
      return formatter.format(value);
    },
    [locale]
  );

  // Format currency
  const formatCurrency = useCallback(
    (value: number, currency?: string): string => {
      const defaultCurrency = locale === "fr" ? "EUR" : "USD";
      const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || defaultCurrency,
      });
      return formatter.format(value);
    },
    [locale]
  );

  // Format date
  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const formatter = new Intl.DateTimeFormat(locale, options);
      return formatter.format(dateObj);
    },
    [locale]
  );

  // Format relative time
  const formatRelativeTime = useCallback(
    (date: Date | string): string => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const now = new Date();
      const diffInSeconds = Math.floor(
        (now.getTime() - dateObj.getTime()) / 1000
      );

      const formatter = relativeTimeFormatters[locale as Locale];

      if (Math.abs(diffInSeconds) < 60) {
        return formatter.format(-diffInSeconds, "second");
      } else if (Math.abs(diffInSeconds) < 3600) {
        return formatter.format(-Math.floor(diffInSeconds / 60), "minute");
      } else if (Math.abs(diffInSeconds) < 86400) {
        return formatter.format(-Math.floor(diffInSeconds / 3600), "hour");
      } else if (Math.abs(diffInSeconds) < 2592000) {
        return formatter.format(-Math.floor(diffInSeconds / 86400), "day");
      } else if (Math.abs(diffInSeconds) < 31536000) {
        return formatter.format(-Math.floor(diffInSeconds / 2592000), "month");
      } else {
        return formatter.format(-Math.floor(diffInSeconds / 31536000), "year");
      }
    },
    [locale]
  );

  return useMemo(
    () => ({
      t,
      locale: locale as Locale,
      locales: locales as Locale[],
      changeLocale,
      formatNumber,
      formatCurrency,
      formatDate,
      formatRelativeTime,
    }),
    [
      t,
      locale,
      locales,
      changeLocale,
      formatNumber,
      formatCurrency,
      formatDate,
      formatRelativeTime,
    ]
  );
}

// Export types for external use
export type { Locale, Namespace, TranslationOptions };
