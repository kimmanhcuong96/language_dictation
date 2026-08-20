import { describe, expect, it } from "vitest";
import { rollingPeriodStart } from "./leaderboard";

describe("rolling leaderboard periods",()=>{
  const now=new Date("2026-08-20T15:30:00.000Z");
  it("uses the exact previous 7 days",()=>expect(rollingPeriodStart("7d",now).toISOString()).toBe("2026-08-13T15:30:00.000Z"));
  it("uses the exact previous 30 days",()=>expect(rollingPeriodStart("30d",now).toISOString()).toBe("2026-07-21T15:30:00.000Z"));
});
