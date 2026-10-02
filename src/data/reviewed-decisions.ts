import { z } from "zod";
import raw from "../../data/raw/reviewed-decisions.json";
const links = z.array(z.url()).min(1);
export const reviewedDecisionsSchema = z.object({
  schemaVersion: z.literal(1),
  penalties: z.array(z.object({
    id: z.string().min(1), matchId: z.string(), benefitingClubId: z.string(),
    player: z.string(), minute: z.number().int().min(0),
    outcome: z.enum(["scored", "missed", "saved"]), sourceUrls: links,
  })),
  suspensions: z.array(z.object({
    id: z.string().min(1), originMatchId: z.string(), affectedMatchIds: z.array(z.string()).min(1),
    clubId: z.string(), playerId: z.string(), player: z.string(),
    cause: z.enum(["red", "second_yellow", "yellow_accumulation"]), sourceUrls: links,
    rating: z.object({ value: z.number(), min: z.number(), max: z.number(), valuableThreshold: z.number(),
      assessedAt: z.iso.datetime(), sourceUrl: z.url(), provider: z.string().min(1),
    }).refine((r) => r.max > r.min && r.value >= r.min && r.value <= r.max && r.valuableThreshold >= r.min && r.valuableThreshold <= r.max, "Invalid rating scale"),
  })),
});
export const reviewedDecisions = reviewedDecisionsSchema.parse(raw);
