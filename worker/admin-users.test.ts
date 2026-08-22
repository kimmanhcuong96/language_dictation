import { describe,expect,it } from "vitest";
import { isProtectedModerationTarget, parseUserModerationInput } from "./admin-users";

describe("user moderation input",()=>{
  it("accepts explicit block and unblock actions with a trimmed audit reason",()=>{
    expect(parseUserModerationInput({action:"block",reason:"  repeated spam  "})).toEqual({action:"block",reason:"repeated spam"});
    expect(parseUserModerationInput({action:"unblock",reason:"appeal accepted"})).toEqual({action:"unblock",reason:"appeal accepted"});
  });
  it("rejects unknown actions and reasons outside the database limits",()=>{
    expect(parseUserModerationInput({action:"delete",reason:"valid reason"})).toBeNull();
    expect(parseUserModerationInput({action:"block",reason:"no"})).toBeNull();
    expect(parseUserModerationInput({action:"block",reason:"x".repeat(501)})).toBeNull();
  });
  it("protects the acting administrator and every configured administrator",()=>{
    expect(isProtectedModerationTarget("user-1","user-1","member@example.com","admin@example.com")).toBe(true);
    expect(isProtectedModerationTarget("admin-id","user-2","ADMIN@example.com","admin@example.com, owner@example.com")).toBe(true);
    expect(isProtectedModerationTarget("admin-id","user-2","member@example.com","admin@example.com")).toBe(false);
  });
});
