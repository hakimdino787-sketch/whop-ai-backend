import { makeState, setCookie, STATE_COOKIE } from "../_social.js";

export default function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"Method not allowed"});
  const {YOUTUBE_CLIENT_ID,YOUTUBE_REDIRECT_URI,SOCIAL_SESSION_SECRET}=process.env;
  if(!YOUTUBE_CLIENT_ID||!YOUTUBE_REDIRECT_URI||!SOCIAL_SESSION_SECRET) return res.status(500).json({ok:false,error:"YouTube OAuth environment variables are missing"});
  const state=makeState("youtube");
  setCookie(res,STATE_COOKIE,state,600);
  const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",YOUTUBE_CLIENT_ID);
  url.searchParams.set("redirect_uri",YOUTUBE_REDIRECT_URI);
  url.searchParams.set("response_type","code");
  url.searchParams.set("access_type","offline");
  url.searchParams.set("prompt","consent");
  url.searchParams.set("scope","https://www.googleapis.com/auth/youtube.upload");
  url.searchParams.set("state",state);
  return res.redirect(302,url.toString());
}
