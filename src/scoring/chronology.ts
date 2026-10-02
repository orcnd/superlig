import type { ImportedMatch } from "@/data/matches";

export function matchTime(match: ImportedMatch): number | null {
  const parts = match.details?.dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2}):(\d{2})/);
  // TFF times are Europe/Istanbul (UTC+3 throughout the covered seasons).
  return parts ? Date.UTC(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5]) - 3 * 3600000 : null;
}
export function nextClubMatch(matches: ImportedMatch[], origin: ImportedMatch, clubId: string) {
  const time = matchTime(origin);
  if (time === null) return undefined;
  return matches.filter((m) => m.season === origin.season && (m.homeTeam.tffClubId === clubId || m.awayTeam.tffClubId === clubId) && matchTime(m) !== null && matchTime(m)! > time).sort((a, b) => matchTime(a)! - matchTime(b)!)[0];
}
