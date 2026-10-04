import { verifyState, getCookie, saveTokens, STATE_COOKIE, clearCookie, loadTokens } from "../../lib/_social.js";

async function callback(req,res){
  const {code,state,error,error_description}=req.query||{};
  if(error) return res.status(400).json({ok:false,error,error_description});
  if(!code||!state||!verifyState(state,"tiktok")||getCookie(req,STATE_COOKIE)!==state) return res.status(400).json({ok:false,error:"Invalid OAuth state"});
  const {TIKTOK_CLIENT_KEY,TIKTOK_CLIENT_SECRET,TIKTOK_REDIRECT_URI}=process.env;
  if(!TIKTOK_CLIENT_KEY||!TIKTOK_CLIENT_SECRET||!TIKTOK_REDIRECT_URI||!process.env.SOCIAL_SESSION_SECRET) return res.status(500).json({ok:false,error:"TikTok OAuth environment variables are missing"});
  const body=new URLSearchParams({client_key:TIKTOK_CLIENT_KEY,client_secret:TIKTOK_CLIENT_SECRET,code:String(code),grant_type:"authorization_code",redirect_uri:TIKTOK_REDIRECT_URI});
  const r=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Cache-Control":"no-cache"},body});
  const data=await r.json();
  if(!r.ok||data.error) return res.status(502).json({ok:false,error:"TikTok token exchange failed",details:data.error_description||data.error});
  saveTokens(res,"tiktok",data); clearCookie(res,STATE_COOKIE);
  return res.status(200).json({ok:true,provider:"tiktok",connected:true,scope:data.scope||""});
}
async function publish(req,res){
  const t=loadTokens(req,"tiktok");
  if(!t) return res.status(401).json({ok:false,error:"TikTok is not connected. Open /api/tiktok/connect first."});
  const {video_url,title,privacy_level="SELF_ONLY",is_aigc=false}=req.body||{};
  if(!video_url) return res.status(400).json({ok:false,error:"video_url is required"});
  const {TIKTOK_CLIENT_KEY,TIKTOK_CLIENT_SECRET}=process.env;
  const body=new URLSearchParams({client_key:TIKTOK_CLIENT_KEY,client_secret:TIKTOK_CLIENT_SECRET,grant_type:"refresh_token",refresh_token:t.refresh_token});
  let token=t;
  if(t.refresh_token && t.expires_in && t.savedAt && Date.now() >= t.savedAt+(Number(t.expires_in)-120)*1000){
    const r=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Cache-Control":"no-cache"},body});
    const d=await r.json(); if(!r.ok||d.error) return res.status(502).json({ok:false,error:d.error_description||d.error||"TikTok refresh failed"});
    saveTokens(res,"tiktok",d); token=d;
  }
  const r=await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/",{method:"POST",headers:{Authorization:"Bearer "+token.access_token,"Content-Type":"application/json"},body:JSON.stringify({post_info:{title:title||"BEN AI video",privacy_level,is_aigc:Boolean(is_aigc)},source_info:{source:"PULL_FROM_URL",video_url})});
  const d=await r.json();
  if(!r.ok||d.error?.code!=="ok") return res.status(r.status||502).json({ok:false,error:d.error?.message||"TikTok publish init failed",details:d.error});
  return res.status(200).json({ok:true,provider:"tiktok",publish_id:d.data?.publish_id||null,note:"TikTok will pull the video from the verified HTTPS URL. Unaudited apps may be restricted to private posts."});
}
export default async function handler(req,res){
  const route=Array.isArray(req.query?.route)?req.query.route[0]:req.query?.route;
  if(route==="callback"){if(req.method!=="GET") return res.status(405).json({ok:false,error:"Method not allowed"});return callback(req,res);}
  if(route==="publish"){if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});return publish(req,res);}
  return res.status(404).json({ok:false,error:"Unknown TikTok route"});
}
