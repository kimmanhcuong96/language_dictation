import { Settings2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { translate } from "../i18n";
import { playPauseKeys, replayDelays, shortcutKeys, shortcutLabel, type ListeningPreferences } from "../lib/listeningPreferences";
import { lessonT } from "../lessonI18n";
import type { UiLocale } from "../types";

interface Props {
  locale: UiLocale;
  preferences: ListeningPreferences;
  onClose: () => void;
  onSave: (preferences: ListeningPreferences) => Promise<void>;
}

export function ListeningSettingsDialog({ locale, preferences, onClose, onSave }: Props) {
  const [draft,setDraft]=useState(preferences),[saving,setSaving]=useState(false),[error,setError]=useState(false);
  const dialogRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const dialog=dialogRef.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();onClose();return;}
      if(event.key!=="Tab"||!dialog)return;
      const focusable=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled)')];
      if(!focusable.length)return;
      const first=focusable[0],last=focusable.at(-1)!;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener("keydown",keydown);document.body.style.overflow="hidden";
    return()=>{document.removeEventListener("keydown",keydown);document.body.style.overflow="";previous?.focus();};
  },[onClose]);
  const save=async()=>{setSaving(true);setError(false);try{await onSave(draft);onClose();}catch{setError(true);}finally{setSaving(false);}};
  return <div className="listening-settings-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><div ref={dialogRef} className="listening-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="listening-settings-title"><header><div><Settings2 size={22}/><h2 id="listening-settings-title">{lessonT(locale,"settingsTitle")}</h2></div><button type="button" onClick={onClose} aria-label={lessonT(locale,"closeSettings")}><X size={20}/></button></header><p className="settings-description">{lessonT(locale,"settingsDescription")}</p><div className="listening-setting-rows"><SettingRow label={lessonT(locale,"replayKey")}><select value={draft.replayKey} onChange={event=>setDraft({...draft,replayKey:event.target.value as ListeningPreferences["replayKey"]})}>{shortcutKeys.map(key=><option key={key} value={key}>{shortcutLabel(key)}</option>)}</select></SettingRow><SettingRow label={lessonT(locale,"playPauseKey")}><select value={draft.playPauseKey} onChange={event=>setDraft({...draft,playPauseKey:event.target.value as ListeningPreferences["playPauseKey"]})}>{playPauseKeys.map(key=><option key={key} value={key}>{shortcutLabel(key)}</option>)}</select></SettingRow><SettingRow label={lessonT(locale,"autoReplay")}><BooleanSelect value={draft.autoReplay} onChange={value=>setDraft({...draft,autoReplay:value})} locale={locale}/></SettingRow><SettingRow label={lessonT(locale,"replayDelay")}><select value={draft.replayDelaySeconds} disabled={!draft.autoReplay} onChange={event=>setDraft({...draft,replayDelaySeconds:Number(event.target.value) as ListeningPreferences["replayDelaySeconds"]})}>{replayDelays.map(value=><option key={value} value={value}>{value} {lessonT(locale,"seconds")}</option>)}</select></SettingRow><SettingRow label={lessonT(locale,"wordSuggestions")}><BooleanSelect value={draft.wordSuggestions} onChange={value=>setDraft({...draft,wordSuggestions:value})} locale={locale}/></SettingRow><SettingRow label={lessonT(locale,"shortcutTips")}><BooleanSelect value={draft.shortcutTips} onChange={value=>setDraft({...draft,shortcutTips:value})} locale={locale}/></SettingRow></div>{error&&<p className="settings-save-error" role="alert">{lessonT(locale,"settingsSaveError")}</p>}<footer><button type="button" onClick={onClose}>{translate(locale,"cancel")}</button><button type="button" className="primary-button" disabled={saving} onClick={()=>void save()}>{saving?translate(locale,"saving"):translate(locale,"save")}</button></footer></div></div>;
}

function SettingRow({label,children}:{label:string;children:React.ReactNode}){return <label className="listening-setting-row"><span>{label}</span>{children}</label>;}
function BooleanSelect({value,onChange,locale}:{value:boolean;onChange:(value:boolean)=>void;locale:UiLocale}){return <select value={String(value)} onChange={event=>onChange(event.target.value==="true")}><option value="true">{lessonT(locale,"enabled")}</option><option value="false">{lessonT(locale,"disabled")}</option></select>;}
