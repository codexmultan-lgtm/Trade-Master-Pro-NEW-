import { createContext, useContext } from "react";
import { useGetSettings } from "@workspace/api-client-react";

interface PlatformSettings {
  currency: string;
  currencySymbol: string;
  profit60s: number;
  profit120s: number;
  profit180s: number;
  profit240s: number;
  lossPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  enabledSymbols: string[];
}

const DEFAULT_SETTINGS: PlatformSettings = {
  currency: "PKR",
  currencySymbol: "₨",
  profit60s: 85,
  profit120s: 80,
  profit180s: 75,
  profit240s: 70,
  lossPercent: 100,
  minTradeAmount: 100,
  maxTradeAmount: 100000,
  enabledSymbols: [],
};

const PlatformSettingsContext = createContext<PlatformSettings>(DEFAULT_SETTINGS);

export function PlatformSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useGetSettings();

  const value: PlatformSettings = data
    ? {
        currency:        data.currency,
        currencySymbol:  data.currencySymbol,
        profit60s:       data.profit60s,
        profit120s:      data.profit120s,
        profit180s:      data.profit180s,
        profit240s:      data.profit240s,
        lossPercent:     data.lossPercent,
        minTradeAmount:  data.minTradeAmount,
        maxTradeAmount:  data.maxTradeAmount,
        enabledSymbols:  data.enabledSymbols,
      }
    : DEFAULT_SETTINGS;

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings(): PlatformSettings {
  return useContext(PlatformSettingsContext);
}
