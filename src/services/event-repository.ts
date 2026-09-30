import { ledgerEvents } from "@/data/ledger";
import type { LedgerEvent, SeasonId } from "@/schemas/domain";

export interface EventRepository { list(season?: SeasonId): Promise<LedgerEvent[]> }
export class StaticEventRepository implements EventRepository {
  async list(season?: SeasonId) { return season ? ledgerEvents.filter((event) => event.season === season) : ledgerEvents; }
}
