export function formatPKR(amount: number): string {
  return "₨" + amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatMarketPrice(price: number, quote: string): string {
  if (quote === "USDT") return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (quote === "INR") return "₹" + price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatPKR(price);
}
