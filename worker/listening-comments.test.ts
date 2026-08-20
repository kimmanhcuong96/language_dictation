import { describe, expect, it, vi } from "vitest";
import { routeListeningComments, type CommentSqlFactory } from "./listening-comments";

const env={} as Env;
const factoryFor=(responses:Array<Record<string,unknown>[]>)=>{
  const sql=vi.fn(async(..._args:unknown[])=>responses.shift()??[]);
  return {sql,factory:(()=>sql) as unknown as CommentSqlFactory};
};

describe("listening comment routes",()=>{
  it("allows public reads without exposing stable user IDs",async()=>{
    const {factory}=factoryFor([[{exists:1}],[{id:"123e4567-e89b-12d3-a456-426614174000",sentenceId:"sentence-1",body:"Public",createdAt:"2026-08-20T00:00:00Z",authorId:"private-user-id",authorName:"Reader",authorAvatarUrl:null}]]);
    const response=await routeListeningComments(new Request("https://example.test/api/listening/sentences/sentence-1/comments"),env,new URL("https://example.test/api/listening/sentences/sentence-1/comments"),null,false,false,factory);
    expect(response?.status).toBe(200);const body=await response!.json() as {comments:Array<Record<string,unknown>>};
    expect(body.comments[0]).toMatchObject({isOwner:false,author:{displayName:"Reader",avatarUrl:null}});expect(JSON.stringify(body)).not.toContain("private-user-id");
  });

  it("requires authentication and CSRF for writes and has no edit route",async()=>{
    const url=new URL("https://example.test/api/listening/sentences/sentence-1/comments"),request=()=>new Request(url,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    expect((await routeListeningComments(request(),env,url,null,false))?.status).toBe(401);
    expect((await routeListeningComments(request(),env,url,{id:"user-1"},false))?.status).toBe(403);
    expect(await routeListeningComments(new Request(url,{method:"PATCH"}),env,url,{id:"user-1"},true)).toBeNull();
  });

  it("enforces delete ownership in the database predicate",async()=>{
    const id="123e4567-e89b-12d3-a456-426614174000",url=new URL(`https://example.test/api/listening/comments/${id}`),{sql,factory}=factoryFor([[]]);
    const response=await routeListeningComments(new Request(url,{method:"DELETE"}),env,url,{id:"owner"},true,false,factory);
    expect(response?.status).toBe(404);expect(String(sql.mock.calls[0]?.[0])).toContain("user_id=");
  });

  it("keeps admin moderation inaccessible to ordinary users",async()=>{
    const url=new URL("https://example.test/api/listening/admin/comments/reports");
    expect((await routeListeningComments(new Request(url),env,url,{id:"user"},false,false))?.status).toBe(403);
  });
});
