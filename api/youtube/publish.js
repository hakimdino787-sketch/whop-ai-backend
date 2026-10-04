import { loadTokens, saveTokens } from "../_social.js";

async function token(req,res,t){
  if(!t) return null;
  if(t.expiry_date && Date.now() < Number(t.expiry_date)-120000) return t;
  if(!t.refresh_token) return t;
  const body=new URLSearchParams({client_id:process.env.YOUTUBE_CLIENT_ID,client_secret:process.env.YOUTUBE_CLIENT_SECRET,refresh_token:t.refresh_token,grant_type:"refresh_token"});
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error_description||"YouTube refresh failed");
  const next={...t,...d,expiry_date:Date.now()+Number(d.expires_in||3600)*1000};
  saveTokens(res,"youtube",next); return next;
}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  const t=await token(req,res,loadTokens(req,"youtube"));
  if(!t?.access_token) return res.status(401).json({ok:false,error:"YouTube is not connected. Open /api/youtube/connect first."});
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
  const up=await fetch(uploadUrl,{method:"PUT",headers:{"Authorization":"Bearer "+t.access_token,"Content-Type":media.headers.get("content-type")||"video/mp4","Content-Length":String(bytes.length)},body:bytes});
  const d=await up.json().catch(()=>({}));
  if(!up.ok) return res.status(up.status).json({ok:false,error:"YouTube video upload failed",details:d});
  return res.status(200).json({ok:true,provider:"youtube",video:d});
}
