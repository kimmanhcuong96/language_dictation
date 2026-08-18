import { Check, FileArchive, Files, Play, RotateCcw, Upload, X } from "lucide-react";
import { unzipSync } from "fflate";
import { useEffect, useRef, useState } from "react";
import { useAuth, type AdminImportBatch, type AdminImportBatchItem } from "../../auth";
import { adminImportStatus, adminImportT, translateAdminImportError, type AdminImportMessageKey } from "../../adminImportI18n";
import { NON_AI_IMPORT_LIMITS } from "../../lib/nonAiImport";
import { readAudioDuration } from "../../lib/media";
import type { UiLocale } from "../../types";

interface SectionOption { section_id: string; category_name: string; section_title: string; language_code: string }
interface ReviewSentence { id: string; position: number; text: string; startMs: number; endMs: number }
interface ImportError { value: string; fallback: AdminImportMessageKey }
type ImportMode = "ai" | "non_ai";
type InputMethod = "files" | "zip";
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
  const [sectionId, setSectionId] = useState("");
  const [mode, setMode] = useState<ImportMode>("ai");
  const [inputMethod, setInputMethod] = useState<InputMethod>("files");
  const [level, setLevel] = useState("");
  const [title, setTitle] = useState("");
  const [audio, setAudio] = useState<File>();
  const [transcript, setTranscript] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [archive, setArchive] = useState<File>();
  const [lessonId, setLessonId] = useState("");
  const [review, setReview] = useState<ReviewSentence[]>([]);
  const [batch, setBatch] = useState<AdminImportBatch>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ImportError>();
  const previewAudio = useRef<HTMLAudioElement | undefined>(undefined);
  const previewFrame = useRef<number | undefined>(undefined);
  const [audioUrl, setAudioUrl] = useState("");
  const selectedSection = sections.find(item => item.section_id === sectionId);
  const t = (key: AdminImportMessageKey, values?: Record<string, string | number>) => adminImportT(locale, key, values);

  useEffect(() => {
    if (!auth.user?.isAdmin) return;
    void getJson<{ sections: SectionOption[] }>("/api/listening/admin/bootstrap")
      .then(result => {
        setSections(result.sections);
        setSectionId(current => current || result.sections[0]?.section_id || "");
      })
      .catch(reason => setError(toImportError(reason, "loadSectionsFailed")));
  }, [auth.user?.isAdmin]);

  useEffect(() => {
    if (!auth.user?.isAdmin) return;
    const saved = localStorage.getItem(LAST_BATCH_KEY);
    if (saved) void auth.adminGetImportBatch(saved)
      .then(result => {
        setBatch(result.batch);
        setMode("non_ai");
        setSectionId(result.batch.section_id);
      })
      .catch(() => localStorage.removeItem(LAST_BATCH_KEY));
  }, [auth.user?.isAdmin]);

  useEffect(() => {
    previewAudio.current?.pause();
    if (previewFrame.current !== undefined) cancelAnimationFrame(previewFrame.current);
    if (!audio) { setAudioUrl(""); return; }
    const url = URL.createObjectURL(audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  const sectionLabel = selectedSection ? `${selectedSection.language_code.toUpperCase()} / ${selectedSection.category_name} / ${selectedSection.section_title}` : "—";
  if (auth.loading) return <AdminShell onHome={onHome} locale={locale}><p>{t("loading")}</p></AdminShell>;
  if (!auth.user?.isAdmin) return <AdminShell onHome={onHome} locale={locale}><p>{t("adminRequired")}</p></AdminShell>;

  const processAi = async () => {
    if (!audio) return;
    setBusy(true); setError(undefined);
    try {
      const form = new FormData();
      form.set("audio", audio); form.set("transcript", transcript); form.set("importMode", "ai"); form.set("title", title);
      form.set("level", level); form.set("sectionId", sectionId); form.set("durationMs", String(await readAudioDuration(audio)));
      const result = await auth.adminImportLesson(form);
      setLessonId(result.lessonId); setReview(result.sentences as ReviewSentence[]);
    } catch (reason) { setError(toImportError(reason, "aiImportFailed")); }
    finally { setBusy(false); }
  };

  const publishAi = async () => {
    setBusy(true); setError(undefined);
    try {
      await auth.adminReviewLesson(lessonId, { publish: true, sentences: review });
      setLessonId(""); setReview([]); setAudio(undefined); setTranscript(""); setTitle("");
    } catch (reason) { setError(toImportError(reason, "publishFailed")); }
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

  const playReviewSegment = (sentence: ReviewSentence) => {
    if (!audioUrl) return;
    previewAudio.current?.pause();
    if (previewFrame.current !== undefined) cancelAnimationFrame(previewFrame.current);
    const player = new Audio(audioUrl);
    previewAudio.current = player; player.currentTime = sentence.startMs / 1000;
    const stopAtEnd = () => {
      if (player.currentTime >= sentence.endMs / 1000 || player.ended) player.pause();
      else previewFrame.current = requestAnimationFrame(stopAtEnd);
    };
    void player.play().then(() => { previewFrame.current = requestAnimationFrame(stopAtEnd); }).catch(() => undefined);
  };

  const resetBatch = () => {
    setBatch(undefined); setFiles([]); setArchive(undefined); localStorage.removeItem(LAST_BATCH_KEY); setError(undefined);
  };

  return <AdminShell onHome={onHome} locale={locale}>
    <p><a href="#/admin/listening/manage">{t("manageLessons")}</a></p>
    <div className="import-mode-tabs"><button className={mode === "ai" ? "active" : ""} onClick={() => setMode("ai")}>{t("aiImport")}</button><button className={mode === "non_ai" ? "active" : ""} onClick={() => setMode("non_ai")}>{t("nonAiImport")}</button></div>
    {error && <p className="form-error" role="alert">{translateAdminImportError(locale, error.value, error.fallback)}</p>}
    {mode === "ai" ? <section>
      <SectionAndLevel locale={locale} sections={sections} sectionId={sectionId} level={level} onSection={setSectionId} onLevel={setLevel} />
      {!lessonId ? <form className="admin-import" onSubmit={event => { event.preventDefault(); void processAi(); }}>
        <label>{t("title")}<input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>{t("audio")}<input required type="file" accept="audio/*" onChange={event => setAudio(event.target.files?.[0])} /></label>
        <label>{t("transcript")}<textarea required maxLength={50000} value={transcript} onChange={event => setTranscript(event.target.value)} /></label>
        <button className="primary-button" disabled={busy || !audio || !sectionId}>{busy ? t("processing") : t("processWithAi")}</button>
      </form> : <div className="alignment-review">
        <p><b>{t("targetSection")}:</b> {sectionLabel}</p>
        {review.map((item, index) => <fieldset key={item.id}><legend>{t("sentence")} {item.position}</legend><button type="button" onClick={() => playReviewSegment(item)}><Play size={15} />{t("playSegment")}</button><input type="number" min={0} value={item.startMs} onChange={event => setReview(rows => rows.map((row, i) => i === index ? { ...row, startMs: Number(event.target.value) } : row))} /><input type="number" min={1} value={item.endMs} onChange={event => setReview(rows => rows.map((row, i) => i === index ? { ...row, endMs: Number(event.target.value) } : row))} /><textarea value={item.text} onChange={event => setReview(rows => rows.map((row, i) => i === index ? { ...row, text: event.target.value } : row))} /></fieldset>)}
        <button className="primary-button" disabled={busy} onClick={() => void publishAi()}>{busy ? t("publishing") : t("publish")}</button>
      </div>}
    </section> : <section>
      {batch ? <BatchPreview locale={locale} batch={batch} busy={busy} onConfirm={() => void runBatch(false)} onRetry={() => void runBatch(true)} onReset={resetBatch} /> : <form className="admin-import" onSubmit={event => { event.preventDefault(); void validateBatch(); }}>
        <SectionAndLevel locale={locale} sections={sections} sectionId={sectionId} level={level} onSection={setSectionId} onLevel={setLevel} />
        <p className="selected-section"><b>{t("targetSection")}:</b> {sectionLabel}</p>
        <label>{t("inputMethod")}<select value={inputMethod} onChange={event => setInputMethod(event.target.value as InputMethod)}><option value="files">{t("directFiles")}</option><option value="zip">{t("zipArchive")}</option></select></label>
        {inputMethod === "files" ? <label>{t("lessonResources")}<input required type="file" multiple accept=".mp3,.srt,audio/mpeg,application/x-subrip" onChange={event => setFiles(Array.from(event.target.files ?? []))} /><small>{t("directFilesHint")}</small></label> : <label>{t("zipArchive")}<input required type="file" accept=".zip,application/zip" onChange={event => setArchive(event.target.files?.[0])} /><small>{t("zipHint")}</small></label>}
        <button className="primary-button" disabled={busy || !sectionId || (inputMethod === "files" ? !files.length : !archive)}>{busy ? t("validating") : t("validatePreview")}</button>
      </form>}
    </section>}
  </AdminShell>;
}

function AdminShell({ onHome, locale, children }: { onHome: () => void; locale: UiLocale; children: React.ReactNode }) {
  return <div className="content-shell"><header><button className="back-link" onClick={onHome}>{adminImportT(locale, "home")}</button><h1>{adminImportT(locale, "pageTitle")}</h1></header><main>{children}</main></div>;
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
  return <article className={`batch-item status-${item.status.toLocaleLowerCase()}`}><span className="batch-status-icon">{item.status === "COMPLETED" ? <Check size={16} /> : item.status === "INVALID" || item.status === "FAILED" ? <X size={16} /> : item.audioName?.toLocaleLowerCase().endsWith(".zip") ? <FileArchive size={16} /> : <Files size={16} />}</span><div><b>{item.lessonName}</b><small>{item.audioName ?? adminImportT(locale, "missingMp3")} · {item.srtName ?? adminImportT(locale, "missingSrt")}</small>{item.slug && <small>{adminImportT(locale, "slug")}: {item.slug} · {adminImportT(locale, "duration")}: {formatDuration(item.durationMs)} · {adminImportT(locale, "segments")}: {item.segmentCount ?? "—"}</small>}{messages.map((message, index) => <em key={`${message}-${index}`}>{translateAdminImportError(locale, message, "itemFailed")}</em>)}</div><strong>{adminImportStatus(locale, item.status)}</strong></article>;
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
