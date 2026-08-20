export const DEFAULT_TRANSLATION_LANGUAGE = "vi";
export const BUILTIN_TRANSLATION_LANGUAGES = ["vi", "zh", "ja", "ko"] as const;

export interface PopularTranslationLanguage { code:string; name:string; nativeName:string; }
export type LessonApprovalBlockReason="lesson_inactive"|"language_inactive"|"translation_set_empty"|"translation_set_rejected"|"translation_set_incomplete"|null;

// One reviewed catalog is shared by the client and Worker so displayed choices
// and server-side authorization can never drift apart.
export const POPULAR_TRANSLATION_LANGUAGES:readonly PopularTranslationLanguage[] = Object.freeze([
  {code:"en",name:"English",nativeName:"English"},
  {code:"zh",name:"Chinese",nativeName:"中文"},
  {code:"hi",name:"Hindi",nativeName:"हिन्दी"},
  {code:"es",name:"Spanish",nativeName:"Español"},
  {code:"fr",name:"French",nativeName:"Français"},
  {code:"ar",name:"Arabic",nativeName:"العربية"},
  {code:"bn",name:"Bengali",nativeName:"বাংলা"},
  {code:"pt",name:"Portuguese",nativeName:"Português"},
  {code:"ru",name:"Russian",nativeName:"Русский"},
  {code:"ur",name:"Urdu",nativeName:"اردو"},
  {code:"id",name:"Indonesian",nativeName:"Bahasa Indonesia"},
  {code:"de",name:"German",nativeName:"Deutsch"},
  {code:"ja",name:"Japanese",nativeName:"日本語"},
  {code:"sw",name:"Swahili",nativeName:"Kiswahili"},
  {code:"mr",name:"Marathi",nativeName:"मराठी"},
  {code:"te",name:"Telugu",nativeName:"తెలుగు"},
  {code:"tr",name:"Turkish",nativeName:"Türkçe"},
  {code:"ta",name:"Tamil",nativeName:"தமிழ்"},
  {code:"vi",name:"Vietnamese",nativeName:"Tiếng Việt"},
  {code:"ko",name:"Korean",nativeName:"한국어"},
  {code:"fa",name:"Persian",nativeName:"فارسی"},
  {code:"it",name:"Italian",nativeName:"Italiano"},
  {code:"th",name:"Thai",nativeName:"ไทย"},
  {code:"gu",name:"Gujarati",nativeName:"ગુજરાતી"},
  {code:"pl",name:"Polish",nativeName:"Polski"},
  {code:"uk",name:"Ukrainian",nativeName:"Українська"},
  {code:"ms",name:"Malay",nativeName:"Bahasa Melayu"},
  {code:"nl",name:"Dutch",nativeName:"Nederlands"},
  {code:"ro",name:"Romanian",nativeName:"Română"},
  {code:"fil",name:"Filipino",nativeName:"Filipino"},
]);

export function getPopularTranslationLanguage(value:string):PopularTranslationLanguage|null {
  const code=canonicalizeLanguageCode(value);
  return code?POPULAR_TRANSLATION_LANGUAGES.find(language=>language.code===code)??null:null;
}

export function getLessonApprovalBlockReason(input:{lessonActive:boolean;languageActive:boolean;sentenceCount:number;readySentenceCount:number;rejectedSentenceCount:number}):LessonApprovalBlockReason {
  if(!input.lessonActive)return "lesson_inactive";
  if(!input.languageActive)return "language_inactive";
  if(input.rejectedSentenceCount>0)return "translation_set_rejected";
  if(input.readySentenceCount===0)return "translation_set_empty";
  if(input.readySentenceCount!==input.sentenceCount)return "translation_set_incomplete";
  return null;
}

export function canonicalizeLanguageCode(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/u.test(trimmed)) return null;
  try { return Intl.getCanonicalLocales(trimmed)[0] ?? null; }
  catch { return null; }
}

export function isValidTranslationText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && [...value.trim()].length <= 2_000 && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value);
}

export function isValidLanguageName(value: unknown): value is string {
  return typeof value === "string" && [...value.trim()].length >= 2 && [...value.trim()].length <= 80 && !/[\p{C}<>]/u.test(value);
}
