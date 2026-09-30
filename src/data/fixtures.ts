import season2324 from "../../data/raw/tff/fixtures-2023-24.json";
import season2425 from "../../data/raw/tff/fixtures-2024-25.json";
import season2526 from "../../data/raw/tff/fixtures-2025-26.json";
import type { SeasonId } from "@/schemas/domain";

export interface FixtureRecord {
  matchId: string;
  season: SeasonId;
  week: number;
  homeTeam: { tffClubId: string; sourceName: string };
  awayTeam: { tffClubId: string; sourceName: string };
  score: { home: number | null; away: number | null; status: string };
  detailUrl: string;
}

export const allFixtures = [
  ...season2324.records,
  ...season2425.records,
  ...season2526.records,
] as FixtureRecord[];
