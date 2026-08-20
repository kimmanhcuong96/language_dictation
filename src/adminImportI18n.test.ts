import { describe, expect, it } from "vitest";
import { adminImportMessages, adminImportStatus, adminImportT, translateAdminImportError } from "./adminImportI18n";

describe("admin import i18n", () => {
  it("keeps every locale complete", () => {
    const expected = Object.keys(adminImportMessages.en).sort();
    for (const messages of Object.values(adminImportMessages)) {
      expect(Object.keys(messages).sort()).toEqual(expected);
      expect(Object.values(messages).every(Boolean)).toBe(true);
    }
  });

  it("interpolates values", () => {
    expect(adminImportT("vi", "confirmImport", { count: 3 })).toContain("3");
    expect(adminImportT("vi", "level")).toContain("không bắt buộc");
    expect(adminImportT("en", "level")).toContain("optional");
  });

  it("localizes known backend errors and statuses", () => {
    expect(translateAdminImportError("vi", "missing_srt", "itemFailed")).toBe("Thiếu SRT");
    expect(translateAdminImportError("vi", "invalid_section_metadata", "createSectionFailed")).toBe(adminImportT("vi", "createSectionFailed"));
    expect(translateAdminImportError("ja", "pre_timed_srt_timing_invalid: cue 2", "itemFailed")).not.toContain("pre_timed");
    expect(adminImportStatus("zh", "COMPLETED")).toBe("已完成");
  });

  it("preserves unknown technical details behind a localized message", () => {
    expect(translateAdminImportError("vi", "upstream_timeout", "requestFailed")).toContain("upstream_timeout");
  });

  it("keeps translation import validation errors actionable", () => {
    expect(translateAdminImportError("en", "translation_blank_line:vi:37", "requestFailed")).toBe("Vietnamese: Blank line at line 37");
    expect(translateAdminImportError("en", "translation_line_count_mismatch:ja:98:100", "requestFailed")).toContain("Found 98 lines; expected 100");
    expect(translateAdminImportError("en", "invalid_translation_filename", "requestFailed")).toContain("language-code");
    expect(translateAdminImportError("en", "invalid_youtube_url", "requestFailed")).toContain("YouTube URL");
    expect(translateAdminImportError("en", "names_position_invalid:12", "requestFailed")).toContain(".name.json");
    expect(translateAdminImportError("vi", "selected_lesson_not_found", "requestFailed")).not.toContain("selected_lesson_not_found");
  });
});
