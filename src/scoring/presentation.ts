export function formatScore(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "0,00";
  const magnitude = Math.abs(value);
  const sign = value > 0 ? "+" : "−";
  if (magnitude < .005) return `${sign}<0,01`;
  return `${sign}${magnitude.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
