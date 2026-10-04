import { makeState, setCookie, STATE_COOKIE } from "../../lib/_social.js";

export default function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"Method not allowed"});
  const {TIKTOK_CLIENT_KEY,TIKTOK_REDIRECT_URI,SOCIAL_SESSION_SECRET}=process.env;
  if(!TIKTOK_CLIENT_KEY||!TIKTOK_REDIRECT_URI||!SOCIAL_SESSION_SECRET)
    return res.status(500).json({ok:false,error:"TikTok OAuth environment variables are missing"});
  const state=makeState("tiktok");
  setCookie(res,STATE_COOKIE,state,600);
  const url=new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key",TIKTOK_CLIENT_KEY);
  url.searchParams.set("redirect_uri",TIKTOK_REDIRECT_URI);
  url.searchParams.set("response_type","code");
  url.searchParams.set("scope","user.info.basic,video.publish");
  url.searchParams.set("state",state);
  return res.redirect(302,url.toString());
}
