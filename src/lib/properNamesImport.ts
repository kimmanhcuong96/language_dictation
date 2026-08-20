export interface ParsedProperNames {
  byPosition: Map<number, string[]>;
  totalNames: number;
}

const fail = (code: string): never => { throw new Error(code); };
const hasOnlyKeys = (value: Record<string,unknown>, allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key));

export function parseProperNamesJson(text: string, sentenceCount: number): ParsedProperNames {
  let value: unknown;
  try { value=JSON.parse(text.startsWith("\uFEFF")?text.slice(1):text); }
  catch { return fail("names_json_invalid"); }
  if(!value||typeof value!=="object"||Array.isArray(value))return fail("names_json_invalid");
  const document=value as Record<string,unknown>;
  if(!hasOnlyKeys(document,["sentences"])||!Array.isArray(document.sentences))return fail("names_schema_invalid");
  const byPosition=new Map<number,string[]>();let totalNames=0;
  for(const rawSentence of document.sentences){
    if(!rawSentence||typeof rawSentence!=="object"||Array.isArray(rawSentence))return fail("names_schema_invalid");
    const sentence=rawSentence as Record<string,unknown>,position=sentence.position;
    if(!hasOnlyKeys(sentence,["position","names"]))return fail("names_schema_invalid");
    if(!Number.isInteger(position)||Number(position)<1||Number(position)>sentenceCount)return fail(`names_position_invalid:${String(position)}`);
    if(byPosition.has(Number(position)))return fail(`names_position_duplicate:${String(position)}`);
    if(!Array.isArray(sentence.names)||sentence.names.length<1||sentence.names.length>20)return fail(`names_count_invalid:${String(position)}`);
    const names:string[]=[],seen=new Set<string>();
    for(const rawName of sentence.names){
      const nameText=typeof rawName==="string"?rawName.trim():"";
      if(!nameText||nameText.length>100)return fail(`names_text_invalid:${String(position)}`);
      const key=nameText.toLocaleLowerCase();if(seen.has(key))return fail(`names_duplicate:${String(position)}:${nameText}`);seen.add(key);
      names.push(nameText);
      totalNames+=1;if(totalNames>500)return fail("names_total_too_large");
    }
    byPosition.set(Number(position),names);
  }
  return {byPosition,totalNames};
}

export function explicitProperNamesFromMetadata(metadata: unknown): string[]|undefined {
  if(!metadata||typeof metadata!=="object"||Array.isArray(metadata))return undefined;
  const record=metadata as Record<string,unknown>;
  if(!Object.prototype.hasOwnProperty.call(record,"properNames"))return undefined;
  if(!Array.isArray(record.properNames))return [];
  return record.properNames.flatMap(raw=>{
    if(typeof raw==="string"&&raw.trim())return [raw.trim()];
    if(!raw||typeof raw!=="object"||Array.isArray(raw))return [];
    const legacyText=(raw as Record<string,unknown>).text;
    return typeof legacyText==="string"&&legacyText.trim()?[legacyText.trim()]:[];
  });
}
