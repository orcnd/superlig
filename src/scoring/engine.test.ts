import { describe, expect, it } from "vitest";
import type { LedgerEvent } from "@/schemas/domain";
import { criticalSuspensionEvent, scoreEvents, uniqueVerifiedEvents } from "./engine";

const basic = (overrides: Partial<LedgerEvent> = {}): LedgerEvent => ({ eventId: "YELLOW-1", season: "2023-24", matchLabel: "Normal maç", eventType: "CARD", confidence: 1, quality: "VERIFIED", verificationStatus: "verified", isMock: false, sourceIds: ["official"], effects: [{ teamId: "gs", category: "DISCIPLINE", direction: "disadvantage", kind: "direct", rawImpact: .2, explanation: "Normal sarı kart" }], ...overrides });

describe("auditable scoring engine", () => {
  it("normal maç sarı kartını düşük etkili puanlar", () => expect(scoreEvents([basic()])[0].disadvantage).toBe(.05));
  it("derbi öncesi anahtar oyuncu kaybını yüksek etkili puanlar", () => { const event = criticalSuspensionEvent({ eventId: "C1", season: "2023-24", losingTeam: "gs", benefitingTeam: "fb", playerImportance: 2, matchImportance: 1.5, confidence: 1, verified: true }); expect(scoreEvents([event])[0].disadvantage).toBe(.75); });
  it("kaybeden takıma negatif, rakibe dolaylı pozitif etki yazar", () => { const result = scoreEvents([criticalSuspensionEvent({ eventId: "C2", season: "2023-24", losingTeam: "gs", benefitingTeam: "fb", playerImportance: 2, matchImportance: 1.5, confidence: 1, verified: true })]); expect(result.find((s) => s.teamId === "gs")?.net).toBe(-.75); expect(result.find((s) => s.teamId === "fb")?.indirect).toBe(.75); });
  it("aynı eventId tekrar görünse de bir kez hesaplar", () => { const event = basic(); expect(uniqueVerifiedEvents([event, event])).toHaveLength(1); expect(scoreEvents([event, event])[0].disadvantage).toBe(.05); });
  it("düşük confidence etkisini azaltır", () => expect(scoreEvents([basic({ confidence: .3 })])[0].disadvantage).toBeCloseTo(.015));
  it("eksik veriyi sıfır değil null döndürür", () => { const score = scoreEvents([])[0]; expect(score.net).toBeNull(); expect(score.direct).toBeNull(); expect(score.missingCategories.length).toBeGreaterThan(0); });
  it("mock ve pending olayları endekse katmaz", () => { const event = criticalSuspensionEvent({ eventId: "P", season: "2023-24", losingTeam: "gs", benefitingTeam: "fb", playerImportance: 2, matchImportance: 1.5, confidence: .3 }); expect(scoreEvents([event])[0].net).toBeNull(); });
});
