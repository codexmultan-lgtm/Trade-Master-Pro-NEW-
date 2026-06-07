export const SYMBOL_DISPLAY: Record<string, string> = {
  BTCUSDT:  "BTC/USDT",
  BTCPKR:   "BTC/PKR",
  BTCINR:   "BTC/INR",
  ETHUSDT:  "ETH/USDT",
  ETHPKR:   "ETH/PKR",
  ETHINR:   "ETH/INR",
  BNBUSDT:  "BNB/USDT",
  BNBPKR:   "BNB/PKR",
  USDTPKR:  "USDT/PKR",
  USDTINR:  "USDT/INR",
  BTSPKR:   "BTS/PKR",
  BTSINR:   "BTS/INR",
};

export function symbolToDisplay(symbol: string): string {
  return SYMBOL_DISPLAY[symbol] ?? symbol;
}

export function getQuoteAsset(symbol: string): string {
  if (symbol.endsWith("PKR"))  return "PKR";
  if (symbol.endsWith("INR"))  return "INR";
  if (symbol.endsWith("USDT")) return "USDT";
  return "USDT";
}

export const ALL_SYMBOLS = Object.keys(SYMBOL_DISPLAY);
