import { describe,expect,it } from "vitest";
import { adminUsersT } from "./adminUsersI18n";

describe("admin user management translations",()=>{
  it("supports every interface locale and interpolation",()=>{
    for(const locale of ["en","vi","zh","ja"] as const)expect(adminUsersT(locale,"total",{count:12})).toContain("12");
  });
});
