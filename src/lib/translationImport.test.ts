import { describe, expect, it } from "vitest";
import { getTranslationImportLanguage, parsePackageTranslationFilename, parseTranslationText } from "./translationImport";

describe("translation import", () => {
  it("uses the centralized supported language registry", () => {
    expect(getTranslationImportLanguage("zh")?.name).toBe("Chinese");
    expect(getTranslationImportLanguage("fr")).toBeUndefined();
  });

  it("parses package translation filenames", () => {
    expect(parsePackageTranslationFilename("folder/business.vi.txt")).toMatchObject({ basename: "business", languageCode: "vi" });
    expect(parsePackageTranslationFilename("business.fr.txt")?.language).toBeUndefined();
    expect(parsePackageTranslationFilename("translation.txt")).toBeNull();
  });

  it("rejects blank lines without shifting positional mappings", () => {
    expect(parseTranslationText("Một\n\nBa", 3)).toMatchObject({ error: "translation_blank_line", line: 2 });
  });

  it("requires an exact line count and allows one trailing newline", () => {
    expect(parseTranslationText("Một\nHai\n", 2)).toEqual({ lines: ["Một", "Hai"] });
    expect(parseTranslationText("Một", 2)).toMatchObject({ error: "translation_line_count_mismatch", expected: 2, actual: 1 });
  });
});
