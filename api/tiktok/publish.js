import { loadTokens, saveTokens } from "../_social.js";

async function refresh(req,res,t){
  if(!t?.refresh_token) return t;
  if(t.expires_in && t.savedAt && Date.now() < t.savedAt + (Number(t.expires_in)-120)*1000) return t;
  const {TIKTOK_CLIENT_KEY,TIKTOK_CLIENT_SECRET}=process.env;
  const body=new URLSearchParams({client_key:TIKTOK_CLIENT_KEY,client_secret:TIKTOK_CLIENT_SECRET,grant_type:"refresh_token",refresh_token:t.refresh_token});
  const r=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Cache-Control":"no-cache"},body});
  const d=await r.json();
  if(!r.ok||d.error) throw new Error(d.error_description||d.error||"TikTok refresh failed");
  saveTokens(res,"tiktok",d); return d;
}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  const t=loadTokens(req,"tiktok");
  if(!t) return res.status(401).json({ok:false,error:"TikTok is not connected. Open /api/tiktok/connect first."});
  const {video_url,title,privacy_level="SELF_ONLY",is_aigc=false}=req.body||{};
  if(!video_url) return res.status(400).json({ok:false,error:"video_url is required"});
  const token=await refresh(req,res,t);
  const r=await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/",{method:"POST",headers:{Authorization:"Bearer "+token.access_token,"Content-Type":"application/json"},body:JSON.stringify({post_info:{title:title||"BEN AI video",privacy_level,is_aigc:Boolean(is_aigc)},source_info:{source:"PULL_FROM_URL",video_url}})});
  const d=await r.json();
  if(!r.ok||d.error?.code!=="ok") return res.status(r.status||502).json({ok:false,error:d.error?.message||"TikTok publish init failed",details:d.error});
  return res.status(200).json({ok:true,provider:"tiktok",publish_id:d.data?.publish_id||null,note:"TikTok will pull the video from the verified HTTPS URL. Unaudited apps may be restricted to private posts."});
}
