import { Check, FileArchive, Files, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { unzipSync } from "fflate";
import { useEffect, useState } from "react";
import { useAuth, type AdminImportBatch, type AdminImportBatchItem } from "../../auth";
import { adminImportStatus, adminImportT, translateAdminImportError, type AdminImportMessageKey } from "../../adminImportI18n";
import { NON_AI_IMPORT_LIMITS } from "../../lib/nonAiImport";
import { readAudioDuration } from "../../lib/media";
import { parseTranslationText, TRANSLATION_IMPORT_LANGUAGES } from "../../lib/translationImport";
import { translationImportT } from "../../translationImportI18n";
import type { UiLocale } from "../../types";
import { AdminLayout } from "./AdminLayout";

interface SectionOption { section_id: string; category_id: string; category_name: string; section_title: string; language_code: string }
interface CategoryOption { category_id: string; category_name: string; language_code: string }
interface ImportError { value: string; fallback: AdminImportMessageKey }
type InputMethod = "files" | "zip";
type PageMode = "package" | "translations";
interface LessonOption { id:string; title:string; sentence_count:number }
interface TranslationEntry { id:string; languageCode:string; file?:File; lineCount?:number; error?:"blank"|"count"|"utf8"; line?:number; actual?:number }
const LAST_BATCH_KEY = "me2listen-admin-last-import-batch";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin" });
  const body = await response.json() as T & { error?: string; details?: string };
  if (!response.ok) throw new Error(body.details ? `${body.error}: ${body.details}` : body.error ?? "request_failed");
  return body;
}

export function LessonImportPage({ onHome, locale }: { onHome: () => void; locale: UiLocale }) {
  const auth = useAuth();
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [mode,setMode]=useState<PageMode>("package");
  const [lessons,setLessons]=useState<LessonOption[]>([]);
  const [translationLessonId,setTranslationLessonId]=useState("");
  const [translationEntries,setTranslationEntries]=useState<TranslationEntry[]>(()=>[{id:crypto.randomUUID(),languageCode:"vi"}]);
  const [translationNotice,setTranslationNotice]=useState(false);
  const [showSectionCreator, setShowSectionCreator] = useState(false);
  const [newSectionCategoryId, setNewSectionCategoryId] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [sectionNotice, setSectionNotice] = useState(false);
  const [inputMethod, setInputMethod] = useState<InputMethod>("files");
  const [level, setLevel] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [archive, setArchive] = useState<File>();
  const [batch, setBatch] = useState<AdminImportBatch>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ImportError>();
  const selectedSection = sections.find(item => item.section_id === sectionId);
  const t = (key: AdminImportMessageKey, values?: Record<string, string | number>) => adminImportT(locale, key, values);

  useEffect(() => {
    if (!auth.user?.isAdmin) return;
    void getJson<{ categories: CategoryOption[]; sections: SectionOption[] }>("/api/listening/admin/bootstrap")
      .then(result => {
        setCategories(result.categories);
        setSections(result.sections);
        setSectionId(current => current || result.sections[0]?.section_id || "");
        setNewSectionCategoryId(current => current || result.categories[0]?.category_id || "");
      })
      .catch(reason => setError(toImportError(reason, "loadSectionsFailed")));
    void getJson<{lessons:LessonOption[]}>("/api/listening/admin/lessons?status=all&limit=200")
      .then(result=>{setLessons(result.lessons);setTranslationLessonId(current=>current||result.lessons[0]?.id||"");})
      .catch(()=>setError({value:translationImportT(locale,"loadLessonsFailed"),fallback:"requestFailed"}));
  }, [auth.user?.isAdmin,locale]);

  useEffect(() => {
    if (!auth.user?.isAdmin) return;
    const saved = localStorage.getItem(LAST_BATCH_KEY);
    if (saved) void auth.adminGetImportBatch(saved)
      .then(result => {
        setBatch(result.batch);
        setSectionId(result.batch.section_id);
      })
      .catch(() => localStorage.removeItem(LAST_BATCH_KEY));
  }, [auth.user?.isAdmin]);

  const sectionLabel = selectedSection ? `${selectedSection.language_code.toUpperCase()} / ${selectedSection.category_name} / ${selectedSection.section_title}` : "—";
  if (auth.loading) return <AdminShell onHome={onHome} locale={locale}><p>{t("loading")}</p></AdminShell>;
  if (!auth.user?.isAdmin) return <AdminShell onHome={onHome} locale={locale}><p>{t("adminRequired")}</p></AdminShell>;

  const createSection = async () => {
    setBusy(true); setError(undefined); setSectionNotice(false);
    try {
      const result = await auth.adminCreateSection({ categoryId: newSectionCategoryId, title: newSectionTitle, description: newSectionDescription });
      const section = result.section;
      setSections(current => [...current, section]);
      setSectionId(section.section_id);
      setNewSectionTitle(""); setNewSectionDescription(""); setShowSectionCreator(false); setSectionNotice(true);
    } catch (reason) { setError(toImportError(reason, "createSectionFailed")); }
    finally { setBusy(false); }
  };

  const validateBatch = async () => {
    setBusy(true); setError(undefined);
    try {
      const durationEntries = inputMethod === "files" ? await durationEntriesForFiles(files) : await durationEntriesForZip(archive);
      const form = new FormData();
      form.set("sectionId", sectionId); form.set("level", level); form.set("inputMethod", inputMethod); form.set("durations", JSON.stringify(durationEntries));
      if (inputMethod === "files") for (const file of files) form.append("files", file); else if (archive) form.set("archive", archive);
      const result = await auth.adminValidateImportBatch(form);
      setBatch(result.batch); localStorage.setItem(LAST_BATCH_KEY, result.batch.id);
    } catch (reason) { setError(toImportError(reason, "batchValidationFailed")); }
    finally { setBusy(false); }
  };

  const runBatch = async (retryFailed = false) => {
    if (!batch) return;
    setBusy(true); setError(undefined);
    let current = batch;
    try {
      if (!current.confirmed_at) current = (await auth.adminConfirmImportBatch(current.id)).batch;
      const processable = current.items.filter(item => item.status === "QUEUED" || item.status === "PROCESSING" || (retryFailed && item.status === "FAILED"));
      for (const item of processable) {
        setBatch(markProcessing(current, item.id));
        try { current = (await auth.adminProcessImportBatchItem(current.id, item.id)).batch; }
        catch (reason) { setError(toImportError(reason, "itemFailed")); current = (await auth.adminGetImportBatch(current.id)).batch; }
        setBatch(current);
      }
      setBatch((await auth.adminGetImportBatch(current.id)).batch);
    } catch (reason) { setError(toImportError(reason, "batchProcessingFailed")); }
    finally { setBusy(false); }
  };

  const resetBatch = () => {
    setBatch(undefined); setFiles([]); setArchive(undefined); localStorage.removeItem(LAST_BATCH_KEY); setError(undefined);
  };

  const selectedLesson=lessons.find(lesson=>lesson.id===translationLessonId);
  const duplicateTranslationLanguages=new Set(translationEntries.filter((entry,index,all)=>all.findIndex(candidate=>candidate.languageCode===entry.languageCode)!==index).map(entry=>entry.languageCode));
  const validateTranslationFile=async(id:string,file?:File)=>{
    const expected=selectedLesson?.sentence_count??0;
    if(!file){setTranslationEntries(entries=>entries.map(entry=>entry.id===id?{id:entry.id,languageCode:entry.languageCode}:entry));return;}
    try{const text=new TextDecoder("utf-8",{fatal:true,ignoreBOM:false}).decode(await file.arrayBuffer()),parsed=parseTranslationText(text,expected);setTranslationEntries(entries=>entries.map(entry=>entry.id!==id?entry:{...entry,file,lineCount:parsed.lines.length,error:parsed.error==="translation_blank_line"?"blank":parsed.error?"count":undefined,line:parsed.line,actual:parsed.actual}));}
    catch{setTranslationEntries(entries=>entries.map(entry=>entry.id===id?{...entry,file,error:"utf8"}:entry));}
  };
  const importTranslations=async()=>{if(!selectedLesson)return;setBusy(true);setError(undefined);setTranslationNotice(false);try{const form=new FormData();form.set("lessonId",selectedLesson.id);for(const entry of translationEntries){form.append("languages",entry.languageCode);form.append("files",entry.file!);}await auth.adminImportTranslations(form);setTranslationNotice(true);setTranslationEntries([{id:crypto.randomUUID(),languageCode:"vi"}]);}catch(reason){setError(toImportError(reason,"requestFailed"));}finally{setBusy(false);}};
  const translationsValid=!!selectedLesson&&translationEntries.length>0&&translationEntries.every(entry=>entry.file&&!entry.error&&entry.lineCount===selectedLesson.sentence_count&&!duplicateTranslationLanguages.has(entry.languageCode));

  return <AdminShell onHome={onHome} locale={locale}>
    <p><a href="/admin/listening/manage">{t("manageLessons")}</a></p>
    <div className="import-mode-tabs"><button className={mode==="package"?"active":""} type="button" onClick={()=>setMode("package")}>{translationImportT(locale,"lessonPackage")}</button><button className={mode==="translations"?"active":""} type="button" onClick={()=>setMode("translations")}>{translationImportT(locale,"translationOnly")}</button></div>
    {error && <p className="form-error" role="alert">{translateAdminImportError(locale, error.value, error.fallback)}</p>}
    {sectionNotice && mode==="package" && <p className="form-success" role="status">{t("sectionCreated")}</p>}
    {translationNotice&&mode==="translations"&&<p className="form-success" role="status">{translationImportT(locale,"translationImportSuccess")}</p>}
    {mode==="package"&&!batch && <div className="import-section-creator"><button className="admin-inline-link" type="button" onClick={() => { setShowSectionCreator(current => !current); setSectionNotice(false); const categoryId = sections.find(item => item.section_id === sectionId)?.category_id; if (categoryId) setNewSectionCategoryId(categoryId); }}>{showSectionCreator ? t("cancelCreateSection") : t("createSection")}</button>{showSectionCreator && <form onSubmit={event => { event.preventDefault(); void createSection(); }}><h2>{t("newSection")}</h2><label>{t("category")}<select required value={newSectionCategoryId} onChange={event => setNewSectionCategoryId(event.target.value)}>{categories.map(item => <option key={item.category_id} value={item.category_id}>{item.language_code.toUpperCase()} / {item.category_name}</option>)}</select></label><label>{t("sectionTitle")}<input required maxLength={200} value={newSectionTitle} onChange={event => setNewSectionTitle(event.target.value)} /></label><label>{t("sectionDescription")}<textarea maxLength={1000} value={newSectionDescription} onChange={event => setNewSectionDescription(event.target.value)} /></label><div><button type="button" disabled={busy} onClick={() => setShowSectionCreator(false)}>{t("cancelCreateSection")}</button><button className="primary-button" disabled={busy || !newSectionCategoryId || !newSectionTitle.trim()}>{busy ? t("creatingSection") : t("createSection")}</button></div></form>}</div>}
    {mode==="package"&&<section>
      {batch ? <BatchPreview locale={locale} batch={batch} busy={busy} onConfirm={() => void runBatch(false)} onRetry={() => void runBatch(true)} onReset={resetBatch} /> : <form className="admin-import" onSubmit={event => { event.preventDefault(); void validateBatch(); }}>
        <SectionAndLevel locale={locale} sections={sections} sectionId={sectionId} level={level} onSection={setSectionId} onLevel={setLevel} />
        <p className="selected-section"><b>{t("targetSection")}:</b> {sectionLabel}</p>
        <label>{t("inputMethod")}<select value={inputMethod} onChange={event => setInputMethod(event.target.value as InputMethod)}><option value="files">{t("directFiles")}</option><option value="zip">{t("zipArchive")}</option></select></label>
        {inputMethod === "files" ? <label>{t("lessonResources")}<input required type="file" multiple accept=".mp3,.srt,.txt,audio/mpeg,application/x-subrip,text/plain" onChange={event => setFiles(Array.from(event.target.files ?? []))} /><small>{t("directFilesHint")}</small></label> : <label>{t("zipArchive")}<input required type="file" accept=".zip,application/zip" onChange={event => setArchive(event.target.files?.[0])} /><small>{t("zipHint")}</small></label>}
        <button className="primary-button" disabled={busy || !sectionId || (inputMethod === "files" ? !files.length : !archive)}>{busy ? t("validating") : t("validatePreview")}</button>
      </form>}
    </section>}
    {mode==="translations"&&<form className="admin-import translation-only-import" onSubmit={event=>{event.preventDefault();void importTranslations();}}><label>{translationImportT(locale,"lesson")}<select required value={translationLessonId} onChange={event=>{setTranslationLessonId(event.target.value);setTranslationEntries(entries=>entries.map(entry=>({id:entry.id,languageCode:entry.languageCode,file:entry.file})));}}><option value="">{translationImportT(locale,"selectLesson")}</option>{lessons.map(lesson=><option key={lesson.id} value={lesson.id}>{lesson.title} · {lesson.sentence_count}</option>)}</select>{selectedLesson&&<small>{translationImportT(locale,"expectedLines",{count:selectedLesson.sentence_count})}</small>}</label><h2>{translationImportT(locale,"translations")}</h2>{translationEntries.map(entry=><fieldset key={entry.id}><label>{translationImportT(locale,"targetLanguage")}<select value={entry.languageCode} onChange={event=>setTranslationEntries(entries=>entries.map(item=>item.id===entry.id?{...item,languageCode:event.target.value}:item))}>{TRANSLATION_IMPORT_LANGUAGES.map(language=><option key={language.code} value={language.code}>{language.name}</option>)}</select></label><label>{translationImportT(locale,"translationFile")}<input type="file" required accept=".txt,text/plain" onChange={event=>void validateTranslationFile(entry.id,event.target.files?.[0])}/></label>{entry.file&&!entry.error&&<small className="translation-validation valid">{translationImportT(locale,"matchesLines",{count:entry.lineCount??0})}</small>}{entry.error&&<small className="translation-validation invalid">{entry.error==="blank"?translationImportT(locale,"blankLine",{line:entry.line??0}):entry.error==="utf8"?translationImportT(locale,"invalidUtf8"):translationImportT(locale,"lineMismatch",{actual:entry.actual??entry.lineCount??0,expected:selectedLesson?.sentence_count??0})}</small>}{duplicateTranslationLanguages.has(entry.languageCode)&&<small className="translation-validation invalid">{translationImportT(locale,"duplicateLanguage")}</small>}<button type="button" disabled={translationEntries.length===1} onClick={()=>setTranslationEntries(entries=>entries.filter(item=>item.id!==entry.id))}><Trash2 size={15}/>{translationImportT(locale,"remove")}</button></fieldset>)}<button type="button" disabled={translationEntries.length>=TRANSLATION_IMPORT_LANGUAGES.length} onClick={()=>setTranslationEntries(entries=>[...entries,{id:crypto.randomUUID(),languageCode:TRANSLATION_IMPORT_LANGUAGES.find(language=>!entries.some(entry=>entry.languageCode===language.code))?.code??"vi"}])}><Plus size={15}/>{translationImportT(locale,"addTranslation")}</button><button className="primary-button" disabled={busy||!translationsValid}>{busy?translationImportT(locale,"importing"):translationImportT(locale,"importTranslations")}</button></form>}
  </AdminShell>;
}

function AdminShell({ onHome, locale, children }: { onHome: () => void; locale: UiLocale; children: React.ReactNode }) {
  return <AdminLayout locale={locale} title={adminImportT(locale, "pageTitle")} onSiteHome={onHome}>{children}</AdminLayout>;
}

function SectionAndLevel({ sections, sectionId, level, onSection, onLevel, locale }: { sections: SectionOption[]; sectionId: string; level: string; onSection: (value: string) => void; onLevel: (value: string) => void; locale: UiLocale }) {
  return <div className="admin-import-placement"><label>{adminImportT(locale, "targetSection")}<select required value={sectionId} onChange={event => onSection(event.target.value)}>{sections.map(item => <option key={item.section_id} value={item.section_id}>{item.language_code.toUpperCase()} / {item.category_name} / {item.section_title}</option>)}</select></label><label>{adminImportT(locale, "level")}<input maxLength={30} value={level} onChange={event => onLevel(event.target.value)} /></label></div>;
}

function BatchPreview({ batch, busy, onConfirm, onRetry, onReset, locale }: { batch: AdminImportBatch; busy: boolean; onConfirm: () => void; onRetry: () => void; onReset: () => void; locale: UiLocale }) {
  const t = (key: AdminImportMessageKey, values?: Record<string, string | number>) => adminImportT(locale, key, values);
  const progress = batch.counts.total ? Math.round((batch.counts.completed + batch.counts.failed + batch.counts.invalid) / batch.counts.total * 100) : 0;
  return <div className="batch-preview"><header><div><span className="overline">{t("batchValidation")}</span><h2>{batch.language_name} / {batch.category_name} / {batch.section_title}</h2></div><button type="button" onClick={onReset}><X size={16} />{t("newBatch")}</button></header><div className="batch-summary"><span>{t("total")} <b>{batch.counts.total}</b></span><span>{t("valid")} <b>{batch.counts.valid}</b></span><span>{t("invalid")} <b>{batch.counts.invalid}</b></span><span>{t("completed")} <b>{batch.counts.completed}</b></span><span>{t("processingStatus")} <b>{batch.counts.processing}</b></span><span>{t("failed")} <b>{batch.counts.failed}</b></span><span>{t("remaining")} <b>{batch.counts.queued}</b></span></div><div className="batch-progress"><i style={{ width: `${progress}%` }} /></div><div className="batch-items">{batch.items.map(item => <BatchItem key={item.id} item={item} locale={locale} />)}</div><div className="batch-actions">{!batch.confirmed_at && <button className="primary-button" disabled={busy || batch.counts.valid === 0} onClick={onConfirm}><Upload size={16} />{busy ? t("importing") : t("confirmImport", { count: batch.counts.valid })}</button>}{batch.confirmed_at && (batch.counts.queued > 0 || batch.counts.processing > 0) && <button className="primary-button" disabled={busy} onClick={onConfirm}>{busy ? t("processing") : t("resumeImport")}</button>}{batch.counts.failed > 0 && <button disabled={busy} onClick={onRetry}><RotateCcw size={16} />{t("retryFailed")}</button>}</div></div>;
}

function BatchItem({ item, locale }: { item: AdminImportBatchItem; locale: UiLocale }) {
  const messages = [...(Array.isArray(item.errors) ? item.errors : []), ...(item.errorMessage ? [item.errorMessage] : [])];
  return <article className={`batch-item status-${item.status.toLocaleLowerCase()}`}><span className="batch-status-icon">{item.status === "COMPLETED" ? <Check size={16} /> : item.status === "INVALID" || item.status === "FAILED" ? <X size={16} /> : item.audioName?.toLocaleLowerCase().endsWith(".zip") ? <FileArchive size={16} /> : <Files size={16} />}</span><div><b>{String(item.sortOrder).padStart(2,"0")}_{item.lessonName}</b><small>{item.audioName ?? adminImportT(locale, "missingMp3")} · {item.srtName ?? adminImportT(locale, "missingSrt")}</small>{Object.keys(item.translationFiles??{}).length>0&&<small>Translations: {Object.keys(item.translationFiles).map(code=>code.toUpperCase()).join(", ")}</small>}{item.slug && <small>{adminImportT(locale, "slug")}: {item.slug} · {adminImportT(locale, "duration")}: {formatDuration(item.durationMs)} · {adminImportT(locale, "segments")}: {item.segmentCount ?? "—"}</small>}{messages.map((message, index) => <em key={`${message}-${index}`}>{translateAdminImportError(locale, message, "itemFailed")}</em>)}</div><strong>{adminImportStatus(locale, item.status)}</strong></article>;
}

function toImportError(reason: unknown, fallback: AdminImportMessageKey): ImportError { return { value: reason instanceof Error ? reason.message : "request_failed", fallback }; }
function markProcessing(batch: AdminImportBatch, itemId: string): AdminImportBatch { return { ...batch, items: batch.items.map(item => item.id === itemId ? { ...item, status: "PROCESSING" } : item), counts: { ...batch.counts, queued: Math.max(0, batch.counts.queued - 1), processing: 1 } }; }
function formatDuration(value: number | null) { if (!value) return "—"; const total = Math.round(value / 1000); return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`; }
async function durationEntriesForFiles(files: File[]) { return measureDurations(files.filter(file => file.name.toLocaleLowerCase().endsWith(".mp3")).map(file => ({ name: file.name, file }))); }
async function durationEntriesForZip(archive?: File) {
  if (!archive) throw new Error("zip_file_required");
  if (archive.size > NON_AI_IMPORT_LIMITS.maxArchiveBytes) throw new Error("zip_too_large");
  let total = 0, count = 0;
  const extracted = unzipSync(new Uint8Array(await archive.arrayBuffer()), { filter: entry => {
    if (entry.name.endsWith("/")) return false;
    if (!safeZipPath(entry.name)) throw new Error("unsafe_zip_path");
    total += entry.originalSize; count += 1;
    if (total > NON_AI_IMPORT_LIMITS.maxExtractedBytes) throw new Error("zip_extracted_size_exceeded");
    if (count > NON_AI_IMPORT_LIMITS.maxResources) throw new Error("too_many_resources");
    return entry.name.toLocaleLowerCase().endsWith(".mp3");
  } });
  return measureDurations(Object.entries(extracted).map(([name, bytes]) => ({ name, file: new File([bytes], name, { type: "audio/mpeg" }) })));
}
async function measureDurations(entries: Array<{ name: string; file: File }>) { const result: Array<{ name: string; durationMs: number }> = []; for (const entry of entries) { try { result.push({ name: entry.name, durationMs: await readAudioDuration(entry.file) }); } catch { result.push({ name: entry.name, durationMs: 0 }); } } return result; }
function safeZipPath(name: string) { return !!name && !name.includes("\0") && !name.startsWith("/") && !name.startsWith("\\") && !/^[a-z]:/iu.test(name) && !name.replace(/\\/gu, "/").split("/").includes(".."); }
