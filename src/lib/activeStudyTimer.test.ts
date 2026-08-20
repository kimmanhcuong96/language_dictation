import { describe,expect,it } from "vitest";
import { createActiveStudyTimer } from "./activeStudyTimer";

describe("active study timer",()=>{
  it("excludes paused time and can reset between attempts",()=>{let now=0;const timer=createActiveStudyTimer(()=>now);timer.resume();now=25_000;timer.pause();now=85_000;timer.resume();now=100_000;expect(timer.elapsedSeconds()).toBe(40);timer.reset(true);now=112_000;expect(timer.elapsedSeconds()).toBe(12);});
  it("caps a single event at five minutes",()=>{let now=0;const timer=createActiveStudyTimer(()=>now);timer.resume();now=900_000;expect(timer.elapsedSeconds()).toBe(300);});
});
