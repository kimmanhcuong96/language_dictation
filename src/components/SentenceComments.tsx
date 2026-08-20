import { Flag, MessageCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, type SentenceComment } from "../auth";
import { SENTENCE_COMMENT_MAX_LENGTH, truncateSentenceComment } from "../lib/sentenceComments";
import { sentenceCommentsT } from "../sentenceCommentsI18n";
import type { UiLocale } from "../types";

const localeTags: Record<UiLocale, string> = { vi:"vi-VN", en:"en-US", zh:"zh-CN", ja:"ja-JP" };

export function SentenceComments({ sentenceId, sentenceNumber, locale }: { sentenceId:string; sentenceNumber:number; locale:UiLocale }) {
  const auth=useAuth(),t=(key:Parameters<typeof sentenceCommentsT>[1],values?:Record<string,string|number>)=>sentenceCommentsT(locale,key,values);
  const [comments,setComments]=useState<SentenceComment[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[retry,setRetry]=useState(0);
  const [draft,setDraft]=useState(""),[posting,setPosting]=useState(false),[deletingId,setDeletingId]=useState<string>(),[reportingId,setReportingId]=useState<string>(),[error,setError]=useState<"load"|"post"|"rate"|"delete"|"report">();

  useEffect(()=>{let active=true;setLoading(true);setError(undefined);setComments([]);setCursor(null);void auth.getSentenceComments(sentenceId).then(page=>{if(!active)return;setComments(page.comments);setCursor(page.nextCursor);}).catch(()=>{if(active)setError("load");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[sentenceId,retry,auth.user?.id]);

  const post=async()=>{const body=draft.trim();if(!body||posting)return;setPosting(true);setError(undefined);try{const comment=await auth.createSentenceComment(sentenceId,body);setComments(current=>[comment,...current.filter(item=>item.id!==comment.id)]);setDraft("");}catch(reason){setError(reason instanceof Error&&reason.message.includes("comment_rate_limited")?"rate":"post");}finally{setPosting(false);}};
  const loadMore=async()=>{if(!cursor||loadingMore)return;setLoadingMore(true);setError(undefined);try{const page=await auth.getSentenceComments(sentenceId,cursor);setComments(current=>{const known=new Set(current.map(item=>item.id));return [...current,...page.comments.filter(item=>!known.has(item.id))];});setCursor(page.nextCursor);}catch{setError("load");}finally{setLoadingMore(false);}};
  const remove=async(comment:SentenceComment)=>{if(deletingId||!window.confirm(t("deleteConfirm")))return;setDeletingId(comment.id);setError(undefined);try{await auth.deleteSentenceComment(comment.id);setComments(current=>current.filter(item=>item.id!==comment.id));}catch{setError("delete");}finally{setDeletingId(undefined);}};
  const report=async(comment:SentenceComment)=>{if(reportingId)return;const details=window.prompt(t("reportReason"));if(details===null)return;setReportingId(comment.id);setError(undefined);try{await auth.reportSentenceComment(comment.id,"OTHER",truncateSentenceComment(details).trim()||undefined);window.alert(t("reportSuccess"));}catch{setError("report");}finally{setReportingId(undefined);}};
  const count=[...draft].length,titleId=`sentence-comments-${sentenceId}`;

  return <section className="sentence-comments" aria-labelledby={titleId}>
    <header><div><MessageCircle size={18}/><h2 id={titleId}>{t("title")}</h2></div><span>{t("sentence",{number:sentenceNumber})}</span></header>
    {auth.user?<form className="sentence-comment-form" onSubmit={event=>{event.preventDefault();void post();}}><label className="sr-only" htmlFor={`${titleId}-body`}>{t("placeholder")}</label><textarea id={`${titleId}-body`} rows={3} value={draft} placeholder={t("placeholder")} onChange={event=>setDraft(truncateSentenceComment(event.target.value))}/><div><small>{t("characterCount",{count,max:SENTENCE_COMMENT_MAX_LENGTH})}</small><button className="primary-button" disabled={posting||!draft.trim()}><Send size={15}/>{posting?t("posting"):t("post")}</button></div></form>:!auth.loading&&<div className="sentence-comment-signin"><p>{t("signInPrompt")}</p><button type="button" onClick={auth.login}>{t("signIn")}</button></div>}
    {error&&<p className="sentence-comment-error" role="alert">{t(error==="rate"?"rateLimited":error==="delete"?"deleteError":error==="report"?"reportError":error==="post"?"postError":"loadError")}{error==="load"&&<button type="button" onClick={()=>setRetry(value=>value+1)}>{t("retry")}</button>}</p>}
    {loading?<div className="sentence-comment-loading" role="status">{t("loadingMore")}</div>:comments.length?<ol className="sentence-comment-list">{comments.map(comment=><li key={comment.id}><div className="sentence-comment-avatar" aria-hidden="true">{comment.author.avatarUrl?<img src={comment.author.avatarUrl} alt="" referrerPolicy="no-referrer"/>:comment.author.displayName.slice(0,1).toUpperCase()}</div><div><header><strong>{comment.author.displayName}</strong><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat(localeTags[locale],{dateStyle:"medium",timeStyle:"short"}).format(new Date(comment.createdAt))}</time>{comment.isOwner?<button type="button" disabled={deletingId===comment.id} aria-label={t("delete")} title={t("delete")} onClick={()=>void remove(comment)}><Trash2 size={14}/></button>:auth.user&&<button type="button" disabled={reportingId===comment.id} aria-label={t("report")} title={t("report")} onClick={()=>void report(comment)}><Flag size={14}/></button>}</header><p>{comment.body}</p></div></li>)}</ol>:<p className="sentence-comment-empty">{t("empty")}</p>}
    {cursor&&!loading&&<button className="sentence-comments-more" type="button" disabled={loadingMore} onClick={()=>void loadMore()}>{loadingMore?t("loadingMore"):t("loadMore")}</button>}
  </section>;
}
