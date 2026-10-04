import { verifyState, getCookie, saveTokens, STATE_COOKIE, clearCookie } from "../_social.js";

export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"Method not allowed"});
  const {code,state,error,error_description}=req.query||{};
  if(error) return res.status(400).json({ok:false,error,error_description});
  if(!code||!state||!verifyState(state,"youtube")||getCookie(req,STATE_COOKIE)!==state)
    return res.status(400).json({ok:false,error:"Invalid OAuth state"});

  const clientId=process.env.YOUTUBE_CLIENT_ID||process.env.GOOGLE_CLIENT_ID;
  const clientSecret=process.env.YOUTUBE_CLIENT_SECRET||process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri=process.env.YOUTUBE_REDIRECT_URI;
  if(!clientId||!clientSecret||!redirectUri||!process.env.SOCIAL_SESSION_SECRET)
    return res.status(500).json({ok:false,error:"YouTube OAuth environment variables are missing"});

  const body=new URLSearchParams({
    code:String(code),
    client_id:clientId,
    client_secret:clientSecret,
    redirect_uri:redirectUri,
    grant_type:"authorization_code"
  });
  const r=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body
  });
  const data=await r.json();
  if(!r.ok||data.error)
    return res.status(502).json({ok:false,error:"YouTube token exchange failed",details:data.error_description||data.error});

  saveTokens(res,"youtube",data);
  clearCookie(res,STATE_COOKIE);
  return res.status(200).json({ok:true,provider:"youtube",connected:true});
}
