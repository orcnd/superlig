import { expect, it } from "vitest";
import { formatScore } from "./presentation";

it("distinguishes missing data, zero and small nonzero contributions", () => {
  expect(formatScore(null)).toBe("—");
  expect(formatScore(0)).toBe("0,00");
  expect(formatScore(.02)).toBe("+0,02");
  expect(formatScore(-.02)).toBe("−0,02");
  expect(formatScore(.001)).toBe("+<0,01");
  expect(formatScore(-.001)).toBe("−<0,01");
});
