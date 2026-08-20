import { Clock3, Languages, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { adminLeaderboardT } from "../../adminLeaderboardI18n";
import { adminSystemT } from "../../adminSystemI18n";
import { useAuth, type LeaderboardSettings } from "../../auth";
import type { UiLocale } from "../../types";
import { AdminLayout } from "./AdminLayout";

type EditableSettings=Omit<LeaderboardSettings,"updatedAt">;
const defaults:EditableSettings={study7DayLimit:50,study30DayLimit:50,translation7DayLimit:50,translation30DayLimit:50};

export function LeaderboardSettingsPage({locale,onSiteHome}:{locale:UiLocale;onSiteHome:()=>void}){
  const auth=useAuth(),[settings,setSettings]=useState(defaults),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<"load"|"save"|null>(null),[saved,setSaved]=useState(false),[reload,setReload]=useState(0);
  useEffect(()=>{let active=true;if(!auth.user?.isAdmin){setLoading(false);return;}setLoading(true);setError(null);void auth.adminGetLeaderboardSettings().then(result=>{if(active)setSettings(stripTimestamp(result));}).catch(()=>{if(active)setError("load");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[auth.user?.isAdmin,reload]);
  const valid=Object.values(settings).every(value=>Number.isInteger(value)&&value>=1&&value<=100);
  const update=(key:keyof EditableSettings,value:string)=>setSettings(current=>({...current,[key]:Number(value)}));
  const save=async()=>{if(!valid)return;setSaving(true);setError(null);setSaved(false);try{const result=await auth.adminUpdateLeaderboardSettings(settings);setSettings(stripTimestamp(result));setSaved(true);}catch{setError("save");}finally{setSaving(false);}};
  const title=adminLeaderboardT(locale,"title");
  if(auth.loading||loading)return <AdminLayout locale={locale} title={title} onSiteHome={onSiteHome}><div className="admin-state" role="status">{adminSystemT(locale,"loading")}</div></AdminLayout>;
  if(!auth.user?.isAdmin)return <AdminLayout locale={locale} title={title} onSiteHome={onSiteHome}><div className="admin-state">{adminSystemT(locale,"adminRequired")}</div></AdminLayout>;
  if(error==="load")return <AdminLayout locale={locale} title={title} onSiteHome={onSiteHome}><div className="admin-state"><p role="alert">{adminLeaderboardT(locale,"loadError")}</p><button type="button" className="primary-button admin-settings-save" onClick={()=>setReload(value=>value+1)}>{adminLeaderboardT(locale,"retry")}</button></div></AdminLayout>;
  return <AdminLayout locale={locale} title={title} onSiteHome={onSiteHome}><p className="admin-dashboard-intro">{adminLeaderboardT(locale,"description")}</p><div className="leaderboard-settings-grid"><SettingsGroup locale={locale} icon={<Clock3 size={22}/>} title={adminLeaderboardT(locale,"studyTime")} last7Days={settings.study7DayLimit} last30Days={settings.study30DayLimit} on7Days={value=>update("study7DayLimit",value)} on30Days={value=>update("study30DayLimit",value)}/><SettingsGroup locale={locale} icon={<Languages size={22}/>} title={adminLeaderboardT(locale,"translations")} last7Days={settings.translation7DayLimit} last30Days={settings.translation30DayLimit} on7Days={value=>update("translation7DayLimit",value)} on30Days={value=>update("translation30DayLimit",value)}/></div>{error==="save"&&<p className="admin-form-message error" role="alert">{adminLeaderboardT(locale,"saveError")}</p>}{saved&&<p className="admin-form-message success" role="status">{adminLeaderboardT(locale,"saved")}</p>}<button type="button" className="primary-button admin-settings-save" disabled={!valid||saving} onClick={()=>void save()}><Save size={16}/>{adminLeaderboardT(locale,saving?"saving":"save")}</button></AdminLayout>;
}

function SettingsGroup({locale,icon,title,last7Days,last30Days,on7Days,on30Days}:{locale:UiLocale;icon:React.ReactNode;title:string;last7Days:number;last30Days:number;on7Days:(value:string)=>void;on30Days:(value:string)=>void}){return <section className="leaderboard-settings-card"><header><span>{icon}</span><h2>{title}</h2></header><div><LimitInput locale={locale} label={adminLeaderboardT(locale,"week")} value={last7Days} onChange={on7Days}/><LimitInput locale={locale} label={adminLeaderboardT(locale,"month")} value={last30Days} onChange={on30Days}/></div></section>}
function LimitInput({locale,label,value,onChange}:{locale:UiLocale;label:string;value:number;onChange:(value:string)=>void}){const invalid=!Number.isInteger(value)||value<1||value>100;return <label><span>{label}</span><small>{adminLeaderboardT(locale,"topCount")}</small><input type="number" min="1" max="100" step="1" value={Number.isNaN(value)?"":value} aria-invalid={invalid} onChange={event=>onChange(event.target.value)}/><em>{adminLeaderboardT(locale,"rangeHint")}</em></label>}
function stripTimestamp(settings:LeaderboardSettings):EditableSettings{const {updatedAt:_updatedAt,...editable}=settings;return editable;}
