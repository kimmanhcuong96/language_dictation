import { describe,expect,it } from "vitest";
import { lessonManagementMessages,lessonManagementT } from "./lessonManagementI18n";

describe("lesson management i18n",()=>{
  it("keeps every locale structurally complete",()=>{const keys=Object.keys(lessonManagementMessages.en).sort();for(const messages of Object.values(lessonManagementMessages)){expect(Object.keys(messages).sort()).toEqual(keys);expect(Object.values(messages).every(Boolean)).toBe(true);}});
  it("interpolates confirmation values",()=>expect(lessonManagementT("vi","deleteConfirm",{title:"Bài 1"})).toContain("Bài 1"));
  it("translates path and batch-management messages",()=>{for(const locale of ["vi","en","zh","ja"] as const){expect(lessonManagementT(locale,"exactPath")).toBeTruthy();expect(lessonManagementT(locale,"selectedCount",{count:3})).toContain("3");expect(lessonManagementT(locale,"batchDeletePartial",{deleted:2,failed:1})).toMatch(/2.*1/);}});
});
