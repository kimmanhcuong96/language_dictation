import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;
export type AdminUsersSqlFactory = (env: Env) => NeonSql;

interface AdminActor { id:string; email:string }
interface ModerationInput { action:"block"|"unblock"; reason:string }

const PAGE_SIZE=25,MAX_PAGE_SIZE=100,MAX_JSON_BYTES=16*1024;

export async function routeAdminUsers(request:Request,env:Env,url:URL,actor:AdminActor,sqlFactory:AdminUsersSqlFactory=sqlFor):Promise<Response|null>{
  if(request.method==="GET"&&url.pathname==="/api/admin/users")return listUsers(sqlFactory(env),env,url);
  const match=url.pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})\/moderation$/iu);
  if(request.method==="PATCH"&&match)return moderateUser(request,sqlFactory(env),env,actor,match[1]);
  return null;
}

async function listUsers(sql:NeonSql,env:Env,url:URL){
  const query=(url.searchParams.get("q")??"").trim();
  const status=url.searchParams.get("status")??"all";
  const page=Number(url.searchParams.get("page")??1);
  const limit=Number(url.searchParams.get("limit")??PAGE_SIZE);
  if([...query].length>100)return json({error:"invalid_query"},422);
  if(status!=="all"&&status!=="active"&&status!=="blocked")return json({error:"invalid_status"},422);
  if(!Number.isInteger(page)||page<1||!Number.isInteger(limit)||limit<1||limit>MAX_PAGE_SIZE)return json({error:"invalid_pagination"},422);
  const search=`%${query}%`,offset=(page-1)*limit;
  const rows=await sql`
    WITH comment_stats AS (
      SELECT user_id,COUNT(*)::int AS comment_count,
        COUNT(*) FILTER (WHERE status='VISIBLE')::int AS visible_comment_count
      FROM listening_sentence_comments GROUP BY user_id
    ), lesson_stats AS (
      SELECT user_id,COUNT(*) FILTER (WHERE is_completed=true)::int AS completed_lesson_count
      FROM listening_lesson_progress GROUP BY user_id
    ), activity_stats AS (
      SELECT user_id,COALESCE(SUM(duration_seconds),0)::int AS study_seconds_30d
      FROM learning_activity_events WHERE occurred_at>=now()-interval '30 days' GROUP BY user_id
    ), translation_stats AS (
      SELECT submitted_by AS user_id,
        COUNT(DISTINCT (sentence_id,language_code)) FILTER (WHERE approved_at IS NOT NULL)::int AS approved_translation_count
      FROM listening_sentence_translation_versions WHERE source='USER' AND submitted_by IS NOT NULL GROUP BY submitted_by
    ), session_stats AS (
      SELECT user_id,MAX(last_seen_at)::bigint AS last_seen_at FROM sessions GROUP BY user_id
    )
    SELECT u.id,u.email,u.display_name AS "displayName",u.avatar_url AS "avatarUrl",
      u.leaderboard_visible AS "leaderboardVisible",u.is_blocked AS "isBlocked",
      u.blocked_at AS "blockedAt",u.block_reason AS "blockReason",
      blocker.display_name AS "blockedByName",u.created_at::bigint AS "createdAt",
      u.updated_at::bigint AS "updatedAt",session_stats.last_seen_at AS "lastSeenAt",
      COALESCE(comment_stats.comment_count,0)::int AS "commentCount",
      COALESCE(comment_stats.visible_comment_count,0)::int AS "visibleCommentCount",
      COALESCE(lesson_stats.completed_lesson_count,0)::int AS "completedLessonCount",
      COALESCE(activity_stats.study_seconds_30d,0)::int AS "studySeconds30d",
      COALESCE(translation_stats.approved_translation_count,0)::int AS "approvedTranslationCount",
      COUNT(*) OVER()::int AS "totalCount"
    FROM users u
    LEFT JOIN users blocker ON blocker.id=u.blocked_by
    LEFT JOIN comment_stats ON comment_stats.user_id=u.id
    LEFT JOIN lesson_stats ON lesson_stats.user_id=u.id
    LEFT JOIN activity_stats ON activity_stats.user_id=u.id
    LEFT JOIN translation_stats ON translation_stats.user_id=u.id
    LEFT JOIN session_stats ON session_stats.user_id=u.id
    WHERE (${status}='all' OR (${status}='blocked' AND u.is_blocked=true) OR (${status}='active' AND u.is_blocked=false))
      AND (${query}='' OR u.email ILIKE ${search} OR u.display_name ILIKE ${search})
    ORDER BY u.is_blocked DESC,u.created_at DESC,u.id
    LIMIT ${limit} OFFSET ${offset}`;
  const adminEmails=adminEmailSet(env);
  return json({
    users:rows.map(({totalCount:_,...row})=>({...row,isAdmin:adminEmails.has(String(row.email).toLocaleLowerCase())})),
    page,limit,total:Number(rows[0]?.totalCount??0),
  });
}

async function moderateUser(request:Request,sql:NeonSql,env:Env,actor:AdminActor,targetId:string){
  const input=await readModerationInput(request);
  if(!input)return json({error:"invalid_moderation"},422);
  const targetRows=await sql`SELECT id,email,is_blocked AS "isBlocked" FROM users WHERE id=${targetId} LIMIT 1`;
  const target=targetRows[0];
  if(!target)return json({error:"not_found"},404);
  if(isProtectedModerationTarget(actor.id,targetId,String(target.email),env.ADMIN_EMAILS))return json({error:"protected_user"},409);
  const shouldBlock=input.action==="block";
  if(Boolean(target.isBlocked)===shouldBlock)return json({error:"unchanged"},409);
  const now=Math.floor(Date.now()/1000),action=shouldBlock?"BLOCKED":"UNBLOCKED",auditId=crypto.randomUUID();
  const rows=await sql`
    WITH changed AS (
      UPDATE users SET
        is_blocked=${shouldBlock},
        blocked_at=CASE WHEN ${shouldBlock} THEN now() ELSE NULL END,
        blocked_by=CASE WHEN ${shouldBlock} THEN ${actor.id} ELSE NULL END,
        block_reason=CASE WHEN ${shouldBlock} THEN ${input.reason} ELSE NULL END,
        leaderboard_visible=CASE WHEN ${shouldBlock} THEN FALSE ELSE leaderboard_visible END,
        updated_at=${now}
      WHERE id=${targetId} AND is_blocked<>${shouldBlock}
      RETURNING id
    ), logged AS (
      INSERT INTO user_moderation_log(id,target_user_id,actor_user_id,action,reason)
      SELECT ${auditId},id,${actor.id},${action},${input.reason} FROM changed RETURNING id
    ) SELECT id FROM changed`;
  return rows[0]?json({ok:true,isBlocked:shouldBlock}):json({error:"unchanged"},409);
}

export function parseUserModerationInput(value:unknown):ModerationInput|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const body=value as Record<string,unknown>,action=body.action==="block"?"block":body.action==="unblock"?"unblock":null,reason=typeof body.reason==="string"?body.reason.trim():"";
  return action&&[...reason].length>=3&&[...reason].length<=500?{action,reason}:null;
}
export function isProtectedModerationTarget(actorId:string,targetId:string,targetEmail:string,adminEmails:string){return actorId===targetId||new Set(adminEmails.split(",").map(value=>value.trim().toLocaleLowerCase()).filter(Boolean)).has(targetEmail.toLocaleLowerCase());}

async function readModerationInput(request:Request){
  if(!request.headers.get("content-type")?.toLocaleLowerCase().startsWith("application/json"))return null;
  const declared=Number(request.headers.get("content-length")??0);if(Number.isFinite(declared)&&declared>MAX_JSON_BYTES)return null;
  if(!request.body)return null;
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_JSON_BYTES){await reader.cancel();return null;}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return parseUserModerationInput(JSON.parse(new TextDecoder().decode(bytes)) as unknown);
  }catch{return null;}
}
function adminEmailSet(env:Env){return new Set(env.ADMIN_EMAILS.split(",").map(value=>value.trim().toLocaleLowerCase()).filter(Boolean));}
function sqlFor(env:Env){return neon(env.DATABASE_URL);}
function json(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"}});}
