import { describe, expect, it } from "vitest";
import { sectionT } from "./sectionI18n";

describe("section i18n", () => {
  it("localizes the video lesson tag for every supported locale", () => {
    expect(sectionT("vi", "video")).toBe("Video");
    expect(sectionT("en", "video")).toBe("Video");
    expect(sectionT("zh", "video")).toBe("视频");
    expect(sectionT("ja", "video")).toBe("動画");
  });
});
