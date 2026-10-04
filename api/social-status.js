import { loadTokens } from "./_social.js";

export default function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"Method not allowed"});
  const yt=loadTokens(req,"youtube");
  const tt=loadTokens(req,"tiktok");
  return res.status(200).json({
    ok:true,
    agent:"BEN AI",
    youtube:{connected:!!yt,expiresAt:yt?.expiry_date||null},
    tiktok:{connected:!!tt,openId:tt?.open_id||null,scope:tt?.scope||null},
    note:"No access or refresh tokens are returned by this endpoint."
  });
}
