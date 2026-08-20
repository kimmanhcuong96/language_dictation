import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Clock3, Headphones, Lightbulb, Mic, RotateCcw, Search, Settings2, Star, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useAuth } from "./auth";
import { adminSystemT } from "./adminSystemI18n";
import { AudioSegmentPlayer, type AudioSegmentPlayerHandle } from "./components/AudioSegmentPlayer";
import { YouTubeSegmentPlayer, type YouTubeSegmentPlayerHandle } from "./components/YouTubeSegmentPlayer";
import { ListeningSettingsDialog } from "./components/ListeningSettingsDialog";
import { LessonTranslationPanel } from "./components/LessonTranslationPanel";
import { AdminLayout } from "./components/admin/AdminLayout";
import { LessonImportPage } from "./components/admin/LessonImportPage";
import { localeTags, translate } from "./i18n";
import { evaluateAnswer } from "./lib/dictation";
import { matchesReplayShortcut, shortcutLabel, type ListeningPreferences } from "./lib/listeningPreferences";
import { loadLocalListeningPreferences, saveLocalListeningPreferences } from "./lib/listeningPreferencesStorage";
import { lessonT } from "./lessonI18n";
import { lessonCompletionT } from "./lessonCompletionI18n";
import { buildLessonAudioRequestUrl } from "./lib/lessonAudioRequest";
import { lessonManagementT } from "./lessonManagementI18n";
import { findNextLesson, loadLessonManifest, type LessonManifest } from "./lib/lessonManifest";
import { abortSpeechRecognition, classifyMicrophoneAccessError, classifySpeechRecognitionError, collectRecognizedSpeech, getSpeechRecognitionConstructor, getSpeechRecognitionLocale, mergeRecognizedSpeech, requestMicrophoneAccess, type BrowserSpeechRecognition, type SpeechRecognitionErrorKind } from "./lib/speechRecognition";
import { buildLessonSections, collectLessonLevels, filterLessonSections } from "./lib/sectionCatalog";
import { buildTopicSummaries, formatLevelRange } from "./lib/topicCatalog";
import { findActiveTranscriptIndex, seekAndPlayTranscript } from "./lib/transcriptTracking";
import { detectLikelyProperNouns } from "./lib/properNouns";
import { explicitProperNamesFromMetadata } from "./lib/properNamesImport";
import { navigateToPath, pathHref } from "./router";
import { sectionT } from "./sectionI18n";
import { speechRecognitionT } from "./speechRecognitionI18n";
import { topicT } from "./topicI18n";
import type { UiLocale } from "./types";

interface Category { id:string; slug:string; name:string; description:string|null; }
interface Section { id:string; number:number; title:string; description:string|null; lesson_count:number; }
interface LessonSummary { id:string; slug:string; title:string; description:string|null; level:string|null; duration_ms:number; sentence_count:number; path?:string; }
interface ListeningSentence { id:string; position:number; transcript:string; start_ms:number; end_ms:number; metadata:Record<string,unknown>; }
type ListeningMedia={type:"r2_audio";key:string|null}|{type:"youtube";videoId:string};
interface ListeningLesson extends LessonSummary { templateType:"audio"|"media";media:ListeningMedia;audio_url:string|null; category_slug:string; section_id:string; section_number:number; language_code:string; sentences:ListeningSentence[]; }
interface ReviewSentence { id:string; position:number; text:string; startMs:number; endMs:number; }
interface LessonState { lessonId:string; starCount:number; isStarred:boolean; isCompleted:boolean; }
type LessonStateMap = Record<string,LessonState>;

async function getJson<T>(path:string):Promise<T>{const response=await fetch(path,{credentials:"same-origin"});const body=await response.json() as T&{error?:string};if(!response.ok)throw new Error(body.error??"request_failed");return body;}
const navigate=(path:string)=>{navigateToPath(path);window.scrollTo({top:0,behavior:"smooth"});};

function useLearningRoute(){
  const read=()=>window.location.pathname.startsWith("/en")?window.location.pathname:"/en";
  const [route,setRoute]=useState(read);
  useEffect(()=>{const update=()=>setRoute(read());window.addEventListener("popstate",update);return()=>window.removeEventListener("popstate",update);},[]);
  return route;
}

export function EnglishLearningApp({locale,onHome,header,canonicalPath}:{locale:UiLocale;onHome:()=>void;header:React.ReactNode;canonicalPath?:string}){
  const auth=useAuth(),manifestState=useLessonManifest(),lessonStateData=useLessonStates(auth.user?.id);
  const route=useLearningRoute(),lesson=route.match(/^\/en\/lesson\/([\w-]+)$/u),section=route.match(/^\/en\/([\w-]+)\/([\w-]+)$/u),category=route.match(/^\/en\/([\w-]+)$/u);
  const canonical=canonicalPath?.match(/^\/lessons\/([^/]+)\/([^/]+)\/([^/]+)$/u);
  const content=canonical?<DictationLesson manifest={manifestState.manifest} lessonPath={{level:canonical[1],category:canonical[2],slug:canonical[3]}} lessonStates={lessonStateData.states} onLessonState={lessonStateData.update} locale={locale} onHome={onHome}/>:lesson?<DictationLesson manifest={manifestState.manifest} lessonSlug={lesson[1]} lessonStates={lessonStateData.states} onLessonState={lessonStateData.update} locale={locale} onHome={onHome}/>:manifestState.failed?<Shell locale={locale} onHome={onHome} title="English"><LoadError locale={locale} retry={manifestState.retry}/></Shell>:section?<LessonList manifest={manifestState.manifest} categorySlug={section[1]} sectionId={section[2]} lessonStates={lessonStateData.states} locale={locale} onHome={onHome}/>:category?<SectionList manifest={manifestState.manifest} categorySlug={category[1]} lessonStates={lessonStateData.states} locale={locale} onHome={onHome}/>:<CategoryList manifest={manifestState.manifest} locale={locale} onHome={onHome}/>;
  return <><div className="learning-page-header">{header}</div>{content}</>;
}
function useLessonManifest(){const [manifest,setManifest]=useState<LessonManifest>(),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);useEffect(()=>{setFailed(false);void loadLessonManifest().then(setManifest).catch(()=>setFailed(true));},[attempt]);return {manifest,failed,retry:()=>setAttempt(value=>value+1)};}
function useLessonStates(userId?:string){
  const [states,setStates]=useState<LessonStateMap>({});
  useEffect(()=>{let active=true;void getJson<{lessons:LessonState[]}>("/api/listening/lesson-states?language=en").then(result=>{if(active)setStates(Object.fromEntries(result.lessons.map(item=>[item.lessonId,item])));}).catch(()=>undefined);return()=>{active=false;};},[userId]);
  const update=(lessonId:string,patch:Partial<Omit<LessonState,"lessonId">>)=>setStates(current=>{const previous=current[lessonId];return {...current,[lessonId]:{lessonId,starCount:previous?.starCount??0,isStarred:previous?.isStarred??false,isCompleted:previous?.isCompleted??false,...patch}};});
  return {states,update};
}

interface Breadcrumb { label: string; onClick?: () => void; }
function Breadcrumbs({items,locale}:{items:Breadcrumb[];locale:UiLocale}){return <nav className="breadcrumbs" aria-label={translate(locale,"breadcrumb")}>{items.map((item,index)=><span key={`${item.label}-${index}`}>{index>0&&<b aria-hidden="true">/</b>}{item.onClick?<button type="button" onClick={item.onClick}>{item.label}</button>:<span aria-current="page">{item.label}</span>}</span>)}</nav>;}
function formatCategory(slug:string){return slug.split("-").map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(" ");}
function formatSection(id:string,locale:UiLocale){const number=id.match(/-(\d+)$/u)?.[1];return number?`${translate(locale,"section")} ${number}`:translate(locale,"section");}
function Shell({children,onHome,title,locale="en",breadcrumbs,wide=false}:{children:React.ReactNode;onHome:()=>void;title:string;locale?:UiLocale;breadcrumbs?:Breadcrumb[];wide?:boolean}){return <div className={`content-shell${wide?" content-shell-wide":""}`}><header>{breadcrumbs?<Breadcrumbs locale={locale} items={breadcrumbs}/>:<><button onClick={onHome} className="back-link"><ArrowLeft size={18}/>{translate(locale,"home")}</button><h1>{title}</h1></>}</header><main>{children}</main></div>;}
function Loading({locale="en"}:{locale?:UiLocale}){return <div className="content-state" role="status">{translate(locale,"loading")}</div>;} function LoadError({retry,locale="en"}:{retry:()=>void;locale?:UiLocale}){return <div className="content-state" role="alert"><p>{translate(locale,"loadError")}</p><button onClick={retry}>{translate(locale,"retry")}</button></div>;}
function LessonAudioPlaceholder({status,retry,locale}:{status:"loading"|"error"|"missing";retry:()=>void;locale:UiLocale}){return <div className={`lesson-audio-state ${status}`} role={status==="loading"?"status":"alert"}><span>{translate(locale,status==="loading"?"loading":"audioUnavailable")}</span>{status==="error"&&<button type="button" onClick={retry}>{translate(locale,"retry")}</button>}</div>;}

function LessonCompletionDialog({locale,lessonTitle,nextLessonName,busy,error,onNext,onRepeat,onAllLessons,onDismiss}:{locale:UiLocale;lessonTitle:string;nextLessonName?:string;busy:boolean;error:boolean;onNext:()=>void;onRepeat:()=>void;onAllLessons:()=>void;onDismiss:()=>void}){
  const dialogRef=useRef<HTMLDialogElement>(null),nextButtonRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const dialog=dialogRef.current;if(!dialog)return;let focusFrame:number|undefined;if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");focusFrame=requestAnimationFrame(()=>nextButtonRef.current?.focus());return()=>{if(focusFrame!==undefined)cancelAnimationFrame(focusFrame);if(dialog.open)dialog.close();};},[]);
  return <dialog ref={dialogRef} className="lesson-completion-dialog" aria-labelledby="lesson-completion-title" aria-describedby="lesson-completion-message" onCancel={event=>{event.preventDefault();onDismiss();}}>
    <button type="button" className="lesson-completion-close" aria-label={translate(locale,"closeDialog")} onClick={onDismiss}><X size={18}/></button>
    <div className="lesson-completion-icon" aria-hidden="true"><Star size={27} fill="currentColor"/></div>
    <p className="lesson-completion-eyebrow">{lessonTitle}</p>
    <h2 id="lesson-completion-title">{lessonCompletionT(locale,"title")}</h2>
    <p id="lesson-completion-message">{lessonCompletionT(locale,"message")}</p>
    {error&&<p className="lesson-completion-error" role="alert">{lessonT(locale,"resetLessonError")}</p>}
    <div className="lesson-completion-actions">
      <button type="button" disabled={busy} onClick={onRepeat}><RotateCcw size={16}/>{lessonCompletionT(locale,"repeatLesson")}</button>
      {nextLessonName&&<button ref={nextButtonRef} type="button" className="primary-button" autoFocus disabled={busy} onClick={onNext}><span>{lessonCompletionT(locale,"nextLesson")}</span><small>{nextLessonName}</small><ArrowRight size={17}/></button>}
    </div>
    <button type="button" className="lesson-completion-all" disabled={busy} onClick={onAllLessons}>{lessonCompletionT(locale,"allLessons")}</button>
  </dialog>;
}

function CategoryList({manifest,locale,onHome}:{manifest?:LessonManifest;locale:UiLocale;onHome:()=>void}){
  const [categories,setCategories]=useState<Category[]>([]);
  useEffect(()=>{let active=true;void getJson<{categories:Category[]}>("/api/listening/categories?language=en").then(result=>{if(active)setCategories(result.categories);}).catch(()=>undefined);return()=>{active=false;};},[]);
  const items=manifest?buildTopicSummaries(manifest.lessons,"en",categories):undefined;
  return <Shell wide locale={locale} onHome={onHome} title="English" breadcrumbs={[{label:translate(locale,"allTopics")}]}>
    {!items?<Loading locale={locale}/>:<section className="topics-catalog" aria-labelledby="topics-title">
      <header className="topics-heading"><span>{topicT(locale,"eyebrow")}</span><h1 id="topics-title">{translate(locale,"allTopics")}</h1><p>{topicT(locale,"intro")}</p></header>
      {items.length?<ul className="topics-grid">{items.map(item=>{const path=`/en/${item.slug}`,style={"--topic-hue":item.hue} as CSSProperties;return <li key={item.slug}><a className="topic-card" href={pathHref(path)} onClick={event=>followRouteLink(event,path)} aria-label={`${topicT(locale,"openTopic")}: ${item.name}`}><span className="topic-cover" style={style} aria-hidden="true"><BookOpen size={22}/><b>{item.initials}</b></span><span className="topic-card-body"><span className="topic-title-row"><h2>{item.name}</h2><ArrowRight className="topic-card-arrow" size={18}/></span>{item.description&&<p>{item.description}</p>}<span className="topic-meta"><span><b>{topicT(locale,"levels")}</b>{formatLevelRange(item.levels,topicT(locale,"allLevels"))}</span><span><Headphones size={14}/><b>{item.lessonCount}</b>{translate(locale,"lessons")}</span></span></span></a></li>;})}</ul>:<div className="content-state">{translate(locale,"noLessons")}</div>}
    </section>}
  </Shell>;
}

function SectionList({manifest,categorySlug,lessonStates,locale,onHome}:{manifest?:LessonManifest;categorySlug:string;lessonStates:LessonStateMap;locale:UiLocale;onHome:()=>void}){
  const [query,setQuery]=useState(""),[level,setLevel]=useState("all"),[openSections,setOpenSections]=useState<Set<string>>(new Set()),[sectionRecords,setSectionRecords]=useState<Section[]>([]);
  useEffect(()=>{let active=true;void getJson<{sections:Section[]}>(`/api/listening/sections?category=${encodeURIComponent(categorySlug)}`).then(result=>{if(active)setSectionRecords(result.sections);}).catch(()=>undefined);return()=>{active=false;};},[categorySlug]);
  const sections=manifest?buildLessonSections(manifest.lessons,"en",categorySlug,sectionRecords):undefined;
  const filteredSections=sections?filterLessonSections(sections,query,level):undefined;
  const levels=sections?collectLessonLevels(sections):[];
  const categoryName=sections?.[0]?.lessons[0]?.categoryName??formatCategory(categorySlug);
  const filtering=Boolean(query.trim())||level!=="all";
  useEffect(()=>{setQuery("");setLevel("all");setOpenSections(new Set());},[categorySlug]);
  useEffect(()=>{if(!filtering){setOpenSections(new Set());return;}if(!filteredSections)return;setOpenSections(new Set(filteredSections.map(section=>section.id)));},[query,level]);
  const toggle=(sectionId:string)=>setOpenSections(current=>{const next=new Set(current);if(next.has(sectionId))next.delete(sectionId);else next.add(sectionId);return next;});
  const clearFilters=()=>{setQuery("");setLevel("all");};
  return <Shell wide locale={locale} onHome={onHome} title={categoryName} breadcrumbs={[{label:translate(locale,"allTopics"),onClick:()=>navigate("/en")},{label:categoryName}]}>
    {!sections||!filteredSections?<Loading locale={locale}/>:<section className="section-catalog" aria-labelledby="section-catalog-title">
      <header className="section-catalog-heading"><div><span>{topicT(locale,"eyebrow")}</span><h1 id="section-catalog-title">{categoryName}</h1><p>{sectionT(locale,"intro")}</p></div><div className="section-filters" role="search"><label className="section-search"><span className="sr-only">{sectionT(locale,"search")}</span><Search size={17} aria-hidden="true"/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={sectionT(locale,"searchPlaceholder")}/>{query&&<button type="button" onClick={()=>setQuery("")} aria-label={sectionT(locale,"clearFilters")}><X size={15}/></button>}</label><label className="section-level-filter"><span className="sr-only">{translate(locale,"level")}</span><select value={level} onChange={event=>setLevel(event.target.value)}><option value="all">{sectionT(locale,"allLevels")}</option>{levels.map(item=><option value={item} key={item}>{item}</option>)}</select><ChevronDown size={16} aria-hidden="true"/></label></div></header>
      <div className="section-results" aria-live="polite"><span><b>{filteredSections.length}</b> {sectionT(locale,"sectionResults")}</span>{filtering&&<button type="button" onClick={clearFilters}><X size={14}/>{sectionT(locale,"clearFilters")}</button>}</div>
      {filteredSections.length?<div className="section-accordion">{filteredSections.map(section=>{const isOpen=openSections.has(section.id),panelId=`section-panel-${section.id}`;return <article className={`section-panel${isOpen?" open":""}`} key={section.id}><h2><button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={()=>toggle(section.id)}><span><b>{section.title||`${translate(locale,"section")} ${section.number}`}</b><small>{section.lessons.length} {translate(locale,"lessons")}</small></span><span className="section-toggle-label">{sectionT(locale,isOpen?"collapse":"expand")}</span><ChevronDown size={20} aria-hidden="true"/></button></h2>{isOpen&&<div className="section-lesson-grid" id={panelId}>{section.lessons.length?section.lessons.map(lesson=>{const lessonNumber=lesson.order,state=lessonStates[lesson.id],isCompleted=Boolean(state?.isCompleted||(lesson.sentenceCount>0&&loadGuest(lesson.id).size>=lesson.sentenceCount));return <a className={`section-lesson-card${isCompleted?" completed":""}`} href={lesson.path} onClick={event=>followPathLink(event,lesson.path)} key={lesson.id} aria-label={isCompleted?`${lesson.name} · ${lessonT(locale,"completedLesson")}`:lesson.name}><span className="section-lesson-number" aria-hidden="true">{String(lessonNumber).padStart(2,"0")}</span><span className="section-lesson-copy"><b>{lesson.name}</b><small><span>{lesson.sentenceCount} {sectionT(locale,"sentences")}</span><i aria-hidden="true"/><span>{translate(locale,"level")}: {lesson.level??sectionT(locale,"unknownLevel")}</span><i aria-hidden="true"/><span className="lesson-star-count" title={`${state?.starCount??0} ${lessonT(locale,"stars")}`}><Star size={12} aria-hidden="true"/>{state?.starCount??0}</span></small></span><ArrowRight size={17} aria-hidden="true"/></a>}):<p className="section-no-lessons">{translate(locale,"noLessons")}</p>}</div>}</article>;})}</div>:<div className="content-state section-empty"><Search size={24}/><p>{translate(locale,"noLessons")}</p><button type="button" onClick={clearFilters}>{sectionT(locale,"clearFilters")}</button></div>}
    </section>}
  </Shell>;
}

function LessonList({manifest,categorySlug,sectionId,lessonStates,locale,onHome}:{manifest?:LessonManifest;categorySlug:string;sectionId:string;lessonStates:LessonStateMap;locale:UiLocale;onHome:()=>void}){const items=manifest?.lessons.filter(x=>x.language==="en"&&x.categorySlug===categorySlug&&x.sectionId===sectionId);return <Shell locale={locale} onHome={onHome} title={translate(locale,"lessons")} breadcrumbs={[{label:translate(locale,"allTopics"),onClick:()=>navigate("/en")},{label:formatCategory(categorySlug),onClick:()=>navigate(`/en/${categorySlug}`)},{label:formatSection(sectionId,locale)}]}>{!items?<Loading locale={locale}/>:items.length?<div className="content-grid">{items.map(item=>{const state=lessonStates[item.id],isCompleted=Boolean(state?.isCompleted||(item.sentenceCount>0&&loadGuest(item.id).size>=item.sentenceCount));return <a className={`content-card${isCompleted?" completed":""}`} href={item.path} onClick={event=>followPathLink(event,item.path)} key={item.id}><span className="level-badge mint">{item.level??"—"}</span><h2>{item.name}</h2><small><Headphones size={14}/>{item.sentenceCount} {translate(locale,"sentences")} · <Star size={13}/>{state?.starCount??0}</small></a>})}</div>:<div className="content-state">{translate(locale,"noLessons")}</div>}</Shell>;}

function followRouteLink(event:React.MouseEvent<HTMLAnchorElement>,path:string){if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(path);}
function followPathLink(event:React.MouseEvent<HTMLAnchorElement>,path:string){if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigateToPath(path);}

const guestKey=(lessonId:string)=>`me2listen-listening-progress-${lessonId}`;
function loadGuest(lessonId:string){try{return new Set<string>(JSON.parse(localStorage.getItem(guestKey(lessonId))??"[]") as string[]);}catch{return new Set<string>();}}

function AudioLessonTemplate({playerRef,playableAudioSource,audioAttempt,audioError,locale,sentence,playbackRate,repeat,repeatDelayMs,onError,onPlaybackComplete,placeholder}:{playerRef:RefObject<AudioSegmentPlayerHandle|null>;playableAudioSource?:string;audioAttempt:number;audioError:boolean;locale:UiLocale;sentence:ListeningSentence;playbackRate:number;repeat:boolean;repeatDelayMs:number;onError:()=>void;onPlaybackComplete:()=>void;placeholder:React.ReactNode}){
  return playableAudioSource&&!audioError?<AudioSegmentPlayer key={audioAttempt} ref={playerRef} locale={locale} src={playableAudioSource} startMs={sentence.start_ms} endMs={sentence.end_ms} playbackRate={playbackRate} repeat={repeat} repeatDelayMs={repeatDelayMs} onError={onError} onPlaybackComplete={onPlaybackComplete}/>:placeholder;
}

function MediaLessonTemplate({playerRef,videoId,sentence,locale,playbackRate,repeat,repeatDelayMs,onTimeUpdate,onPlaybackComplete}:{playerRef:RefObject<YouTubeSegmentPlayerHandle|null>;videoId:string;sentence:ListeningSentence;locale:UiLocale;playbackRate:number;repeat:boolean;repeatDelayMs:number;onTimeUpdate:(timeMs:number)=>void;onPlaybackComplete:()=>void}){
  return <section className="media-lesson-template" aria-label="YouTube lesson media"><YouTubeSegmentPlayer ref={playerRef} videoId={videoId} startMs={sentence.start_ms} endMs={sentence.end_ms} locale={locale} playbackRate={playbackRate} repeat={repeat} repeatDelayMs={repeatDelayMs} onTimeUpdate={onTimeUpdate} onPlaybackComplete={onPlaybackComplete}/></section>;
}

function DictationLesson({manifest,lessonSlug,lessonPath,lessonStates,onLessonState,locale,onHome}:{manifest?:LessonManifest;lessonSlug?:string;lessonPath?:{level:string;category:string;slug:string};lessonStates:LessonStateMap;onLessonState:(lessonId:string,patch:Partial<Omit<LessonState,"lessonId">>)=>void;locale:UiLocale;onHome:()=>void}){
  const auth=useAuth(),audioPlayerRef=useRef<AudioSegmentPlayerHandle>(null),youtubePlayerRef=useRef<YouTubeSegmentPlayerHandle>(null),transcriptAudioRef=useRef<HTMLAudioElement>(null),textareaRef=useRef<HTMLTextAreaElement>(null),recognitionRef=useRef<BrowserSpeechRecognition|null>(null),startNextLessonAtBeginningRef=useRef(false),[lesson,setLesson]=useState<ListeningLesson>(),[failed,setFailed]=useState(false),[index,setIndex]=useState(0),[typed,setTyped]=useState(""),[submitted,setSubmitted]=useState(false),[revealed,setRevealed]=useState(false),[completed,setCompleted]=useState<Set<string>>(new Set()),[attempts,setAttempts]=useState(0),[speed,setSpeed]=useState(1),[mode,setMode]=useState<"dictation"|"transcript">("dictation"),[transcriptTimeMs,setTranscriptTimeMs]=useState(0),[saving,setSaving]=useState(false),[progressError,setProgressError]=useState(false),[lessonResetError,setLessonResetError]=useState(false),[favoriteBusy,setFavoriteBusy]=useState(false),[favoriteError,setFavoriteError]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[speechListening,setSpeechListening]=useState(false),[speechError,setSpeechError]=useState<SpeechRecognitionErrorKind|null>(null),[microphoneReady,setMicrophoneReady]=useState(false),[preferences,setPreferences]=useState<ListeningPreferences>(()=>loadLocalListeningPreferences("guest"));
  const [audioError,setAudioError]=useState(false),[audioAttempt,setAudioAttempt]=useState(0);
  const [playedSentenceIds,setPlayedSentenceIds]=useState<Set<string>>(new Set());
  const [lessonCompleteOpen,setLessonCompleteOpen]=useState(false);
  useEffect(()=>{let active=true;const resumePosition=!startNextLessonAtBeginningRef.current;startNextLessonAtBeginningRef.current=false;setFailed(false);setLesson(undefined);setIndex(0);const endpoint=lessonPath?`/api/listening/lessons/by-path?level=${encodeURIComponent(lessonPath.level)}&category=${encodeURIComponent(lessonPath.category)}&slug=${encodeURIComponent(lessonPath.slug)}`:`/api/listening/lessons/${encodeURIComponent(lessonSlug??"")}`;void getJson<{lesson:ListeningLesson}>(endpoint).then(({lesson:item})=>{if(!active)return;setLesson(item);setIndex(0);const local=loadGuest(item.id);setCompleted(local);if(auth.user)void getJson<{lesson:{current_sentence_position:number}|null;sentences:Array<{sentence_id:string;is_completed:boolean}>}>(`/api/listening/progress?lesson=${encodeURIComponent(item.id)}`).then(progress=>{if(!active)return;const merged=new Set(local);progress.sentences.filter(x=>x.is_completed).forEach(x=>merged.add(x.sentence_id));setCompleted(merged);if(resumePosition)setIndex(Math.max(0,Math.min(item.sentences.length-1,(progress.lesson?.current_sentence_position??1)-1)));}).catch(()=>undefined);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[lessonSlug,lessonPath?.level,lessonPath?.category,lessonPath?.slug,auth.user?.id]);
  useEffect(()=>{setTyped("");setSubmitted(false);setRevealed(false);setAttempts(0);setProgressError(false);},[index,lesson?.id]);
  useEffect(()=>{setAudioError(false);setAudioAttempt(0);},[lesson?.audio_url]);
  useEffect(()=>{setPlayedSentenceIds(new Set());},[lesson?.id]);
  useEffect(()=>setLessonCompleteOpen(false),[lesson?.id]);
  useEffect(()=>{const recognition=recognitionRef.current;recognitionRef.current=null;abortSpeechRecognition(recognition);setSpeechListening(false);setSpeechError(null);},[index,lesson?.id,mode]);
  useEffect(()=>()=>{const recognition=recognitionRef.current;recognitionRef.current=null;abortSpeechRecognition(recognition);},[]);
  useEffect(()=>{if(auth.loading)return;setPreferences(auth.user?.listeningPreferences??loadLocalListeningPreferences("guest"));},[auth.loading,auth.user?.id,auth.user?.listeningPreferences]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null,inSettings=Boolean(target?.closest(".listening-settings-dialog")),isFormControl=target?.matches("textarea,input,select,button");if(inSettings||event.repeat)return;if(event.key==="Escape"){const skipButton=document.querySelector<HTMLButtonElement>(".skip-answer-button");if(skipButton){event.preventDefault();skipButton.click();}return;}if(event.key==="Enter"&&!event.shiftKey&&!isFormControl){const checkButton=document.querySelector<HTMLButtonElement>(".check-answer-button:not(:disabled)");if(checkButton){event.preventDefault();checkButton.click();return;}}if(matchesReplayShortcut(event,preferences.replayKey)){event.preventDefault();audioPlayerRef.current?.replay();youtubePlayerRef.current?.replay();}else if(!isFormControl&&event.code===preferences.playPauseKey){event.preventDefault();audioPlayerRef.current?.toggle();youtubePlayerRef.current?.toggle();}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[preferences.playPauseKey,preferences.replayKey]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target?.matches("textarea,input,select,button")||target?.closest(".listening-settings-dialog")||event.repeat)return;if(!event.ctrlKey||event.shiftKey||event.altKey||event.metaKey||!(["[","]"] as string[]).includes(event.key))return;event.preventDefault();moveToSentence(index+(event.key==="]"?1:-1));};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[index]);
  useEffect(()=>{const buttons=document.querySelectorAll<HTMLButtonElement>(".lesson-toolbar-primary nav > button");buttons[0]?.setAttribute("title","Ctrl+[");buttons[1]?.setAttribute("title","Ctrl+]");},[lesson?.id]);
  if(failed)return <Shell locale={locale} onHome={onHome} title="English"><LoadError locale={locale} retry={()=>location.reload()}/></Shell>;if(!lesson)return <Loading locale={locale}/>;if(!lesson.sentences.length)return <Shell locale={locale} onHome={onHome} title={lesson.title}><div className="content-state">{translate(locale,"noLessons")}</div></Shell>;
  const SpeechRecognition=getSpeechRecognitionConstructor(),speechLocale=getSpeechRecognitionLocale(lesson.language_code),speechLanguageUnavailable=speechError==="languageUnsupported",speechAvailable=Boolean(SpeechRecognition&&speechLocale&&!speechLanguageUnavailable),speechButtonLabel=speechListening?speechRecognitionT(locale,"stop"):!SpeechRecognition?speechRecognitionT(locale,"unsupported"):!speechLocale||speechLanguageUnavailable?speechRecognitionT(locale,"languageUnsupported"):speechRecognitionT(locale,"start");
  const cancelSpeechRecognition=()=>{const recognition=recognitionRef.current;recognitionRef.current=null;abortSpeechRecognition(recognition);setSpeechListening(false);};
  const toggleSpeechRecognition=async()=>{
    const active=recognitionRef.current;
    if(active){try{active.stop();}catch{cancelSpeechRecognition();}return;}
    if(!SpeechRecognition||!speechLocale)return;
    if(!microphoneReady){
      try{await requestMicrophoneAccess();setMicrophoneReady(true);setSpeechError(null);}
      catch(error){setSpeechError(classifyMicrophoneAccessError(error));setSpeechListening(false);return;}
    }
    const recognition=new SpeechRecognition(),baseText=typed;
    recognition.lang=speechLocale;recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;recognitionRef.current=recognition;
    recognition.onstart=()=>{if(recognitionRef.current===recognition)setSpeechListening(true);};
    recognition.onresult=event=>{if(recognitionRef.current!==recognition)return;const recognized=collectRecognizedSpeech(event.results,lesson.language_code);setTyped(mergeRecognizedSpeech(baseText,recognized,lesson.language_code));setSubmitted(false);setSpeechError(null);};
    recognition.onerror=event=>{if(recognitionRef.current!==recognition)return;const kind=classifySpeechRecognitionError(event.error);recognitionRef.current=null;abortSpeechRecognition(recognition);if(kind)setSpeechError(kind);setSpeechListening(false);};
    recognition.onend=()=>{if(recognitionRef.current===recognition){recognitionRef.current=null;setSpeechListening(false);}};
    setSpeechError(null);
    try{recognition.start();setSpeechListening(true);}catch{cancelSpeechRecognition();setSpeechError("unknown");}
  };
  const sentence=lesson.sentences[index],explicitProperNames=explicitProperNamesFromMetadata(sentence.metadata),lessonState=lessonStates[lesson.id]??{lessonId:lesson.id,starCount:0,isStarred:false,isCompleted:false},evaluation=evaluateAnswer({expected:sentence.transcript,actual:typed,language:"en"}),isDone=completed.has(sentence.id),accepted=isDone||revealed||(submitted&&evaluation.correct),percent=Math.round(completed.size/lesson.sentences.length*100),activeTranscriptIndex=findActiveTranscriptIndex(lesson.sentences,transcriptTimeMs),nextLesson=findNextLesson(manifest,lesson.id);
  const properNouns=explicitProperNames??detectLikelyProperNouns(sentence.transcript);
  const complete=async(firstTryCorrect=attempts===0)=>{if(isDone)return;setProgressError(false);const next=new Set(completed).add(sentence.id);setCompleted(next);localStorage.setItem(guestKey(lesson.id),JSON.stringify([...next]));if(next.size>=lesson.sentences.length)onLessonState(lesson.id,{isCompleted:true});if(auth.user){setSaving(true);try{await auth.saveListeningProgress({lessonId:lesson.id,sentenceId:sentence.id,position:sentence.position,attemptCount:attempts+1,firstTryCorrect});}catch{/* local progress remains usable and can be retried */}finally{setSaving(false);}}};
  const submit=()=>{if(!typed.trim())return;setSubmitted(true);if(evaluation.correct)void complete();else setAttempts(value=>value+1);};
  const moveToSentence=(targetIndex:number)=>{if(targetIndex<0||targetIndex>=lesson.sentences.length||targetIndex===index)return;setIndex(targetIndex);};
  const next=()=>{if(!accepted)return;if(index===lesson.sentences.length-1){setLessonCompleteOpen(true);return;}moveToSentence(index+1);};
  const skip=()=>{setTyped(sentence.transcript);setSubmitted(true);setRevealed(true);void complete(false);};
  const retryAnswer=async()=>{
    if(!isDone||saving)return;
    cancelSpeechRecognition();setProgressError(false);
    const previous=new Set(completed),nextCompleted=new Set(completed);nextCompleted.delete(sentence.id);setCompleted(nextCompleted);localStorage.setItem(guestKey(lesson.id),JSON.stringify([...nextCompleted]));onLessonState(lesson.id,{isCompleted:false});setTyped("");setSubmitted(false);setRevealed(false);setAttempts(0);
    try{if(auth.user){setSaving(true);await auth.resetListeningProgress({lessonId:lesson.id,sentenceId:sentence.id,position:sentence.position});}requestAnimationFrame(()=>textareaRef.current?.focus());}
    catch{setCompleted(previous);localStorage.setItem(guestKey(lesson.id),JSON.stringify([...previous]));onLessonState(lesson.id,{isCompleted:previous.size>=lesson.sentences.length});setProgressError(true);}
    finally{setSaving(false);}
  };
  const clearLessonProgress=async()=>{
    cancelSpeechRecognition();setLessonResetError(false);const previous=new Set(completed),previousIndex=index;setSaving(true);setCompleted(new Set());localStorage.removeItem(guestKey(lesson.id));onLessonState(lesson.id,{isCompleted:false});setIndex(0);setTyped("");setSubmitted(false);setRevealed(false);setAttempts(0);
    try{if(auth.user)await auth.resetListeningLessonProgress(lesson.id);requestAnimationFrame(()=>textareaRef.current?.focus());return true;}
    catch{setCompleted(previous);localStorage.setItem(guestKey(lesson.id),JSON.stringify([...previous]));onLessonState(lesson.id,{isCompleted:previous.size>=lesson.sentences.length});setIndex(previousIndex);setLessonResetError(true);return false;}
    finally{setSaving(false);}
  };
  const resetLesson=async()=>{if(window.confirm(lessonT(locale,"resetLessonConfirm")))await clearLessonProgress();};
  const repeatLesson=async()=>{if(await clearLessonProgress())setLessonCompleteOpen(false);};
  const toggleFavorite=async()=>{
    if(!auth.user||favoriteBusy)return;
    setFavoriteBusy(true);setFavoriteError(false);
    try{const result=await auth.setListeningLessonFavorite(lesson.id,!lessonState.isStarred);onLessonState(lesson.id,{starCount:result.starCount,isStarred:result.isStarred});}
    catch{setFavoriteError(true);}
    finally{setFavoriteBusy(false);}
  };
  const savePreferences=async(nextPreferences:ListeningPreferences)=>{if(auth.user)await auth.saveListeningPreferences(nextPreferences);else saveLocalListeningPreferences("guest",nextPreferences);setPreferences(nextPreferences);};
  const onEnter=(event:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(event.key!=="Enter"||event.shiftKey)return;event.preventDefault();if(accepted)next();else if(!submitted)submit();};
  const playTranscriptSentence=(item:ListeningSentence)=>{setTranscriptTimeMs(item.start_ms);if(lesson.templateType==="media"){youtubePlayerRef.current?.playSegment(item.start_ms,item.end_ms);return;}const audio=transcriptAudioRef.current;if(audio)void seekAndPlayTranscript(audio,item.start_ms).catch(()=>undefined);};
  const playableAudioSource=lesson.audio_url?buildLessonAudioRequestUrl(lesson.audio_url,audioAttempt):undefined;
  const handleAudioError=()=>{if(audioAttempt===0){setAudioAttempt(1);return;}setAudioError(true);};
  const markPlaybackComplete=(sentenceId:string)=>setPlayedSentenceIds(current=>current.has(sentenceId)?current:new Set(current).add(sentenceId));
  const retryAudio=()=>{setAudioError(false);setAudioAttempt(value=>value+1);};
  const audioPlaceholder=<LessonAudioPlaceholder status={!lesson.audio_url?"missing":"error"} retry={retryAudio} locale={locale}/>;
  return <div className="dictation-shell">
    <main className="lesson-practice-page">
      <button type="button" className="lesson-back-button" onClick={()=>navigate(`/${lesson.language_code}/${lesson.category_slug}`)}><ArrowLeft size={16}/>{translate(locale,"backLibrary")}</button>
      <div className="lesson-practice-heading"><div><h1>{lesson.title}</h1><span>{lessonT(locale,"vocabLevel")}: <b>{lesson.level??sectionT(locale,"unknownLevel")}</b></span></div><div className="lesson-completion"><span>{completed.size}/{lesson.sentences.length} {translate(locale,"sentences")}</span><div><i style={{width:`${percent}%`}}/></div></div></div>
      {lesson.templateType==="media"&&lesson.media.type==="youtube"&&<MediaLessonTemplate playerRef={youtubePlayerRef} videoId={lesson.media.videoId} sentence={sentence} locale={locale} playbackRate={speed} repeat={preferences.autoReplay} repeatDelayMs={preferences.replayDelaySeconds*1000} onTimeUpdate={setTranscriptTimeMs} onPlaybackComplete={()=>markPlaybackComplete(sentence.id)}/>}
      <div className="mode-tabs lesson-mode-tabs" aria-label={translate(locale,"learningExperience")}><button type="button" aria-pressed={mode==="dictation"} className={`dictation-tab${mode==="dictation"?" active":""}`} onClick={()=>setMode("dictation")}><Headphones size={16}/><span>{lessonT(locale,"dictationTab")}</span></button><button type="button" aria-pressed={mode==="transcript"} className={`transcript-tab${mode==="transcript"?" active":""}`} onClick={()=>setMode("transcript")}><BookOpen size={16}/><span>{lessonT(locale,"transcriptTab")}</span></button></div>
      {mode==="transcript"?<section className="lesson-practice-card full-transcript-view">{lesson.templateType==="audio"&&(playableAudioSource&&!audioError?<audio key={audioAttempt} ref={transcriptAudioRef} aria-label={lessonT(locale,"fullLessonAudio")} controls preload="metadata" src={playableAudioSource} onError={handleAudioError} onLoadedMetadata={()=>setTranscriptTimeMs(0)} onTimeUpdate={event=>setTranscriptTimeMs(event.currentTarget.currentTime*1000)} onSeeked={event=>setTranscriptTimeMs(event.currentTarget.currentTime*1000)}/>:audioPlaceholder)}<ol>{lesson.sentences.map((item,itemIndex)=>{const isCurrent=itemIndex===activeTranscriptIndex;return <li className={`${isCurrent?"current ":""}${playedSentenceIds.has(item.id)?"played":""}`.trim()} aria-current={isCurrent?"step":undefined} data-playback-completed={playedSentenceIds.has(item.id)||undefined} key={item.id}><button type="button" className="transcript-sentence" onClick={()=>playTranscriptSentence(item)}><span>{itemIndex+1}</span><p>{item.transcript}</p></button></li>})}</ol></section>:<section className="lesson-practice-card">
        <div className="practice-toolbar"><div className="lesson-toolbar-primary"><nav aria-label={lessonT(locale,"sentenceProgress")}><button type="button" disabled={index===0} aria-label={lessonT(locale,"previousSentence")} onClick={()=>moveToSentence(index-1)}><ArrowLeft size={17}/></button><strong>{index+1} <span>/ {lesson.sentences.length}</span></strong><button type="button" disabled={index===lesson.sentences.length-1} aria-label={lessonT(locale,"nextSentence")} onClick={()=>moveToSentence(index+1)}><ArrowRight size={17}/></button></nav><div className="lesson-toolbar-actions"><button type="button" className="reset-lesson-button" disabled={saving||(!completed.size&&!typed.trim())} title={lessonT(locale,"resetLesson")} aria-label={lessonT(locale,"resetLesson")} onClick={()=>void resetLesson()}><RotateCcw size={15}/></button>{auth.user&&<button type="button" className={`favorite-lesson-button${lessonState.isStarred?" active":""}`} disabled={favoriteBusy} title={lessonT(locale,lessonState.isStarred?"removeFavorite":"addFavorite")} aria-label={lessonT(locale,lessonState.isStarred?"removeFavorite":"addFavorite")} aria-pressed={lessonState.isStarred} onClick={()=>void toggleFavorite()}><Star size={16} fill={lessonState.isStarred?"currentColor":"none"}/><span>{lessonState.starCount}</span></button>}</div></div><div className="playback-options"><button type="button" className="playback-settings-button" onClick={()=>setSettingsOpen(true)}><Settings2 size={15}/>{lessonT(locale,"settings")}</button><select aria-label={translate(locale,"playbackSpeed")} value={speed} onChange={event=>setSpeed(Number(event.target.value))}>{[.5,.75,1,1.25,1.5].map(value=><option key={value} value={value}>{value}×</option>)}</select></div></div>
        <div className="sentence-progress"><i style={{width:`${(index+1)/lesson.sentences.length*100}%`}}/></div>
        {(lessonResetError||favoriteError)&&<p className="lesson-toolbar-error" role="alert">{lessonT(locale,lessonResetError?"resetLessonError":"favoriteError")}</p>}
        {lesson.templateType==="audio"&&<div className="practice-audio"><AudioLessonTemplate playerRef={audioPlayerRef} playableAudioSource={playableAudioSource} audioAttempt={audioAttempt} audioError={audioError} locale={locale} sentence={sentence} playbackRate={speed} repeat={preferences.autoReplay} repeatDelayMs={preferences.replayDelaySeconds*1000} onError={handleAudioError} onPlaybackComplete={()=>markPlaybackComplete(sentence.id)} placeholder={audioPlaceholder}/></div>}{preferences.shortcutTips&&<div className="shortcut-key-tips"><span><kbd>{shortcutLabel(preferences.playPauseKey)}</kbd>{lessonT(locale,"playPauseShortcut")}</span><span><kbd>{shortcutLabel(preferences.replayKey)}</kbd>{lessonT(locale,"replayShortcut")}</span></div>}
        <div className={`dictation-workspace${accepted?" answer-visible":""}`}>
          <div className="dictation-entry">
            <label htmlFor="listening-answer">{translate(locale,"typePrompt")}</label>
            <div className="answer-input-wrap">
              <textarea ref={textareaRef} id="listening-answer" value={accepted?sentence.transcript:typed} readOnly={accepted} autoComplete={preferences.wordSuggestions?"on":"off"} autoCorrect={preferences.wordSuggestions?"on":"off"} spellCheck={preferences.wordSuggestions} onChange={event=>{cancelSpeechRecognition();setTyped(event.target.value);setSubmitted(false);}} onKeyDown={onEnter} placeholder={translate(locale,"typePlaceholder")} autoFocus={window.innerWidth>780}/>
              {isDone&&<button type="button" className="retry-answer-button" disabled={saving} title={lessonT(locale,"retryAnswer")} aria-label={lessonT(locale,"retryAnswer")} onClick={()=>void retryAnswer()}><RotateCcw size={16}/></button>}
              <button type="button" className={`microphone-placeholder${speechListening?" listening":""}`} disabled={accepted||!speechAvailable} title={speechButtonLabel} aria-label={speechButtonLabel} aria-pressed={speechListening} aria-describedby={speechListening||speechError?"speech-recognition-status":undefined} onClick={()=>void toggleSpeechRecognition()}><Mic size={17}/></button>
            </div>
            {properNouns.length>0&&<div className="proper-noun-suggestions"><span>{lessonT(locale,"properNounSuggestions")}</span>{properNouns.map(name=><b key={name}>{name}</b>)}</div>}
            {(speechListening||speechError)&&<p id="speech-recognition-status" className={`speech-recognition-status${speechError?" error":""}`} role={speechError?"alert":"status"}>{speechRecognitionT(locale,speechError??"listening")}</p>}
            {progressError&&<p className="progress-reset-error" role="alert">{lessonT(locale,"retryAnswerError")}</p>}
            {submitted&&!accepted&&<div className="word-result original-sentence-result" aria-live="polite">{evaluation.displayTokens.map((token,i)=><span key={`${token.text}-${i}`} className={token.status}>{token.status==="hidden"?token.text.replace(/[^\s]+/gu,"*****"):token.text}</span>)}</div>}
            <div className="answer-footer">
              <span>{saving?translate(locale,"saving"):accepted?(revealed?lessonT(locale,"revealedAnswer"):translate(locale,"correctMessage")):translate(locale,"caseHint")}</span>
              <div>{!accepted?<>
                {!submitted&&<span className="shortcut-tooltip"><button type="button" className="primary-button check-answer-button" aria-describedby="check-answer-tooltip" disabled={!typed.trim()} onClick={submit}>{translate(locale,"check")}</button><span id="check-answer-tooltip" className="shortcut-tooltip-content" role="tooltip">{lessonT(locale,"checkShortcut")}</span></span>}
                <span className="shortcut-tooltip"><button type="button" className="skip-button skip-answer-button" aria-describedby="skip-answer-tooltip" onClick={skip}>{translate(locale,"skip")}</button><span id="skip-answer-tooltip" className="shortcut-tooltip-content" role="tooltip">{lessonT(locale,"skipShortcut")}</span></span>
              </>:<button type="button" className="primary-button" onClick={next}>{index===lesson.sentences.length-1?lessonCompletionT(locale,"finish"):translate(locale,"next")}{index===lesson.sentences.length-1?<Check size={16}/>:<ArrowRight size={16}/>}</button>}</div>
            </div>
          </div>
          <aside className="answer-insight" aria-live="polite" hidden={!accepted}>{accepted&&<><LessonTranslationPanel lessonId={lesson.id} sentenceId={sentence.id} locale={locale}/><section><h2>{lessonT(locale,"pronunciation")}</h2><div className="pronunciation-words">{sentence.transcript.split(/\s+/u).map((word,wordIndex)=><span key={`${word}-${wordIndex}`}>{word}</span>)}</div><small>{lessonT(locale,"pronunciationHint")}</small></section></>}</aside>
        </div>
      </section>}
      <aside className="lesson-tip"><Lightbulb size={19}/><div><b>{lessonT(locale,"listeningTip")}</b><p>{lessonT(locale,"listeningTipText")}</p></div></aside>
      {nextLesson&&<a className="next-lesson-card" href={nextLesson.path} onClick={event=>followPathLink(event,nextLesson.path)}><span className="next-lesson-icon" aria-hidden="true"><Headphones size={21}/></span><span className="next-lesson-copy"><small>{lessonT(locale,"nextLesson")}</small><strong>{nextLesson.name}</strong><span>{nextLesson.categoryName} · {nextLesson.sectionTitle}{nextLesson.level?` · ${lessonT(locale,"vocabLevel")}: ${nextLesson.level}`:""} · {nextLesson.sentenceCount} {translate(locale,"sentences")}</span></span><ArrowRight className="next-lesson-arrow" size={21}/></a>}
    </main>{settingsOpen&&<ListeningSettingsDialog locale={locale} preferences={preferences} onClose={()=>setSettingsOpen(false)} onSave={savePreferences}/>}{lessonCompleteOpen&&<LessonCompletionDialog locale={locale} lessonTitle={lesson.title} nextLessonName={nextLesson?.name} busy={saving} error={lessonResetError} onNext={()=>{if(nextLesson){startNextLessonAtBeginningRef.current=true;navigate(nextLesson.path);}else navigate("/en");}} onRepeat={()=>void repeatLesson()} onAllLessons={()=>navigate("/en")} onDismiss={()=>setLessonCompleteOpen(false)}/>}
  </div>;
}

interface ManagedLesson {id:string;title:string;slug:string;path:string;level:string|null;description:string|null;sort_order:number;section_id:string;section_title:string;category_name:string;language_code:string;is_published:boolean;updated_at:string;sentences?:ReviewSentence[];}

export function LessonManagementPage({onHome,locale}:{onHome:()=>void;locale:UiLocale}){
  const auth=useAuth();
  const title=adminSystemT(locale,"lessonsTitle");
  const t=(key:Parameters<typeof lessonManagementT>[1],values?:Record<string,string|number>)=>lessonManagementT(locale,key,values);
  const [items,setItems]=useState<ManagedLesson[]>([]),[sections,setSections]=useState<Array<{section_id:string;category_name:string;section_title:string}>>([]),[query,setQuery]=useState(""),[exactPath,setExactPath]=useState(""),[status,setStatus]=useState("all"),[language,setLanguage]=useState("all"),[selected,setSelected]=useState<ManagedLesson>(),[selectedIds,setSelectedIds]=useState<Set<string>>(()=>new Set()),[titleDrafts,setTitleDrafts]=useState<Record<string,string>>({}),[sentencesJson,setSentencesJson]=useState("[]"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const load=()=>{if(!auth.user?.isAdmin)return;void Promise.all([getJson<{lessons:ManagedLesson[]}>(`/api/listening/admin/lessons?q=${encodeURIComponent(query)}&path=${encodeURIComponent(exactPath.trim())}&status=${encodeURIComponent(status)}&language=${encodeURIComponent(language)}`),getJson<{sections:typeof sections}>("/api/listening/admin/bootstrap")]).then(([lessonData,bootstrap])=>{setItems(lessonData.lessons);setTitleDrafts(Object.fromEntries(lessonData.lessons.map(item=>[item.id,item.title])));setSelectedIds(new Set());setSections(bootstrap.sections);setError("");}).catch(()=>setError(t("loadError")));};
  useEffect(load,[auth.user?.isAdmin,query,exactPath,status,language]);
  if(auth.loading)return <AdminLayout locale={locale} title={title} onSiteHome={onHome}><div className="admin-state">{adminSystemT(locale,"loading")}</div></AdminLayout>;
  if(!auth.user?.isAdmin)return <AdminLayout locale={locale} title={title} onSiteHome={onHome}><div className="admin-state">{adminSystemT(locale,"adminRequired")}</div></AdminLayout>;
  const open=async(id:string)=>{setBusy(true);setError("");try{const result=await getJson<{lesson:ManagedLesson}>(`/api/listening/admin/lessons/${encodeURIComponent(id)}`);setSelected(result.lesson);setSentencesJson(JSON.stringify(result.lesson.sentences??[],null,2));}catch{setError(t("openError"));}finally{setBusy(false);}};
  const save=async()=>{if(!selected)return;setBusy(true);setError("");try{const sentences=JSON.parse(sentencesJson) as unknown;await auth.adminUpdateLesson(selected.id,{title:selected.title,slug:selected.slug,level:selected.level,description:selected.description,sectionId:selected.section_id,sentences});setSelected(undefined);load();}catch{setError(t("updateError"));}finally{setBusy(false);}};
  const rename=async(item:ManagedLesson)=>{const nextTitle=(titleDrafts[item.id]??item.title).trim();if(!nextTitle||nextTitle===item.title)return;setBusy(true);setError("");try{await auth.adminUpdateLesson(item.id,{title:nextTitle});setItems(current=>current.map(row=>row.id===item.id?{...row,title:nextTitle}:row));}catch{setTitleDrafts(current=>({...current,[item.id]:item.title}));setError(t("renameError"));}finally{setBusy(false);}};
  const remove=async(item:ManagedLesson)=>{if(!window.confirm(t("deleteConfirm",{title:item.title})))return;setBusy(true);setError("");try{await auth.adminDeleteLesson(item.id);if(selected?.id===item.id)setSelected(undefined);load();}catch{setError(t("deleteError"));}finally{setBusy(false);}};
  const removeSelected=async()=>{const lessonIds=[...selectedIds];if(!lessonIds.length||!window.confirm(t("batchDeleteConfirm",{count:lessonIds.length})))return;setBusy(true);setError("");try{const result=await auth.adminDeleteLessons(lessonIds);if(selected&&result.deleted.includes(selected.id))setSelected(undefined);if(result.failed.length)setError(t("batchDeletePartial",{deleted:result.deleted.length,failed:result.failed.length}));setItems(current=>current.filter(item=>!result.deleted.includes(item.id)));setSelectedIds(new Set(result.failed.map(item=>item.lessonId)));}catch{setError(t("batchDeleteError"));}finally{setBusy(false);}};
  const selectableItems=items.slice(0,50),allVisibleSelected=selectableItems.length>0&&selectableItems.every(item=>selectedIds.has(item.id));
  const toggleAll=()=>setSelectedIds(allVisibleSelected?new Set():new Set(selectableItems.map(item=>item.id)));
  return <AdminLayout locale={locale} title={title} onSiteHome={onHome}>
    <button className="admin-inline-link" type="button" onClick={()=>navigate("/admin/listening")}>{adminSystemT(locale,"importTitle")}</button>
    <div className="admin-filters"><input aria-label={t("searchLessons")} value={query} onChange={event=>setQuery(event.target.value)} placeholder={t("searchPlaceholder")}/><input className="admin-exact-path" aria-label={t("exactPath")} value={exactPath} onChange={event=>setExactPath(event.target.value)} placeholder={t("exactPathPlaceholder")}/><select aria-label={t("status")} value={status} onChange={event=>setStatus(event.target.value)}><option value="all">{t("allStatuses")}</option><option value="published">{t("published")}</option><option value="draft">{t("draft")}</option></select><select aria-label={t("language")} value={language} onChange={event=>setLanguage(event.target.value)}><option value="all">{t("allLanguages")}</option><option value="en">{t("english")}</option><option value="zh">{t("chinese")}</option><option value="ja">{t("japanese")}</option></select></div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {selected?<form className="admin-import" onSubmit={event=>{event.preventDefault();void save();}}><label>{t("lessonId")}<input readOnly value={selected.id}/></label><label>{t("canonicalPath")}<input readOnly value={selected.path}/></label><label>{t("title")}<input required maxLength={200} value={selected.title} onChange={event=>setSelected({...selected,title:event.target.value})}/></label><label>{t("slug")}<input required value={selected.slug} onChange={event=>setSelected({...selected,slug:event.target.value})}/></label><label>{t("level")}<input value={selected.level??""} onChange={event=>setSelected({...selected,level:event.target.value})}/></label><label>{t("description")}<textarea value={selected.description??""} onChange={event=>setSelected({...selected,description:event.target.value})}/></label><label>{t("placement")}<select value={selected.section_id} onChange={event=>setSelected({...selected,section_id:event.target.value})}>{sections.map(item=><option key={item.section_id} value={item.section_id}>{item.category_name} · {item.section_title}</option>)}</select></label><label>{t("order")}<input readOnly value={String(selected.sort_order).padStart(2,"0")}/></label><label>{t("scriptJson")}<textarea required value={sentencesJson} onChange={event=>setSentencesJson(event.target.value)}/><small>{t("scriptHint")}</small></label><div><button type="button" onClick={()=>setSelected(undefined)}>{t("cancel")}</button><button className="primary-button" disabled={busy}>{t("saveChanges")}</button></div></form>:<><div className="admin-bulk-actions"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}/>{t("selectAll")}</label><span>{t("selectedCount",{count:selectedIds.size})}</span><button type="button" disabled={busy||!selectedIds.size} onClick={()=>void removeSelected()}>{t("batchDelete")}</button></div><div className="admin-lesson-list">{items.map(item=><article key={item.id}><label className="admin-lesson-select"><input type="checkbox" aria-label={t("selectLesson",{title:item.title})} checked={selectedIds.has(item.id)} disabled={!selectedIds.has(item.id)&&selectedIds.size>=50} onChange={()=>setSelectedIds(current=>{const next=new Set(current);next.has(item.id)?next.delete(item.id):next.add(item.id);return next;})}/></label><div className="admin-lesson-copy"><div className="admin-lesson-title-row"><input maxLength={200} value={titleDrafts[item.id]??item.title} onChange={event=>setTitleDrafts(current=>({...current,[item.id]:event.target.value}))}/><button type="button" disabled={busy||!(titleDrafts[item.id]??item.title).trim()||(titleDrafts[item.id]??item.title).trim()===item.title} onClick={()=>void rename(item)}>{t("rename")}</button></div><code>{item.path}</code><small>{String(item.sort_order).padStart(2,"0")} · {item.id} · {item.level??"—"} · {t(item.is_published?"published":"draft")} · {new Date(item.updated_at).toLocaleString(localeTags[locale])}</small></div><div className="admin-lesson-actions"><button type="button" disabled={busy} onClick={()=>void open(item.id)}>{t("editDetails")}</button>{item.is_published&&<a href={item.path} onClick={event=>followPathLink(event,item.path)}>{t("open")}</a>}<button type="button" disabled={busy} onClick={()=>void remove(item)}>{t("delete")}</button></div></article>)}</div></>}
  </AdminLayout>;
}

export function AdminListeningPage({onHome,locale}:{onHome:()=>void;locale:UiLocale}){return <LessonImportPage onHome={onHome} locale={locale}/>;}
