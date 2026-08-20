import { Clock3, Languages, Medal, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, type LeaderboardEntry, type LeaderboardMetric, type LeaderboardPeriod } from "../auth";
import { translate } from "../i18n";
import { leaderboardT } from "../leaderboardI18n";
import type { UiLocale } from "../types";

interface BoardState { leaders:LeaderboardEntry[]; limit:number; loading:boolean; error:boolean; }
const emptyBoard:BoardState={leaders:[],limit:0,loading:true,error:false};

export function LeaderboardModal({locale,onClose}:{locale:UiLocale;onClose:()=>void}) {
  const auth=useAuth(),[metric,setMetric]=useState<LeaderboardMetric>("study_time"),[reload,setReload]=useState(0);
  const closeButtonRef=useRef<HTMLButtonElement>(null);
  const [boards,setBoards]=useState<Record<LeaderboardPeriod,BoardState>>({"7d":emptyBoard,"30d":emptyBoard});
  const load=useCallback(()=>setReload(value=>value+1),[]);
  useEffect(()=>{
    let active=true;setBoards({"7d":emptyBoard,"30d":emptyBoard});
    void Promise.allSettled((["7d","30d"] as const).map(async period=>({period,result:await auth.leaderboard(metric,period)}))).then(results=>{
      if(!active)return;
      const next={"7d":{...emptyBoard},"30d":{...emptyBoard}};
      for(const result of results){if(result.status==="fulfilled")next[result.value.period]={leaders:result.value.result.leaders,limit:result.value.result.limit,loading:false,error:false};else{const period=results.indexOf(result)===0?"7d":"30d";next[period]={leaders:[],limit:0,loading:false,error:true};}}
      setBoards(next);
    });return()=>{active=false;};
  },[auth.leaderboard,metric,reload]);
  useEffect(()=>{const handleKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};document.addEventListener("keydown",handleKeyDown);closeButtonRef.current?.focus();return()=>document.removeEventListener("keydown",handleKeyDown);},[onClose]);
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal leaderboard-modal leaderboard-modal-v2" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title" onMouseDown={event=>event.stopPropagation()}><button ref={closeButtonRef} type="button" className="modal-close" onClick={onClose} aria-label={translate(locale,"closeDialog")}><X size={20}/></button><span className="overline"><Medal size={14}/>{leaderboardT(locale,"title").toUpperCase()}</span><h2 id="leaderboard-title">{leaderboardT(locale,"title")}</h2><p className="leaderboard-subtitle">{leaderboardT(locale,"subtitle")}</p>
    <div className="leaderboard-metric-tabs" role="tablist" aria-label={leaderboardT(locale,"title")}><button type="button" role="tab" aria-selected={metric==="study_time"} aria-controls="leaderboard-panels" className={metric==="study_time"?"active":""} onClick={()=>setMetric("study_time")}><Clock3 size={17}/>{leaderboardT(locale,"studyTime")}</button><button type="button" role="tab" aria-selected={metric==="translations"} aria-controls="leaderboard-panels" className={metric==="translations"?"active":""} onClick={()=>setMetric("translations")}><Languages size={17}/>{leaderboardT(locale,"translations")}</button></div>
    <div id="leaderboard-panels" className="leaderboard-board-grid" role="tabpanel" aria-live="polite">{(["7d","30d"] as const).map(period=><LeaderboardBoard key={`${metric}-${period}`} locale={locale} metric={metric} period={period} board={boards[period]} currentUserId={auth.user?.id??null} onRetry={load}/>)}</div>
  </section></div>;
}

function LeaderboardBoard({locale,metric,period,board,currentUserId,onRetry}:{locale:UiLocale;metric:LeaderboardMetric;period:LeaderboardPeriod;board:BoardState;currentUserId:string|null;onRetry:()=>void}){
  const top=board.leaders.filter(entry=>entry.rank<=board.limit),currentOutside=board.leaders.find(entry=>entry.user_id===currentUserId&&entry.rank>board.limit);
  return <section className="leaderboard-board" aria-labelledby={`leaderboard-${period}`}><header><div><span>{period==="7d"?"7":"30"}</span><h3 id={`leaderboard-${period}`}>{leaderboardT(locale,period==="7d"?"last7Days":"last30Days")}</h3></div>{!board.loading&&!board.error&&<small>TOP {board.limit}</small>}</header><div className="leader-list">{board.loading?Array.from({length:5},(_,index)=><div className="leader-skeleton" key={index}/>):board.error?<div className="empty-leaders"><p>{leaderboardT(locale,"loadError")}</p><button type="button" onClick={onRetry}>{leaderboardT(locale,"retry")}</button></div>:top.length?top.map(entry=><LeaderRow key={entry.user_id} locale={locale} metric={metric} entry={entry} current={entry.user_id===currentUserId}/>):<div className="empty-leaders"><Trophy size={25}/><p>{leaderboardT(locale,"noActivity")}</p></div>}</div>{currentOutside&&<div className="current-rank"><small>{leaderboardT(locale,"yourPosition")}</small><LeaderRow locale={locale} metric={metric} entry={currentOutside} current/></div>}</section>;
}

function LeaderRow({locale,metric,entry,current}:{locale:UiLocale;metric:LeaderboardMetric;entry:LeaderboardEntry;current:boolean}){
  const initials=entry.display_name.split(/\s+/u).map(part=>part[0]).join("").slice(0,2).toUpperCase();
  const value=metric==="study_time"?formatDuration(locale,entry.value):leaderboardT(locale,"sentenceCount",{count:entry.value});
  return <div className={`leader-row ${current?"is-current":""}`}><span className={`rank rank-${entry.rank}`}>{entry.rank<=3?["🥇","🥈","🥉"][entry.rank-1]:entry.rank}</span><span className="leader-avatar">{entry.avatar_url?<img src={entry.avatar_url} alt="" referrerPolicy="no-referrer"/>:initials}</span><div className="leader-name"><b>{entry.display_name}</b></div><strong>{value}</strong></div>;
}

function formatDuration(locale:UiLocale,totalSeconds:number){const seconds=Math.max(0,Math.floor(totalSeconds));if(seconds<60)return leaderboardT(locale,"seconds",{seconds});const totalMinutes=Math.floor(seconds/60),hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;return hours?leaderboardT(locale,"hoursMinutes",{hours,minutes}):leaderboardT(locale,"minutes",{minutes:totalMinutes});}
