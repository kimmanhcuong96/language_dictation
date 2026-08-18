import { Languages, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, type SentenceTranslation, type TranslationLanguageOption } from "../auth";
import { DEFAULT_TRANSLATION_LANGUAGE, POPULAR_TRANSLATION_LANGUAGES } from "../lib/translation";
import { translationT } from "../translationI18n";
import type { UiLocale } from "../types";

const GUEST_PREFERENCE_KEY="me2listen-translation-language";

export function LessonTranslationPanel({lessonId,sentenceId,locale}:{lessonId:string;sentenceId:string;locale:UiLocale}){
  const auth=useAuth(),[languages,setLanguages]=useState<TranslationLanguageOption[]>([]),[target,setTarget]=useState(()=>auth.user?.preferredTranslationLanguage||localStorage.getItem(GUEST_PREFERENCE_KEY)||DEFAULT_TRANSLATION_LANGUAGE),[approvedItems,setApprovedItems]=useState<SentenceTranslation[]>([]),[contributions,setContributions]=useState<SentenceTranslation[]>([]),[draft,setDraft]=useState(""),[editing,setEditing]=useState(false),[adding,setAdding]=useState(false),[languageCode,setLanguageCode]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const t=(key:Parameters<typeof translationT>[1])=>translationT(locale,key);
  useEffect(()=>{if(auth.user?.preferredTranslationLanguage)setTarget(auth.user.preferredTranslationLanguage);},[auth.user?.id,auth.user?.preferredTranslationLanguage]);
  useEffect(()=>{let active=true;void auth.getTranslationLanguages(lessonId).then(items=>{if(!active)return;setLanguages(items);if(items.length&&!items.some(item=>item.code===target))setTarget(items[0].code);setError("");}).catch(()=>active&&setError(t("loadError")));return()=>{active=false;};},[lessonId,auth.user?.id]);
  useEffect(()=>{if(!target)return;let active=true;void auth.getLessonTranslations(lessonId,target).then(result=>{if(!active)return;setApprovedItems(result.approved);setContributions(result.contributions);setError("");}).catch(()=>active&&setError(t("loadError")));return()=>{active=false;};},[lessonId,target,auth.user?.id]);
  const approved=approvedItems.find(item=>item.sentenceId===sentenceId),contribution=contributions.find(item=>item.sentenceId===sentenceId);
  useEffect(()=>{setDraft(contribution?.text??"");setEditing(Boolean(contribution));},[sentenceId,target,contribution?.id]);
  const currentLanguage=languages.find(item=>item.code===target),existingLanguageCodes=new Set(languages.map(language=>language.code)),availableLanguages=POPULAR_TRANSLATION_LANGUAGES.filter(candidate=>!existingLanguageCodes.has(candidate.code));
  const selectLanguage=(code:string)=>{setTarget(code);localStorage.setItem(GUEST_PREFERENCE_KEY,code);if(auth.user)void auth.saveTranslationPreference(code).catch(()=>undefined);};
  const submit=async()=>{if(!draft.trim())return;setBusy(true);setError("");try{const item=await auth.submitSentenceTranslation(sentenceId,{languageCode:target,text:draft});setContributions(current=>[...current.filter(candidate=>candidate.sentenceId!==sentenceId),item]);setEditing(true);}catch{setError(t("saveError"));}finally{setBusy(false);}};
  const addLanguage=async()=>{if(!languageCode)return;setBusy(true);setError("");try{const item=await auth.addTranslationLanguage(languageCode);setLanguages(current=>[...current.filter(language=>language.code!==item.code),item]);selectLanguage(item.code);setAdding(false);setLanguageCode("");setEditing(true);}catch{setError(t("saveError"));}finally{setBusy(false);}};
  return <section className="lesson-translation-panel">
    <header><div><Languages size={18}/><h2>{t("translation")}</h2></div><label><span>{t("targetLanguage")}</span><select value={target} onChange={event=>selectLanguage(event.target.value)}>{languages.map(item=><option key={item.code} value={item.code}>{item.nativeName} · {item.code}</option>)}</select></label></header>
    {approved?<div className="approved-translation"><small>{t("approved")}</small><p>{approved.text}</p></div>:<p className="translation-empty">{t("unavailable")}</p>}
    {contribution&&<p className="translation-pending"><span>{t("pending")}</span>{t("submitted")}</p>}
    {error&&<p className="translation-error" role="alert">{error}</p>}
    {auth.user&&currentLanguage?.canContribute?<>{!editing&&<button type="button" className="translation-link" onClick={()=>{setDraft(approved?.text??"");setEditing(true);}}>{approved?t("suggestEdit"):t("contribute")}</button>}{editing&&<div className="translation-contribution"><label>{t("translationText")}<textarea maxLength={2000} value={draft} onChange={event=>setDraft(event.target.value)}/></label><div><button type="button" onClick={()=>setEditing(false)}>{t("cancel")}</button><button type="button" className="primary-button" disabled={busy||!draft.trim()} onClick={()=>void submit()}>{busy?t("submitting"):t("submit")}</button></div></div>}</>:!auth.user&&<p className="translation-signin">{t("signIn")}</p>}
    {auth.user&&availableLanguages.length>0&&<>{!adding?<button type="button" className="translation-link add-language" onClick={()=>{setLanguageCode(availableLanguages[0]?.code??"");setAdding(true);}}><Plus size={14}/>{t("addLanguage")}</button>:<div className="add-translation-language"><label>{t("selectLanguage")}<select value={languageCode} onChange={event=>setLanguageCode(event.target.value)}>{POPULAR_TRANSLATION_LANGUAGES.map(language=>{const added=existingLanguageCodes.has(language.code);return <option key={language.code} value={language.code} disabled={added}>{language.nativeName} · {language.name}{added?` · ${t("alreadyAdded")}`:""}</option>;})}</select></label><div><button type="button" onClick={()=>setAdding(false)}>{t("cancel")}</button><button type="button" className="primary-button" disabled={busy||!languageCode||existingLanguageCodes.has(languageCode)} onClick={()=>void addLanguage()}>{t("createLanguage")}</button></div></div>}</>}
  </section>;
}
