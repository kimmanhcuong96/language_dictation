import { describe,expect,it } from "vitest";
import { explicitProperNamesFromMetadata,parseProperNamesJson } from "./properNamesImport";

describe("proper names import",()=>{
  it("maps validated names to parsed SRT positions",()=>{const parsed=parseProperNamesJson(JSON.stringify({sentences:[{position:2,names:[" Marie Curie ","John"]}]}),3);expect(parsed.totalNames).toBe(2);expect(parsed.byPosition.get(2)).toEqual(["Marie Curie","John"]);});
  it.each([
    [{version:1,sentences:[]},"names_schema_invalid"],
    [{sentences:[{position:4,names:["Paris"]}]},"names_position_invalid:4"],
    [{sentences:[{position:1,names:["Paris"]},{position:1,names:["France"]}]},"names_position_duplicate:1"],
    [{sentences:[{position:1,names:["Paris","paris"]}]},"names_duplicate:1:paris"],
    [{sentences:[{position:1,names:[{text:"Paris"}]}]},"names_text_invalid:1"],
  ])("rejects invalid documents",(document,error)=>expect(()=>parseProperNamesJson(JSON.stringify(document),3)).toThrow(error));
  it("distinguishes absent explicit data from an explicit empty list",()=>{expect(explicitProperNamesFromMetadata({})).toBeUndefined();expect(explicitProperNamesFromMetadata(null)).toBeUndefined();expect(explicitProperNamesFromMetadata({properNames:[]})).toEqual([]);});
  it("reads previously stored object metadata without accepting it in new import files",()=>{expect(explicitProperNamesFromMetadata({properNames:[{text:"Marie Curie"}]})).toEqual(["Marie Curie"]);});
});
