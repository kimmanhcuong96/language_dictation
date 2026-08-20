import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Flame,
  Gauge,
  Headphones,
  Heart,
  Home,
  Keyboard,
  Languages,
  Library,
  ListMusic,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trophy,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAuth } from "./auth";
import { lessons, lessonsByLanguage, targetLanguages } from "./data/lessons";
import { localeLabels, translate, type TranslationKey } from "./i18n";
import { lessonT } from "./lessonI18n";
import { resolveAudioUrl, speak } from "./lib/audio";
import { answerScore } from "./lib/text";
import { evaluateAnswer } from "./lib/dictation";
import { AudioSegmentPlayer } from "./components/AudioSegmentPlayer";
import { AdminDashboardPage } from "./components/admin/AdminDashboardPage";
import { TranslationReviewPage } from "./components/admin/TranslationReviewPage";
import { CommentModerationPage } from "./components/admin/CommentModerationPage";
import { clearProgress, loadProgress, saveProgress } from "./lib/storage";
import { migrateLegacyHashRoute, navigateToPath, resolveAppView, viewPath, type AppView } from "./router";
import type { Lesson, Level, ProgressMap, TargetLanguage, UiLocale } from "./types";
import { AdminListeningPage, EnglishLearningApp, LessonManagementPage } from "./listening";
import { useTheme } from "./theme";
import { adminSystemT } from "./adminSystemI18n";
import { LeaderboardModal } from "./components/LeaderboardModal";
import { LeaderboardSettingsPage } from "./components/admin/LeaderboardSettingsPage";
import { createActiveStudyTimer } from "./lib/activeStudyTimer";

type View = AppView;
const getInitialView = (): View => resolveAppView(window.location.pathname, window.location.hash);

const levelClass: Record<Level, string> = { A1: "mint", A2: "sky", B1: "amber", B2: "rose" };

function App() {
  const auth = useAuth();
  const [view, setView] = useState<View>(getInitialView);
  const [progress, setProgress] = useState<ProgressMap>(loadProgress);
  const [locale, setLocale] = useState<UiLocale>(() => {
    const saved = localStorage.getItem("me2listen-locale") ?? localStorage.getItem("echotype-locale");
    return saved === "en" || saved === "zh" || saved === "ja" || saved === "vi" ? saved : "vi";
  });

  useEffect(() => {
    migrateLegacyHashRoute(window.location.hash);
    const onLocationChange = () => setView(getInitialView());
    window.addEventListener("popstate", onLocationChange);
    return () => {
      window.removeEventListener("popstate", onLocationChange);
    };
  }, []);

  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => localStorage.setItem("me2listen-locale", locale), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale,"appTitle");
  }, [locale, view.page]);

  useEffect(() => {
    if (!auth.user) return;
    const languageByLesson = Object.fromEntries(lessons.flatMap((lesson) => [[lesson.id, lesson.language]]));
    void auth.syncProgress(loadProgress(), languageByLesson).then(setProgress).catch(() => undefined);
  }, [auth.user?.id]);

  const navigate = (next: View) => {
    if (next.page === "canonicalLesson") navigateToPath(next.path);
    else navigateToPath(viewPath(next));
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return view.page === "home" ? (
    <LanguageHome locale={locale} onLocale={setLocale} onChoose={(language) => navigate(language==="en"?{page:"english"}:{page:"coming",language})} />
  ) : view.page === "english" ? (
    <EnglishLearningApp locale={locale} onHome={() => navigate({page:"home"})} header={<LearningHeader language="en" locale={locale} onLocale={setLocale} onHome={() => navigate({page:"home"})} onDictation={() => navigate({page:"english"})} />} />
  ) : view.page === "canonicalLesson" ? (
    <EnglishLearningApp canonicalPath={view.path} locale={locale} onHome={() => navigate({page:"home"})} header={<LearningHeader language="en" locale={locale} onLocale={setLocale} onHome={() => navigate({page:"home"})} onDictation={() => navigate({page:"english"})} />} />
  ) : view.page === "adminDashboard" ? (
    <AdminDashboardPage locale={locale} onSiteHome={() => navigate({page:"home"})}/>
  ) : view.page === "admin" ? (
    <AdminListeningPage locale={locale} onHome={() => navigate({page:"home"})}/>
  ) : view.page === "adminManagement" ? (
    <LessonManagementPage locale={locale} onHome={() => navigate({page:"home"})}/>
  ) : view.page === "adminTranslations" ? (
    <TranslationReviewPage locale={locale} onSiteHome={() => navigate({page:"home"})}/>
  ) : view.page === "adminComments" ? (
    <CommentModerationPage locale={locale} onSiteHome={() => navigate({page:"home"})}/>
  ) : view.page === "adminLeaderboard" ? (
    <LeaderboardSettingsPage locale={locale} onSiteHome={() => navigate({page:"home"})}/>
  ) : view.page === "coming" ? (
    <ComingSoonPage language={view.language} locale={locale} onLocale={setLocale} onHome={() => navigate({page:"home"})}/>
  ) : view.page === "lesson" ? (
    <PracticePage
      lesson={lessonsByLanguage[view.language].find((lesson) => lesson.id === view.lessonId) ?? lessonsByLanguage[view.language][0]}
      progress={progress}
      onProgress={setProgress}
      locale={locale}
      onLocale={setLocale}
      onHome={() => navigate({ page: "home" })}
      onBack={() => navigate({ page: "library", language: view.language })}
      onOpenLesson={(lessonId) => navigate({ page: "lesson", language: view.language, lessonId })}
    />
  ) : (
    <LibraryPage language={view.language} locale={locale} onLocale={setLocale} progress={progress} onHome={() => navigate({ page: "home" })} onOpenLesson={(lessonId) => navigate({ page: "lesson", language: view.language, lessonId })} />
  );
}

function ComingSoonPage({language,locale,onLocale,onHome}:{language:"ja"|"zh";locale:UiLocale;onLocale:(locale:UiLocale)=>void;onHome:()=>void}){const meta=targetLanguages.find(item=>item.id===language)!;return <div className="learning-page"><LearningHeader language={language} locale={locale} onLocale={onLocale} onHome={onHome} onDictation={()=>navigateToPath(`/${language}`)}/><div className="content-shell"><main><div className="content-state"><Headphones size={32}/><h2>{getT(locale)("comingSoon")}</h2><p>{meta.nativeName}</p></div></main></div></div>;}

const getT = (locale: UiLocale) => (key: TranslationKey) => translate(locale, key);

function LocaleSelect({ locale, onLocale, dark = false }: { locale: UiLocale; onLocale: (locale: UiLocale) => void; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const locales = Object.keys(localeLabels) as UiLocale[];
  const flags: Record<UiLocale, string> = { vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ja: "🇯🇵" };

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div ref={rootRef} className={`locale-select ${dark ? "dark" : ""}`}>
    <span id="language-label" className="sr-only">{translate(locale,"interfaceLanguage")}</span>
    <button type="button" className="locale-trigger" aria-labelledby="language-label" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="locale-value"><span className={`locale-flag flag-${locale}`} aria-hidden="true">{flags[locale]}</span><span className="locale-name">{localeLabels[locale]}</span></span>
      <ChevronDown size={17} aria-hidden="true" />
    </button>
    {open && <div className="locale-menu" role="listbox" aria-labelledby="language-label">
      {locales.map((item) => <button key={item} type="button" role="option" aria-selected={item === locale} className={`locale-option ${item === locale ? "selected" : ""}`} onClick={() => { onLocale(item); setOpen(false); }}>
        <span className={`locale-flag flag-${item}`} aria-hidden="true">{flags[item]}</span><span>{localeLabels[item]}</span>
      </button>)}
    </div>}
  </div>;
}

function ThemeToggle({ locale }: { locale: UiLocale }) {
  const { theme, toggleTheme } = useTheme();
  const label = adminSystemT(locale, theme === "light" ? "darkTheme" : "lightTheme");
  return <button type="button" className="theme-toggle" title={label} aria-label={label} aria-pressed={theme === "dark"} onClick={toggleTheme}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button>;
}

function LanguageHome({ locale, onLocale, onChoose }: { locale: UiLocale; onLocale: (locale: UiLocale) => void; onChoose: (language: TargetLanguage) => void }) {
  const t = getT(locale);
  const [englishCategoryCount,setEnglishCategoryCount]=useState<number|null>(null);
  useEffect(()=>{void fetch("/api/listening/categories?language=en").then(response=>response.ok?response.json():Promise.reject()).then((body:{categories:unknown[]})=>setEnglishCategoryCount(body.categories.length)).catch(()=>setEnglishCategoryCount(0));},[]);
  const descriptions: Record<UiLocale, Record<TargetLanguage, string>> = {
    vi: { en: "Truyện và hội thoại bằng tiếng Anh-Mỹ và Anh-Anh", zh: "Tiếng Phổ thông với từ vựng thực tế hằng ngày", ja: "Tiếng Nhật giọng Tokyo qua những câu chuyện ngắn" },
    en: { en: "Stories and conversations in American and British English", zh: "Standard Mandarin with practical everyday vocabulary", ja: "Natural Tokyo Japanese through short, focused stories" },
    zh: { en: "通过美式与英式英语故事和对话学习", zh: "通过实用日常词汇学习标准普通话", ja: "通过短篇故事学习自然的东京日语" },
    ja: { en: "アメリカ英語とイギリス英語の物語・会話", zh: "日常で使える語彙と標準中国語", ja: "短い物語で学ぶ自然な東京の日本語" },
  };
  return <div className="language-home">
    <header className="landing-header"><Logo homeLabel={t("logoHome")} /><div className="landing-actions"><LeaderboardLauncher locale={locale} /><ThemeToggle locale={locale}/><LocaleSelect locale={locale} onLocale={onLocale} /><AccountMenu locale={locale} /></div></header>
    <main className="landing-main">
      <div className="landing-badge"><Headphones size={16} /> {t("landingBadge")}</div>
      <h1>{t("chooseTitle")}</h1>
      <p>{t("chooseSubtitle")}</p>
      <div className="language-grid">
        {targetLanguages.map((language, index) => <button key={language.id} className="language-card" onClick={() => onChoose(language.id)} style={{ "--language-color": language.color, "--delay": `${index * 80}ms` } as CSSProperties}>
          <span className="flag-orb">{language.flag}</span>
          <span className="language-title"><b>{language.nativeName}</b><small>{language.name}</small></span>
          <span className="language-description">{descriptions[locale][language.id]}</span>
          <span className="language-stats">{language.id==="en"?<span><BookOpen size={14}/>{englishCategoryCount??"…"} {t("topics")}</span>:<span><Clock3 size={14}/>{t("comingSoon")}</span>}</span>
          <span className="language-cta">{t("startLearning")} <ArrowRight size={17} /></span>
        </button>)}
      </div>
      <div className="landing-note"><Sparkles size={15} /> {t("freeForever")} · {t("changeLanguage")}</div>
    </main>
    <div className="landing-shape shape-one" /><div className="landing-shape shape-two" />
  </div>;
}

function Logo({homeLabel}:{homeLabel?:string}) {
  return (
    <div className="logo" aria-label={homeLabel}>
      <span className="logo-mark"><img src="/me2write-favicon.svg" alt="" /></span>
      <span>me2<span>listen</span></span>
    </div>
  );
}

function LearningHeader({ language, locale, onLocale, onHome, onDictation }: { language: TargetLanguage; locale: UiLocale; onLocale: (locale: UiLocale) => void; onHome: () => void; onDictation: () => void }) {
  const labels: Record<TargetLanguage, TranslationKey> = { en: "englishDictation", zh: "chineseDictation", ja: "japaneseDictation" };
  return <header className="landing-header learning-header">
    <div className="learning-brand">
      <button className="logo-home" onClick={onHome} aria-label={translate(locale,"logoHome")}><Logo /></button>
      <button className="dictation-button" onClick={onDictation}><Headphones size={17} /><span>{translate(locale, labels[language])}</span></button>
    </div>
    <div className="landing-actions">
      <LeaderboardLauncher locale={locale} />
      <ThemeToggle locale={locale}/>
      <LocaleSelect locale={locale} onLocale={onLocale} />
      <AccountMenu locale={locale} />
    </div>
  </header>;
}

function LibraryPage({ language, locale, onLocale, progress, onHome, onOpenLesson }: { language: TargetLanguage; locale: UiLocale; onLocale: (locale: UiLocale) => void; progress: ProgressMap; onHome: () => void; onOpenLesson: (id: string) => void }) {
  const t = getT(locale);
  const languageLessons = lessonsByLanguage[language];
  const languageMeta = targetLanguages.find((item) => item.id === language)!;
  const sections = Array.from(new Set(languageLessons.map((lesson) => lesson.section)));
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level | "All">("All");
  const [section, setSection] = useState<number | "All">("All");
  const [mobileNav, setMobileNav] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filtered = useMemo(
    () => languageLessons.filter((lesson) => {
      const matchesQuery = `${lesson.title} ${lesson.summary}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (level === "All" || lesson.level === level) && (section === "All" || lesson.section === section);
    }),
    [query, level, section, languageLessons],
  );

  const completed = languageLessons.filter((lesson) => (progress[lesson.id]?.completed.length ?? 0) > 0).length;
  const totalCorrect = languageLessons.reduce((sum, lesson) => sum + (progress[lesson.id]?.correct ?? 0), 0);
  const totalAttempts = languageLessons.reduce((sum, lesson) => sum + (progress[lesson.id]?.attempts ?? 0), 0);
  const featured = languageLessons.find((item) => (progress[item.id]?.completed.length ?? 0) < item.sentences.length) ?? languageLessons[0];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setMobileNav(true)} aria-label={t("openMenu")}><Menu size={21} /></button>
        <button className="logo-button" onClick={onHome}><Logo /></button>
        <div className="header-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} aria-label={t("search")} />
          <kbd>⌘ K</kbd>
        </div>
        <div className="header-actions">
          <ThemeToggle locale={locale}/>
          <LocaleSelect locale={locale} onLocale={onLocale} />
          <button className="streak-pill"><Flame size={17} fill="currentColor" /> <b>7</b></button>
          <AccountMenu locale={locale} />
        </div>
      </header>

      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <button className="icon-button close-nav" onClick={() => setMobileNav(false)} aria-label={t("closeMenu")}><X size={20} /></button>
        <nav>
          <p className="nav-label">{t("learning")}</p>
          <button className="nav-item" onClick={onHome}><Home size={19} />{t("home")}</button>
          <a className="nav-item active" href={`/${language}`}><Library size={19} />{t("library")}<span className="count">{languageLessons.length}</span></a>
          <button className="nav-item" type="button"><BarChart3 size={19} />{t("progress")}</button>
          <button className="nav-item" type="button"><Heart size={19} />{t("saved")}</button>
          <LeaderboardLauncher locale={locale} nav />
          <p className="nav-label">{languageMeta.flag} {languageMeta.nativeName}</p>
          <button className="nav-item topic active-topic"><span className="topic-dot coral" />{t("shortStories")}</button>
          <button className="nav-item topic"><span className="topic-dot blue" />{t("dailyConversations")}</button>
          <button className="nav-item topic"><span className="topic-dot yellow" />{t("travelCulture")}</button>
          <button className="nav-item topic"><span className="topic-dot green" />{t("workBusiness")}</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setShowSettings(true)}><Settings size={19} />{t("settings")}</button>
          <button className="nav-item"><CircleHelp size={19} />{t("guide")}</button>
        </div>
      </aside>

      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label={t("closeMenu")} />}

      <main className="library-main">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">{languageMeta.flag} {languageMeta.nativeName.toUpperCase()}</p>
            <h1>{t("dailyPractice")}</h1>
            <p>{t("dailySubtitle")}</p>
          </div>
          <div className="weekly-card">
            <div className="week-ring"><span>{completed}</span><small>/ {languageLessons.length}</small></div>
            <div><b>{t("weekProgress")}</b><span>{totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0}% {t("accuracy")}</span></div>
          </div>
        </section>

        <section className="featured-card">
          <div className="featured-copy">
            <div className="featured-tag"><Sparkles size={15} /> {t("suggested")}</div>
            <span className={`level-badge ${levelClass[featured.level]}`}>{featured.level}</span>
            <h2>{featured.title}</h2>
            <p>{featured.summary}</p>
            <div className="meta-row">
              <span><ListMusic size={16} /> {featured.sentences.length} {t("sentences")}</span>
              <span><Clock3 size={16} /> {featured.duration} {t("minutes")}</span>
              <span><Volume2 size={16} /> {t("voice")} {featured.accent}</span>
            </div>
            <button className="primary-button" onClick={() => onOpenLesson(featured.id)}><Play size={17} fill="currentColor" /> {t("begin")}</button>
          </div>
          <div className="featured-art" aria-hidden="true">
            <div className="sun" />
            <div className="hill one" /><div className="hill two" />
            <div className="person"><span className="head" /><span className="body" /><span className="leg l" /><span className="leg r" /></div>
            <div className="sound-wave"><i /><i /><i /><i /><i /></div>
            <span className="art-emoji">{featured.emoji}</span>
          </div>
        </section>

        <section className="lessons-section">
          <div className="section-heading">
            <div><h2>{t("allStories")}</h2><span>{filtered.length} {t("lessons")}</span></div>
            <div className="filter-row">
              <label className="select-wrap">{t("level")}
                <select value={level} onChange={(event) => setLevel(event.target.value as Level | "All")}>
                  <option value="All">{t("all")}</option><option>A1</option><option>A2</option><option>B1</option><option>B2</option>
                </select><ChevronDown size={15} />
              </label>
              <label className="select-wrap">{t("section")}
                <select value={section} onChange={(event) => setSection(event.target.value === "All" ? "All" : Number(event.target.value))}>
                  <option value="All">{t("all")}</option>{sections.map((item) => <option key={item} value={item}>{t("section")} {item}</option>)}
                </select><ChevronDown size={15} />
              </label>
            </div>
          </div>

          {filtered.length ? sections.map((sectionNumber) => {
            const items = filtered.filter((lesson) => lesson.section === sectionNumber);
            if (!items.length) return null;
            return (
              <div className="lesson-group" key={sectionNumber}>
                <div className="group-title"><span>{t("section")} {sectionNumber}</span><i /></div>
                <div className="lesson-grid">
                  {items.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} done={progress[lesson.id]?.completed.length ?? 0} t={t} onClick={() => onOpenLesson(lesson.id)} />
                  ))}
                </div>
              </div>
            );
          }) : <div className="empty-state"><Search size={28} /><h3>{t("noLessons")}</h3><p>{t("retryFilter")}</p></div>}
        </section>

        <footer>© 2026 Me2Listen · {t("footerTagline")}</footer>
      </main>

      {showSettings && <SettingsModal t={t} onClose={() => setShowSettings(false)} onReset={() => { clearProgress(); location.reload(); }} />}
    </div>
  );
}

function LessonCard({ lesson, done, t, onClick }: { lesson: Lesson; done: number; t: ReturnType<typeof getT>; onClick: () => void }) {
  const percent = Math.round((done / lesson.sentences.length) * 100);
  return (
    <button className="lesson-card" onClick={onClick}>
      <span className="lesson-number">{String(lesson.number).padStart(2, "0")}</span>
      <span className="lesson-emoji">{lesson.emoji}</span>
      <span className={`level-badge ${levelClass[lesson.level]}`}>{lesson.level}</span>
      <span className="lesson-copy"><b>{lesson.title}</b><small>{lesson.summary}</small></span>
      <span className="lesson-meta"><span><ListMusic size={14} />{lesson.sentences.length} {t("sentences")}</span><span><Clock3 size={14} />{lesson.duration} {t("minutes")}</span></span>
      <span className="card-progress"><i style={{ width: `${percent}%` }} /></span>
      <span className="start-circle">{percent === 100 ? <Check size={18} /> : <ArrowRight size={18} />}</span>
    </button>
  );
}

function PracticePage({ lesson, progress, onProgress, locale, onLocale, onHome, onBack, onOpenLesson }: {
  lesson: Lesson;
  progress: ProgressMap;
  onProgress: (value: ProgressMap) => void;
  locale: UiLocale;
  onLocale: (locale: UiLocale) => void;
  onHome: () => void;
  onBack: () => void;
  onOpenLesson: (id: string) => void;
}) {
  const t = getT(locale);
  const auth = useAuth();
  const initialIndex = Math.min(progress[lesson.id]?.completed.length ?? 0, lesson.sentences.length - 1);
  const [index, setIndex] = useState(initialIndex);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeStudyTimer = useRef(createActiveStudyTimer());
  const sentence = lesson.sentences[index];
  const evaluation = evaluateAnswer({ expected: sentence.text, actual: typed, language: lesson.language });
  const lessonDone = progress[lesson.id]?.completed.length ?? 0;
  const percent = Math.round((lessonDone / lesson.sentences.length) * 100);

  useEffect(() => {
    setTyped(""); setChecked(false); setScore(0); setShowTranslation(false); setPlaying(false);
    activeStudyTimer.current.reset(document.visibilityState === "visible" && document.hasFocus());
  }, [index, lesson.id]);

  useEffect(() => {
    const pause=()=>activeStudyTimer.current.pause();
    const resume=()=>{if(document.visibilityState==="visible"&&document.hasFocus())activeStudyTimer.current.resume();};
    const visibility=()=>document.visibilityState==="visible"?resume():pause();
    window.addEventListener("focus",resume);window.addEventListener("blur",pause);document.addEventListener("visibilitychange",visibility);resume();
    return()=>{pause();window.removeEventListener("focus",resume);window.removeEventListener("blur",pause);document.removeEventListener("visibilitychange",visibility);};
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      if (event.code === "Space" && !isTyping) {
        event.preventDefault();
        playSentence();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const playSentence = () => {
    speak(sentence.text, speed, lesson.accent);
  };

  const check = () => {
    if (!typed.trim()) return;
    const result = evaluateAnswer({ expected: sentence.text, actual: typed, language: lesson.language });
    const nextScore = result.correct ? 100 : answerScore(sentence.text, typed);
    setScore(nextScore); setChecked(true);
    const existing = progress[lesson.id] ?? { completed: [], attempts: 0, correct: 0, updatedAt: "" };
    const completed = nextScore >= 80 && !existing.completed.includes(index) ? [...existing.completed, index] : existing.completed;
    onProgress({ ...progress, [lesson.id]: { completed, attempts: existing.attempts + 1, correct: existing.correct + (nextScore >= 80 ? 1 : 0), updatedAt: new Date().toISOString() } });
    const durationSeconds=activeStudyTimer.current.elapsedSeconds();
    activeStudyTimer.current.reset(document.visibilityState === "visible" && document.hasFocus());
    void auth.recordActivity({
      lessonId: lesson.id,
      language: lesson.language,
      sentenceIndex: index,
      typedAnswer: typed,
      durationSeconds,
    });
  };

  const next = () => {
    if (index < lesson.sentences.length - 1) setIndex(index + 1);
    else {
      const languageLessons = lessonsByLanguage[lesson.language];
      const lessonIndex = languageLessons.findIndex((item) => item.id === lesson.id);
      onOpenLesson(languageLessons[(lessonIndex + 1) % languageLessons.length].id);
    }
  };

  return (
    <div className="practice-shell">
      <header className="practice-header">
        <button className="logo-button" onClick={onHome} aria-label={t("logoHome")}><Logo /></button>
        <button className="back-link" onClick={onBack}><ArrowLeft size={18} /> {t("backLibrary")}</button>
        <div className="practice-title"><span>{lesson.emoji}</span><div><b>{lesson.number}. {lesson.title}</b><small><span className={`level-dot ${levelClass[lesson.level]}`} />{lesson.level} · {t("voice")} {lesson.accent}</small></div></div>
        <div className="header-progress"><span><b>{lessonDone}</b> / {lesson.sentences.length} {t("sentences")}</span><div><i style={{ width: `${percent}%` }} /></div></div>
        <div className="practice-user-actions"><ThemeToggle locale={locale}/><LocaleSelect locale={locale} onLocale={onLocale} /><AccountMenu locale={locale} /></div>
      </header>

      <main className="practice-main">
        <section className="practice-content">
          <div className="step-label"><span>{t("sentence").toUpperCase()} {index + 1} / {lesson.sentences.length}</span><i /></div>

          <div className="audio-stage">
            <AudioSegmentPlayer locale={locale} src={resolveAudioUrl(lesson.audioKey ?? sentence.audio) ?? ""} startMs={sentence.startMs ?? 0} endMs={sentence.endMs ?? 4000} playbackRate={speed} repeat={repeat} />
            <button className={`play-main ${playing ? "playing" : ""}`} onClick={() => playing && audioRef.current && !audioRef.current.paused ? audioRef.current.pause() : playSentence()} aria-label={lessonT(locale,playing?"pauseSentence":"playSentence")}>
              {playing ? <Pause size={27} fill="currentColor" /> : <Play size={29} fill="currentColor" />}
            </button>
            <div className="fake-wave" aria-hidden="true">{Array.from({ length: 54 }, (_, i) => <i key={i} style={{ height: `${12 + ((i * 17) % 31)}px` }} />)}</div>
            <span className="audio-time">0:00 / 0:04</span>
          </div>

          <div className="audio-tools">
            <button className={repeat ? "active" : ""} onClick={() => setRepeat(!repeat)}><RotateCcw size={16} /> {t("repeat")}</button>
            <button onClick={() => setSpeed(speed === 1 ? .75 : speed === .75 ? 1.25 : 1)}><Gauge size={16} /> {speed}×</button>
            <span className="shortcut"><kbd>Space</kbd> {t("spaceListen")}</span>
          </div>

          <div className={`answer-panel ${checked ? score >= 80 ? "success" : "retry" : ""}`}>
            <div className="answer-heading"><label htmlFor="answer">{t("typePrompt")}</label><span>{typed.length} {t("characters")}</span></div>
            {!checked ? (
              <textarea id="answer" lang={lesson.language} value={typed} onChange={(event) => setTyped(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (checked) next(); else check(); } }} placeholder={t("typePlaceholder")} autoFocus />
            ) : (
              <div className="word-result original-sentence-result">{evaluation.displayTokens.map((item, i) => <span key={`${item.text}-${i}`} className={item.status}>{item.status === "hidden" ? item.text.replace(/[^\s]+/gu, "*****") : item.text}</span>)}</div>
            )}
            <div className="answer-footer">
              {!checked ? <span><Keyboard size={16} /> {t("caseHint")}</span> : <div className="score-message"><span className="score-icon">{score >= 80 ? <Check size={18} /> : <RotateCcw size={17} />}</span><div><b>{score >= 80 ? t("excellent") : t("almost")} <em>{score}%</em></b><small>{score >= 80 ? t("correctMessage") : t("retryMessage")}</small></div></div>}
              <button className="primary-button" onClick={checked ? next : check} disabled={!typed.trim() || (checked && !evaluation.correct)}>{checked ? <>{t("next")} <ArrowRight size={17} /></> : <>{t("check")} <Check size={17} /></>}</button>
            </div>
          </div>

          <div className="help-row">
            <button onClick={() => setShowTranslation(!showTranslation)}><Languages size={17} /> {showTranslation ? sentence.translation : t("translation")}</button>
            <button onClick={() => setShowTranscript(true)}><BookOpen size={17} /> {t("transcript")}</button>
          </div>
        </section>

        <aside className="sentence-list">
          <div className="queue-heading"><div><span className="overline">{t("progress").toUpperCase()}</span><b>{t("sentenceList")}</b></div><span>{percent}%</span></div>
          <div className="queue-progress"><i style={{ width: `${percent}%` }} /></div>
          <div className="queue-items">
            {lesson.sentences.map((item, itemIndex) => {
              const done = progress[lesson.id]?.completed.includes(itemIndex);
              return <button key={item.id} className={itemIndex === index ? "current" : ""} onClick={() => setIndex(itemIndex)}><span className={done ? "done" : ""}>{done ? <Check size={14} /> : itemIndex + 1}</span><p>{itemIndex === index || done ? item.text : t("listenComplete")}</p>{itemIndex === index && <Headphones size={16} />}</button>;
            })}
          </div>
          <div className="tip-card"><span>💡</span><div><b>{t("tip")}</b><p>{t("tipText")}</p></div></div>
        </aside>
      </main>

      {showTranscript && <TranscriptModal lesson={lesson} audioUrl={lesson.audioKey ? resolveAudioUrl(lesson.audioKey) : undefined} locale={locale} t={t} onClose={() => setShowTranscript(false)} onPlay={(text) => speak(text, speed, lesson.accent)} />}
    </div>
  );
}

function AccountMenu({ locale }: { locale: UiLocale }) {
  const t = getT(locale);
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (auth.loading) return <span className="account-pill account-pill-loading" aria-hidden="true"><span className="account-trigger-avatar avatar-loading"/><span/></span>;
  if (!auth.user) return <button className="login-button" onClick={auth.login}><LogIn size={16} />{t("signIn")}</button>;
  const initials = auth.user.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const saveName = async () => {
    setSaving(true); setError("");
    try { await auth.rename(name); setEditing(false); setOpen(false); }
    catch { setError(t("displayNameValidation")); }
    finally { setSaving(false); }
  };

  return <div className="account-wrap">
    <div className="account-pill">
      <button className="account-trigger" type="button" onClick={() => setOpen(!open)} aria-label={auth.user.displayName} aria-controls="account-popover" aria-expanded={open}><span className="account-trigger-avatar">{auth.user.avatarUrl ? <img src={auth.user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}</span><span className="account-trigger-name">{auth.user.displayName}</span></button>
      <button className="account-quick-logout" type="button" title={t("logout")} aria-label={t("logout")} onClick={() => void auth.logout()}><LogOut size={16}/></button>
    </div>
    {open && <div className="account-popover" id="account-popover">
      <div className="account-summary"><span className="mini-avatar">{auth.user.avatarUrl ? <img src={auth.user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}</span><div><b>{auth.user.displayName}</b><small>{auth.user.email}</small></div></div>
      <button onClick={() => { setName(auth.user!.displayName); setEditing(true); }}><UserRound size={16} />{t("editName")}</button>
      {auth.user.isAdmin && <button onClick={() => { navigateToPath("/admin"); setOpen(false); }}><Library size={16} />{t("contentManagement")}</button>}
      <label className="ranking-privacy"><span><Trophy size={16} /><span><b>{t("publicRanking")}</b><small>{t("publicRankingHint")}</small></span></span><span className="switch"><input type="checkbox" checked={auth.user.leaderboardVisible} onChange={(event) => void auth.setLeaderboardVisible(event.target.checked)} /><i /></span></label>
      <button className="logout-item" onClick={() => void auth.logout()}><LogOut size={16} />{t("logout")}</button>
    </div>}
    {editing && <div className="modal-backdrop" onMouseDown={() => setEditing(false)}><section className="modal name-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditing(false)} aria-label={t("closeDialog")}><X size={20} /></button><span className="overline">{t("editName").toUpperCase()}</span><h2>{t("displayName")}</h2><input aria-label={t("displayName")} value={name} maxLength={40} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveName(); }} />{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button onClick={() => setEditing(false)}>{t("cancel")}</button><button className="primary-button" disabled={saving || [...name.trim()].length < 2} onClick={() => void saveName()}>{t("save")}</button></div></section></div>}
  </div>;
}

function LeaderboardLauncher({ locale, nav = false }: { locale: UiLocale; nav?: boolean }) {
  const t = getT(locale);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); };
  return <><a className={nav ? "nav-item platform-link platform-link-talk" : "platform-link platform-link-talk"} href="https://me2talk.com/" target="_blank" rel="noreferrer">Me2talk</a><a className={nav ? "nav-item platform-link platform-link-write" : "platform-link platform-link-write"} href="https://write-checker.pages.dev/" target="_blank" rel="noreferrer">Me2write</a>{nav ? <button ref={launcherRef} type="button" className="nav-item leaderboard-nav-item" onClick={() => setOpen(true)}><Trophy size={19} />{t("leaderboard")}</button> : <button ref={launcherRef} type="button" className="leaderboard-button" onClick={() => setOpen(true)} aria-label={t("leaderboard")}><Trophy size={17} /><span>{t("leaderboard")}</span></button>}{open && <LeaderboardModal locale={locale} onClose={close} />}</>;
}

function TranscriptModal({ lesson, audioUrl, locale, t, onClose, onPlay }: { lesson: Lesson; audioUrl?: string; locale:UiLocale; t: ReturnType<typeof getT>; onClose: () => void; onPlay: (text: string) => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal transcript-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label={t("closeDialog")}><X size={20} /></button><span className="overline">{t("fullTranscript")}</span><h2>{lesson.title}</h2><p className="modal-summary">{lesson.summary}</p>{audioUrl && <audio className="full-transcript-audio" controls preload="metadata" src={audioUrl} aria-label={lessonT(locale,"fullLessonAudio")} />}<div className="transcript-lines">{lesson.sentences.map((sentence, index) => <button key={sentence.id} onClick={() => onPlay(sentence.text)}><span>{index + 1}</span><div><b>{sentence.text}</b><small>{sentence.translation}</small></div><Play size={15} /></button>)}</div></section></div>;
}

function SettingsModal({ t, onClose, onReset }: { t: ReturnType<typeof getT>; onClose: () => void; onReset: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal settings-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label={t("closeDialog")}><X size={20} /></button><span className="overline">{t("settings").toUpperCase()}</span><h2>{t("learningExperience")}</h2><div className="setting-row"><div><b>{t("autoPlay")}</b><small>{t("autoPlayHint")}</small></div><label className="switch"><input type="checkbox" /><i /></label></div><div className="setting-row"><div><b>{t("showTranslation")}</b><small>{t("showTranslationHint")}</small></div><label className="switch"><input type="checkbox" defaultChecked /><i /></label></div><button className="danger-button" onClick={onReset}>{t("reset")}</button></section></div>;
}

export default App;
