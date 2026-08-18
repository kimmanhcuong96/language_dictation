import { describe, expect, it } from "vitest";
import { adminSystemMessages, adminSystemT } from "./adminSystemI18n";

describe("admin system i18n", () => {
  it("keeps every locale complete", () => {
    const expected = Object.keys(adminSystemMessages.en).sort();
    for (const messages of Object.values(adminSystemMessages)) {
      expect(Object.keys(messages).sort()).toEqual(expected);
      expect(Object.values(messages).every(Boolean)).toBe(true);
    }
  });

  it("provides the Vietnamese dashboard labels", () => {
    expect(adminSystemT("vi", "dashboardTitle")).toBe("Quản trị hệ thống");
    expect(adminSystemT("vi", "manage")).toBe("Quản lý");
  });
});
