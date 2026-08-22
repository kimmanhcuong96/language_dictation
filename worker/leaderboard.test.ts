import { describe, expect, it,vi } from "vitest";
import { getLeaderboard, rollingPeriodStart, type LeaderboardSqlFactory } from "./leaderboard";

describe("rolling leaderboard periods",()=>{
  const now=new Date("2026-08-20T15:30:00.000Z");
  it("uses the exact previous 7 days",()=>expect(rollingPeriodStart("7d",now).toISOString()).toBe("2026-08-13T15:30:00.000Z"));
  it("uses the exact previous 30 days",()=>expect(rollingPeriodStart("30d",now).toISOString()).toBe("2026-07-21T15:30:00.000Z"));
  it.each(["study_time","translations"] as const)("excludes blocked users from the %s ranking in SQL",async metric=>{
    const sql=vi.fn().mockResolvedValueOnce([{study_7_day_limit:50,study_30_day_limit:50,translation_7_day_limit:50,translation_30_day_limit:50,updated_at:now.toISOString()}]).mockResolvedValueOnce([]),factory=(()=>sql) as unknown as LeaderboardSqlFactory;
    const response=await getLeaderboard({} as Env,new URL(`https://example.test/api/leaderboard?metric=${metric}&period=7d`),"blocked-user",factory);
    expect(response.status).toBe(200);expect(String(sql.mock.calls[1]?.[0])).toContain("users.is_blocked = FALSE");
  });
});
