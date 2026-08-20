import { MessageSquareWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, type ReportedSentenceComment } from "../../auth";
import { commentModerationT } from "../../commentModerationI18n";
import { adminSystemT } from "../../adminSystemI18n";
import type { UiLocale } from "../../types";
import { AdminLayout } from "./AdminLayout";

export function CommentModerationPage({locale,onSiteHome}:{locale:UiLocale;onSiteHome:()=>void}){
  const auth=useAuth(),t=(key:Parameters<typeof commentModerationT>[1])=>commentModerationT(locale,key),[items,setItems]=useState<ReportedSentenceComment[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const load=()=>{if(!auth.user?.isAdmin)return;setBusy(true);void auth.adminGetReportedComments().then(result=>{setItems(result.comments);setError("");}).catch(()=>setError(t("loadError"))).finally(()=>setBusy(false));};
  useEffect(load,[auth.user?.isAdmin]);
  if(auth.loading)return <AdminLayout locale={locale} title={t("title")} onSiteHome={onSiteHome}><div className="admin-state">{adminSystemT(locale,"loading")}</div></AdminLayout>;
  if(!auth.user?.isAdmin)return <AdminLayout locale={locale} title={t("title")} onSiteHome={onSiteHome}><div className="admin-state">{adminSystemT(locale,"adminRequired")}</div></AdminLayout>;
  const moderate=async(item:ReportedSentenceComment)=>{const reason=window.prompt(t("reason"))?.trim();if(!reason)return;setBusy(true);setError("");try{await auth.adminModerateComment(item.id,item.status==="VISIBLE"?"hide":"restore",reason);load();}catch{setError(t("actionError"));setBusy(false);}};
  return <AdminLayout locale={locale} title={t("title")} onSiteHome={onSiteHome}><p className="admin-dashboard-intro">{t("description")}</p>{error&&<p className="form-error" role="alert">{error}</p>}<div className="comment-moderation-list">{items.map(item=><article key={item.id}><header><span><MessageSquareWarning size={17}/><strong>{item.lessonTitle} · #{item.position}</strong></span><b>{item.reportCount} {t("reports")}</b></header><small>{item.authorName} · {item.reasons.join(", ")}</small><p>{item.body}</p><blockquote>{item.transcript}</blockquote><button disabled={busy} className={item.status==="VISIBLE"?"danger-button":"primary-button"} type="button" onClick={()=>void moderate(item)}>{item.status==="VISIBLE"?t("hide"):t("restore")}</button></article>)}{!busy&&!items.length&&<div className="admin-state">{t("empty")}</div>}</div></AdminLayout>;
}
