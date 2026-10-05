import { makeState, setCookie, STATE_COOKIE, verifyState, getCookie, saveTokens, clearCookie, loadTokens } from "../../lib/_social.js";

async function callback(req,res){
  const {code,state,error,error_description}=req.query||{};
  if(error) return res.status(400).json({ok:false,error,error_description});
  if(!code||!state||!verifyState(state,"youtube")||getCookie(req,STATE_COOKIE)!==state) return res.status(400).json({ok:false,error:"Invalid OAuth state"});
  const clientId=process.env.YOUTUBE_CLIENT_ID||process.env.GOOGLE_CLIENT_ID;
  const clientSecret=process.env.YOUTUBE_CLIENT_SECRET||process.env.GOOGLE_CLIENT_SECRETd||process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri=process.env.YOUTUBE_REDIRECT_URI;
  if(!clientId||!clientSecret||!redirectUri||!process.env.SOCIAL_SESSION_SECRET) return res.status(500).json({ok:false,error:"YouTube OAuth environment variables are missing"});
  const body=new URLSearchParams({code:String(code),client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code"});
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const data=await r.json();
  if(!r.ok||data.error) return res.status(502).json({ok:false,error:"YouTube token exchange failed",details:data.error_description||data.error});
  saveTokens(res,"youtube",data); clearCookie(res,STATE_COOKIE);
  return res.redirect(302,"/?youtube=connected");
}

async function publish(req,res){
  let t=loadTokens(req,"youtube");
  if(!t) return res.status(401).json({ok:false,error:"YouTube is not connected. Open /api/youtube/connect first."});
  if(t.expiry_date && Date.now() >= Number(t.expiry_date)-120000 && t.refresh_token){
    const body=new URLSearchParams({client_id:process.env.YOUTUBE_CLIENT_ID||process.env.GOOGLE_CLIENT_ID,client_secret:process.env.YOUTUBE_CLIENT_SECRET||process.env.GOOGLE_CLIENT_SECRETd||process.env.GOOGLE_CLIENT_SECRET,refresh_token:t.refresh_token,grant_type:"refresh_token"});
    const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
    const d=await r.json();
    if(!r.ok) return res.status(502).json({ok:false,error:d.error_description||"YouTube refresh failed"});
    t={...t,...d,expiry_date:Date.now()+Number(d.expires_in||3600)*1000}; saveTokens(res,"youtube",t);
  }
  const {video_url,title="BEN AI",description="",privacyStatus="private",categoryId="22"}=req.body||{};
  if(!video_url) return res.status(400).json({ok:false,error:"video_url is required"});
  const media=await fetch(video_url);
  if(!media.ok) return res.status(400).json({ok:false,error:"Could not fetch video_url"});
  const bytes=Buffer.from(await media.arrayBuffer());
  const meta={snippet:{title,description,categoryId},status:{privacyStatus}};
  const init=await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",{method:"POST",headers:{Authorization:"Bearer "+t.access_token,"Content-Type":"application/json","X-Upload-Content-Type":media.headers.get("content-type")||"video/mp4","X-Upload-Content-Length":String(bytes.length)},body:JSON.stringify(meta)});
  if(!init.ok) return res.status(init.status).json({ok:false,error:"YouTube upload session failed",details:await init.text()});
  const uploadUrl=init.headers.get("location");
  if(!uploadUrl) return res.status(502).json({ok:false,error:"YouTube did not return an upload URL"});
  const up=await fetch(uploadUrl,{method:"PUT",headers:{Authorization:"Bearer "+t.access_token,"Content-Type":media.headers.get("content-type")||"video/mp4","Content-Length":String(bytes.length)},body:bytes});
  const d=await up.json().catch(()=>({}));
  if(!up.ok) return res.status(up.status).json({ok:false,error:"YouTube video upload failed",details:d});
  return res.status(200).json({ok:true,provider:"youtube",video:d});
}

export default async function handler(req,res){
  const path=(req.url||"").split("?")[0]; const route=(Array.isArray(req.query?.route)?req.query.route[0]:req.query?.route)||path.split("/").filter(Boolean).pop();
  if(route==="connect"){
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"Method not allowed"});
    const clientId=process.env.YOUTUBE_CLIENT_ID||process.env.GOOGLE_CLIENT_ID;
    const redirectUri=process.env.YOUTUBE_REDIRECT_URI;
    if(!clientId||!redirectUri||!process.env.SOCIAL_SESSION_SECRET) return res.status(500).json({ok:false,error:"YouTube OAuth environment variables are missing"});
    const state=makeState("youtube"); setCookie(res,STATE_COOKIE,state,600);
    const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id",clientId); url.searchParams.set("redirect_uri",redirectUri); url.searchParams.set("response_type","code");
    url.searchParams.set("access_type","offline"); url.searchParams.set("prompt","consent"); url.searchParams.set("scope","https://www.googleapis.com/auth/youtube.upload"); url.searchParams.set("state",state); url.searchParams.set("response_mode","query");
    return res.redirect(302,url.toString());
  }
  if(route==="callback"){if(req.method!=="GET") return res.status(405).json({ok:false,error:"Method not allowed"}); return callback(req,res);}
  if(route==="publish"){if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"}); return publish(req,res);}
  return res.status(404).json({ok:false,error:"Unknown YouTube route"});
}
