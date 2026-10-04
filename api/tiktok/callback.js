import { verifyState, getCookie, saveTokens, STATE_COOKIE, clearCookie } from "../../lib/_social.js";

export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"Method not allowed"});
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
