export function robustZScore(value: number | null, leagueValues: Array<number | null>): number | null {
  const values = leagueValues.filter((item): item is number => item !== null).sort((a, b) => a - b);
  if (value === null || values.length < 5) return null;
  const median = values[Math.floor(values.length / 2)];
  const deviations = values.map((item) => Math.abs(item - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)];
  if (mad === 0) return null;
  return Math.max(-100, Math.min(100, ((value - median) / (1.4826 * mad)) * 25));
}
