import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useGetSettings } from "@workspace/api-client-react";

interface SettingsContextType {
  theme: string;
  currency: string;
  businessName: string;
  setTheme: (theme: string) => void;
  setCurrency: (currency: string) => void;
  setBusinessName: (name: string) => void;
  formatCurrency: (amount: number) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const currencies: Record<string, string> = {
  BDT: "৳", USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CNY: "¥", KRW: "₩", SAR: "﷼", AED: "د.إ",
  PKR: "₨", MYR: "RM", IDR: "Rp", PHP: "₱", THB: "฿", VND: "₫", SGD: "S$", HKD: "HK$", TWD: "NT$", NPR: "₨",
  LKR: "₨", MMK: "K", KZT: "₸", UZS: "so'm", TRY: "₺", RUB: "₽", BRL: "R$", MXN: "$", ARS: "$", COP: "$",
  CAD: "CA$", AUD: "A$", NZD: "NZ$", CHF: "Fr", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft",
  RON: "lei", BGN: "лв", HRK: "kn", ZAR: "R", NGN: "₦", GHS: "₵", KES: "KSh", EGP: "£", MAD: "MAD", DZD: "DA",
  TZS: "TSh", UGX: "USh", ETB: "Br", XOF: "CFA", XAF: "CFA"
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "amethyst");
  const [currency, setCurrency] = useState(() => localStorage.getItem("currency") || "BDT");
  const [businessName, setBusinessName] = useState(() => localStorage.getItem("businessName") || "Business Manager");

  const { data: settings } = useGetSettings({
    query: {
      retry: false
    }
  });

  useEffect(() => {
    if (settings) {
      setTheme(settings.theme || "amethyst");
      setCurrency(settings.currency || "BDT");
      setBusinessName(settings.businessName || "Business Manager");
      localStorage.setItem("theme", settings.theme || "amethyst");
      localStorage.setItem("currency", settings.currency || "BDT");
      localStorage.setItem("businessName", settings.businessName || "Business Manager");
    }
  }, [settings]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("amethyst", "emerald", "ocean", "dark");
    root.classList.add(theme);
    root.classList.add("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("currency", currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem("businessName", businessName);
  }, [businessName]);

  const formatCurrency = (amount: number) => {
    const symbol = currencies[currency] || "৳";
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <SettingsContext.Provider value={{ theme, currency, businessName, setTheme, setCurrency, setBusinessName, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
