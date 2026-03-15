import { useState, useMemo, useRef, useEffect } from "react";

const B = {
  caramel:"#B4915F", caramelDk:"#8C6E40", caramelLt:"#D4B080",
  ivory:"#FAF7F2", ivoryDk:"#F5EFE6", linen:"#EDE5D8",
  espresso:"#1C1612", espressoMd:"#4A3C30", espressoLt:"#7A6A58",
  muted:"#9A8A78", mutedLt:"#C4B8A8",
  grad:"linear-gradient(135deg,#B4915F,#D4B080)",
  white:"#FFFFFF",
  success:"#4A9A6A", successBg:"#EAF5EE",
  warn:"#C89040", warnBg:"#FEF5E4",
  danger:"#C05858", dangerBg:"#FAEAEA",
};

const PALETTE = [
  {bg:"#FDF0F2",soft:"#F5CDD4",accent:"#D4788A",text:"#A04058"},
  {bg:"#FDF4EE",soft:"#F5D8C0",accent:"#D49068",text:"#A05830"},
  {bg:"#F0F8F4",soft:"#C0DEC8",accent:"#5A9E78",text:"#2A6A48"},
  {bg:"#F4F0FC",soft:"#CCC0EC",accent:"#8870C8",text:"#504098"},
  {bg:"#FDFAEE",soft:"#ECD8A0",accent:"#C4A040",text:"#806020"},
  {bg:"#EEF4FC",soft:"#A8C4E4",accent:"#5A90C0",text:"#285880"},
];

const TREATMENT_ICONS = {
  "Laser Hair Removal":"✦","Botox":"◈","Filler":"◉","Hydrafacial":"✿",
  "Chemical Peel":"❋","Microneedling":"✸","RF Lifting":"◎","LED Therapy":"☼",
  "Ultherapy":"⟡","Sculptra":"✾","PRP":"◆","Other":"✧",
};

const AFTERCARE = {
  "Laser Hair Removal":{dos:["Apply aloe vera or soothing gel to calm redness","Keep area clean and moisturised","Wear SPF 50+ sunscreen daily for at least 2 weeks","Use cool compresses if area feels warm"],donts:["No sun exposure for 2 weeks — non-negotiable","No hot showers, saunas or steam rooms for 48 hours","No waxing, threading, or plucking between sessions","No perfumed products on treated area for 48 hours","No exercise for 24 hours"],tip:"Shedding of hair occurs 1–3 weeks after — this is normal, not regrowth. Gently exfoliate from day 5 onwards."},
  "Botox":{dos:["Stay upright for at least 4 hours after treatment","Gently move treated muscles to help distribution","Sleep on your back the night of treatment","Stay well hydrated"],donts:["No lying down or bending forward for 4 hours","No touching or rubbing treated area for 24 hours","No intense exercise for 24 hours","No alcohol for 24 hours","No facials or RF treatments for 2 weeks","No extreme heat for 2 weeks"],tip:"Full results appear in 7–14 days. If results look uneven after 2 weeks, contact your practitioner for a review."},
  "Filler":{dos:["Apply ice gently to reduce swelling (wrapped in cloth)","Stay hydrated","Sleep elevated the first night","Arnica gel or supplements help with bruising"],donts:["No touching the area for 6 hours","No strenuous exercise for 24–48 hours","No extreme heat for 2 weeks","No dental work for 2 weeks (lip filler)","No blood thinners unless prescribed","No alcohol for 24 hours"],tip:"Swelling and bruising for 3–7 days is completely normal. Final results are visible after 2 weeks."},
  "Hydrafacial":{dos:["Apply SPF 30+ outdoors","Keep skin hydrated with gentle fragrance-free moisturiser","Drink plenty of water to maximise results"],donts:["No makeup for at least 6 hours","No exfoliants (AHA/BHA/retinol) for 48–72 hours","No waxing or facial treatments for 48 hours","No intense exercise for 24 hours","No hot water on face for 24 hours"],tip:"Skin may look slightly pink for a few hours — totally normal. Your glow peaks around day 2–3 after treatment."},
  "Chemical Peel":{dos:["Use only gentle, fragrance-free cleanser and moisturiser","Apply SPF 50+ religiously","Let peeling skin shed naturally — do not force it"],donts:["No sun exposure for 2 weeks minimum","No picking, peeling, or rubbing — risk of scarring","No exfoliants or retinol for 1 week","No swimming for 1 week","No makeup until initial peeling is complete"],tip:"Peeling typically begins day 3–5 and lasts until day 7–10. Results continue improving for up to 4 weeks."},
  "Microneedling":{dos:["Apply prescribed hyaluronic acid or healing serum","Use gentle mineral sunscreen","Keep skin clean and hydrated"],donts:["No makeup for 24 hours","No active ingredients (vitamin C, AHA, retinol) for 72 hours","No unnecessary touching for 24 hours","No exercise or sweating for 24 hours","No direct sun for 2 weeks"],tip:"Redness and mild swelling for 24–48 hours is expected. Collagen remodelling continues for weeks — be patient."},
  "RF Lifting":{dos:["Stay well hydrated before and after","Use SPF daily","Apply soothing moisturiser if redness occurs"],donts:["No hot baths, saunas, or steam rooms for 48 hours","No intense exercise for 24 hours","No other energy-based treatments for 4 weeks"],tip:"Collagen remodelling continues for 3–6 months. Best results appear 2–3 months after completing a series."},
  "LED Therapy":{dos:["Apply moisturiser and SPF after treatment","Continue regular skincare routine","Hydrate well"],donts:["Avoid photosensitising medications without consulting your practitioner","No tanning beds for 48 hours"],tip:"LED therapy has zero downtime. Consistency across sessions is the key to long-term results."},
  "Ultherapy":{dos:["Take OTC pain relief if discomfort persists","Apply ice wrapped in cloth to soothe swelling","Resume normal skincare after 24 hours"],donts:["No intense exercise for 24 hours","No extreme heat for 48 hours","No additional skin tightening treatments for 6 months"],tip:"Mild swelling or tenderness for 1–2 weeks is normal. Lifting results improve over 3–6 months."},
  "Sculptra":{dos:["Massage treated areas: 5 min, 5 times a day, for 5 days (the 5-5-5 rule)","Apply ice to reduce swelling","Stay hydrated"],donts:["No dental work for 2 weeks","No extreme sun or heat for 2 weeks","No laser or RF treatments for 4 weeks"],tip:"The 5-5-5 massage rule is non-negotiable for Sculptra. Full effect at 3–4 months, lasting 2+ years."},
  "PRP":{dos:["Keep area clean for 24 hours","Stay well hydrated","Use gentle cleanser and moisturiser"],donts:["No makeup for 6–12 hours","No anti-inflammatory medications for 1 week","No intense sun for 1 week","No alcohol for 24 hours"],tip:"PRP uses your own growth factors for natural, gradual results. Most clients need 3 sessions 4–6 weeks apart."},
  "Other":{dos:["Follow your practitioner's specific aftercare instructions","Keep treated area clean and moisturised","Apply SPF if treatment involved the face"],donts:["Avoid touching treated area unnecessarily for 24 hours","No makeup immediately after facial treatments","No intense exercise for 24 hours"],tip:"Always ask your clinic for written aftercare specific to your treatment and skin type."},
};

const TREATMENT_TYPES = Object.keys(AFTERCARE);
const FREQUENCIES = [
  {label:"Every 2 weeks",days:14},{label:"Every 3 weeks",days:21},
  {label:"Monthly",days:30},{label:"Every 6 weeks",days:42},
  {label:"Every 2 months",days:60},{label:"Every 3 months",days:90},
  {label:"Every 6 months",days:180},{label:"Custom",days:null},
];
const LANGUAGES = ["English","Thai — ภาษาไทย","Chinese — 中文","Japanese — 日本語","Korean — 한국어","French — Français","Arabic — العربية"];
const CURRENCIES = ["THB — Thai Baht ฿","USD — US Dollar $","EUR — Euro €","GBP — British Pound £","SGD — Singapore Dollar S$","JPY — Japanese Yen ¥","AED — UAE Dirham د.إ","CNY — Chinese Yuan ¥"];
const COUNTRY_CODES = ["+66 TH","+1 US","+44 UK","+65 SG","+81 JP","+82 KR","+86 CN","+33 FR","+971 AE"];

const SAMPLE_DATA = [
  {id:1,name:"Laser Hair Removal",clinic:"Glow Clinic Bangkok",totalSessions:8,frequency:42,frequencyLabel:"Every 6 weeks",expiryDate:"2026-12-31",palette:0,notes:"Full legs",
    sessions:[{id:1,date:"2026-01-15",note:"First session, mild redness after",photo:null},{id:2,date:"2026-02-26",note:"Noticeably less hair growth!",photo:null},{id:3,date:"2026-03-08",note:"Smoother skin already",photo:null}]},
  {id:2,name:"Botox",clinic:"Aesthetic Studio",totalSessions:3,frequency:90,frequencyLabel:"Every 3 months",expiryDate:"2025-09-30",palette:1,notes:"Forehead & crow's feet",
    sessions:[{id:1,date:"2025-12-01",note:"20 units, love the result",photo:null}]},
  {id:3,name:"Hydrafacial",clinic:"Pure Skin Spa",totalSessions:6,frequency:30,frequencyLabel:"Monthly",expiryDate:"2026-11-01",palette:2,notes:"Diamond glow add-on",
    sessions:[{id:1,date:"2026-01-10",note:"Skin feels incredible",photo:null},{id:2,date:"2026-02-10",note:"Added vitamin C booster",photo:null},{id:3,date:"2026-03-10",note:"Best skin of my life!",photo:null}]},
];

// ─── HELPERS ─────────────────────────────────────────────────────
function fmtDate(d){if(!d)return"—";return new Date(d).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"});}
function fmtShort(d){if(!d)return"—";return new Date(d).toLocaleDateString("en-US",{day:"numeric",month:"short"});}
function daysUntil(d){if(!d)return null;const t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(d)-t)/86400000);}
function addDays(d,n){if(!d)return null;const dt=new Date(d);dt.setDate(dt.getDate()+n);return dt.toISOString().split("T")[0];}
function getNext(t){if(!t.sessions.length)return null;const last=[...t.sessions].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];return addDays(last.date,t.frequency);}
function greet(){const h=new Date().getHours();if(h<12)return"Good morning";if(h<17)return"Good afternoon";return"Good evening";}

// ─── MOCK OAUTH ───────────────────────────────────────────────────
function OAuthScreen({provider,onSuccess,onCancel}){
  const [stage,setStage]=useState("browser");
  const [progress,setProgress]=useState(0);

  const cfg={
    google:{headerBg:"#FFFFFF",headerBorder:true,logo:<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,title:"Sign in with Google",url:"accounts.google.com",accounts:[{name:"Sophia Chen",email:"sophia.chen@gmail.com",color:"#4285F4"},{name:"Add another account",email:"",color:"#9A8A78"}]},
    facebook:{headerBg:"#1877F2",headerBorder:false,logo:<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,title:"Log in with Facebook",url:"www.facebook.com",accounts:[{name:"Sophia Chen",email:"sophia.chen@hotmail.com",color:"#1877F2"}]},
    apple:{headerBg:"#000000",headerBorder:false,logo:<svg width="16" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>,title:"Sign in with Apple",url:"appleid.apple.com",accounts:[{name:"Sophia Chen",email:"s.chen@icloud.com",color:"#333333"}]},
  };
  const c=cfg[provider]||cfg.google;

  useEffect(()=>{
    if(stage==="loading"){
      let p=0;
      const iv=setInterval(()=>{
        p+=Math.random()*18+8;
        if(p>=100){clearInterval(iv);setProgress(100);setTimeout(()=>setStage("success"),300);}
        else setProgress(p);
      },180);
      return()=>clearInterval(iv);
    }
    if(stage==="success"){const t=setTimeout(()=>onSuccess(),1200);return()=>clearTimeout(t);}
  },[stage]);

  if(stage==="success")return(
    <div style={{position:"fixed",inset:0,background:B.ivory,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{width:70,height:70,borderRadius:"50%",background:B.successBg,border:`2px solid ${B.success}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={B.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:400,color:B.espresso,marginBottom:6}}>You're in</p>
      <p style={{fontSize:13,color:B.muted}}>Signing you into Become…</p>
    </div>
  );

  if(stage==="loading")return(
    <div style={{position:"fixed",inset:0,background:B.ivory,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{width:52,height:52,borderRadius:14,background:provider==="apple"?"#000":provider==="facebook"?"#1877F2":"#fff",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",border:provider==="google"?"1px solid #EDE5D8":"none"}}>
        {c.logo}
      </div>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:400,color:B.espresso,marginBottom:6}}>
        Connecting to {provider==="google"?"Google":provider==="facebook"?"Facebook":"Apple"}…
      </p>
      <p style={{fontSize:13,color:B.muted,marginBottom:28}}>Verifying your account</p>
      <div style={{width:200,height:4,background:B.linen,borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${progress}%`,background:B.grad,borderRadius:4,transition:"width 0.15s"}}/>
      </div>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(28,22,18,0.55)",backdropFilter:"blur(6px)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:430,background:B.white,borderRadius:"24px 24px 0 0",overflow:"hidden"}}>
        <div style={{background:"#F8F8F8",borderBottom:"1px solid #EEE",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,background:"#EFEFEF",borderRadius:8,padding:"6px 12px",display:"flex",alignItems:"center",gap:6}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9A8A78" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span style={{fontSize:12,color:"#666",fontFamily:"'DM Sans',sans-serif"}}>{c.url}</span>
          </div>
          <button onClick={onCancel} style={{background:"none",border:"none",fontSize:18,color:"#9A8A78",cursor:"pointer",padding:"0 4px"}}>✕</button>
        </div>
        <div style={{background:c.headerBg,padding:"20px 20px 16px",borderBottom:c.headerBorder?"1px solid #EEE":"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{c.logo}</div>
            <div>
              <p style={{fontSize:15,fontWeight:700,color:provider==="google"?"#202124":"white",fontFamily:"'DM Sans',sans-serif"}}>{c.title}</p>
              <p style={{fontSize:12,color:provider==="google"?"#5F6368":"rgba(255,255,255,0.75)",fontFamily:"'DM Sans',sans-serif"}}>to continue to Become</p>
            </div>
          </div>
        </div>
        <div style={{padding:"8px 0"}}>
          {c.accounts.map((acc,i)=>(
            <button key={i} onClick={()=>{if(acc.email)setStage("loading");}}
              style={{width:"100%",padding:"14px 20px",background:"none",border:"none",cursor:acc.email?"pointer":"default",display:"flex",alignItems:"center",gap:14,textAlign:"left"}}
              onMouseEnter={e=>{if(acc.email)e.currentTarget.style.background="#F8F8F8";}}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <div style={{width:40,height:40,borderRadius:"50%",background:acc.email?acc.color:B.linen,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:acc.email?15:18,fontWeight:700,color:acc.email?"white":B.muted,fontFamily:"'DM Sans',sans-serif"}}>{acc.name[0]}</span>
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:14,fontWeight:600,color:"#202124",fontFamily:"'DM Sans',sans-serif"}}>{acc.name}</p>
                {acc.email?<p style={{fontSize:12,color:"#5F6368",fontFamily:"'DM Sans',sans-serif"}}>{acc.email}</p>:null}
              </div>
              {acc.email?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A8A78" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>:null}
            </button>
          ))}
        </div>
        <div style={{padding:"12px 20px 28px",borderTop:"1px solid #F0EDEA",background:"#FAFAFA"}}>
          <p style={{fontSize:11,color:"#9A8A78",textAlign:"center",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>
            By continuing, Become will receive your name, email and profile photo.
          </p>
        </div>
      </div>
    </div>
  );
}


// ─── POLICY DATA ──────────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  {t:"1. Introduction & Data Controller",b:"Become Application ('Become','we','our') is the data controller for personal data collected through this app. This policy complies with Thailand's Personal Data Protection Act B.E. 2562 (2019) (PDPA).\n\nContact: privacy@becomeapp.com | Bangkok, Thailand"},
  {t:"2. Personal Data We Collect",b:"Identity: name, photo. Contact: email, phone. Health & Beauty: treatment records, session dates, clinic names, units used, notes, progress photos (sensitive data under PDPA Section 26 — collected only with explicit consent). Device: OS, IP, app analytics. Account: encrypted password, login provider."},
  {t:"3. Legal Basis for Processing",b:"Consent (Section 19): sensitive health/beauty data, analytics, marketing. Contractual Necessity (Section 24(3)): to provide the service. Legitimate Interests (Section 24(5)): fraud prevention, security. Legal Obligation (Section 24(6)): where required by Thai law."},
  {t:"4. How We Use Your Data",b:"To create and manage your account. To store and display your treatment records and session history. To send session reminders and expiry alerts. To improve app performance.\n\nWe do NOT sell your data. We do NOT use health or beauty data for advertising."},
  {t:"5. Data Sharing",b:"Service providers under strict data processing agreements. Authentication providers (Google/Facebook/Apple) when you choose social login. Legal authorities when required by Thai law. We do not share your data with any other third parties."},
  {t:"6. Data Retention",b:"Account and treatment data: duration of account plus 3 years after deletion. Session photos: until deleted by you or account closure. Legal records: as required by Thai law (5–10 years)."},
  {t:"7. Your Rights Under PDPA",b:"Right to be Informed (Section 23). Right of Access (Section 30). Right to Data Portability (Section 31). Right to Erasure (Section 33). Right to Restriction (Section 34). Right to Object (Section 32). Right to Withdraw Consent (Section 19) — at any time without affecting prior processing. Right to Lodge a Complaint with the PDPC.\n\nTo exercise rights: privacy@becomeapp.com. Response within 30 days."},
  {t:"8. Security",b:"TLS encryption in transit and at rest. Encrypted password storage. Access controls. In the event of a data breach affecting your rights, we will notify you and the PDPA supervisory authority within 72 hours."},
  {t:"9. Children",b:"Become is not intended for users under 20 (Thai age of majority). We do not knowingly collect data from minors."},
  {t:"10. Contact & Complaints",b:"Email: privacy@becomeapp.com\nPersonal Data Protection Committee (PDPC)\nMinistry of Digital Economy and Society\nwww.pdpc.go.th | Hotline: 02-142-1033"},
];

const TERMS_SECTIONS = [
  {t:"1. Acceptance",b:"By creating an account, you agree to these Terms and our Privacy Policy. These terms are governed by the laws of Thailand. You must be at least 20 years of age (Thai age of majority) to use Become."},
  {t:"2. Service Description",b:"Become is a personal beauty treatment tracker for recording sessions, tracking packages, and receiving reminders. It is provided for personal, non-commercial use only."},
  {t:"3. User Content",b:"You own all content you upload. You grant Become a limited licence to store and display it solely to provide the service. You are responsible for the accuracy and legality of your content."},
  {t:"4. Medical Disclaimer",b:"Become is a personal organiser and does NOT constitute medical advice. Aftercare guidance and reminders are for general informational purposes only. Always follow your treating practitioner's specific instructions. We accept no liability for harm arising from reliance on in-app information."},
  {t:"5. Acceptable Use",b:"You agree not to: use the app unlawfully; attempt unauthorised access; upload malicious code; scrape or redistribute content; use the app on behalf of another without their consent."},
  {t:"6. Intellectual Property",b:"All IP in Become — name, logo, design, software — belongs to Become or its licensors. You may not copy, modify, or distribute it without written permission."},
  {t:"7. Limitation of Liability",b:"To the maximum extent permitted by Thai law, Become is not liable for indirect or consequential damages including loss of data or missed reminders. Total liability shall not exceed amounts paid in the preceding 12 months."},
  {t:"8. Termination",b:"You may delete your account at any time. We may suspend your account for breach of these Terms. Data is handled per our Privacy Policy on termination."},
  {t:"9. Changes",b:"We will provide 30 days' notice of material changes. Continued use after the effective date constitutes acceptance."},
  {t:"10. Governing Law",b:"These Terms are governed by Thai law. Disputes shall be resolved in the competent courts of Bangkok, Thailand.\n\nContact: legal@becomeapp.com"},
];

function PolicyModal({title, sections, onClose, onAccept, acceptLabel}){
  return(
    <div style={{position:"fixed",inset:0,background:"#FAF7F2",zIndex:400,display:"flex",flexDirection:"column"}}>
      <div style={{background:"#FAF7F2",borderBottom:"1px solid rgba(180,145,95,0.12)",padding:"52px 24px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:400}}>{title}</h2>
        <button onClick={onClose} style={{background:"#F5EFE6",border:"none",borderRadius:50,padding:"8px 14px",fontSize:12,fontWeight:600,color:"#7A6A58",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Close</button>
      </div>
      <div style={{overflowY:"auto",padding:"20px 24px 48px",flex:1}}>
        {sections.map(s=>(
          <div key={s.t} style={{marginBottom:24}}>
            <p style={{fontSize:13,fontWeight:700,color:"#1C1612",marginBottom:6}}>{s.t}</p>
            <p style={{fontSize:13,color:"#4A3C30",lineHeight:1.7,whiteSpace:"pre-line"}}>{s.b}</p>
          </div>
        ))}
        <div style={{background:"rgba(180,145,95,0.08)",borderRadius:14,padding:"14px 16px",border:"1px solid rgba(180,145,95,0.2)",marginBottom:20}}>
          <p style={{fontSize:12,color:"#8C6E40",lineHeight:1.6}}>Prepared in compliance with Thailand's Personal Data Protection Act B.E. 2562 (2019). For questions: privacy@becomeapp.com</p>
        </div>
        <button onClick={onAccept}
          style={{width:"100%",border:"none",borderRadius:50,padding:"15px",background:"linear-gradient(135deg,#B4915F,#D4B080)",color:"#FAF7F2",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:"0 6px 24px rgba(180,145,95,0.28)"}}>
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────
export default function Become(){
  const [authScreen,setAuthScreen]=useState("login");
  const [oauthProvider,setOauthProvider]=useState(null);
  const [otpMethod,setOtpMethod]=useState("email");
  const [otpContact,setOtpContact]=useState("");
  const [otp,setOtp]=useState(["","","","",""]);
  const [otpError,setOtpError]=useState("");
  const [signupForm,setSignupForm]=useState({name:"",email:"",phone:"",countryCode:"+66 TH",password:""});
  const [loginForm,setLoginForm]=useState({email:"",password:""});
  const oR0=useRef(),oR1=useRef(),oR2=useRef(),oR3=useRef(),oR4=useRef();
  const otpRefs=[oR0,oR1,oR2,oR3,oR4];

  const [treatments,setTreatments]=useState(SAMPLE_DATA);
  const [appTab,setAppTab]=useState("home");
  const [view,setView]=useState("home");
  const [selectedId,setSelectedId]=useState(null);
  const [sessionIdx,setSessionIdx]=useState(null);
  const [detailTab,setDetailTab]=useState("sessions");
  const [showAdd,setShowAdd]=useState(false);
  const [showLog,setShowLog]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [editForm,setEditForm]=useState(null);
  const [showEditSession,setShowEditSession]=useState(false);
  const [editSessionForm,setEditSessionForm]=useState(null);
  const [logTargetIdx,setLogTargetIdx]=useState(null);
  const fileRef=useRef(null);
  const editPhotoRef=useRef(null);
  const [language,setLanguage]=useState("English");
  const [currency,setCurrency]=useState("THB — Thai Baht ฿");
  const [showLangPicker,setShowLangPicker]=useState(false);
  const [showCurrPicker,setShowCurrPicker]=useState(false);
  const [profilePhoto,setProfilePhoto]=useState(null);
  const [showEditProfile,setShowEditProfile]=useState(false);
  const [profileForm,setProfileForm]=useState({name:"Sophia Chen",email:"sophia.chen@gmail.com",phone:"+66 89 123 4567"});
  const profilePhotoRef=useRef(null);
  const [showPrivacy,setShowPrivacy]=useState(false);
  const [showTerms,setShowTerms]=useState(false);
  const [privacyAccepted,setPrivacyAccepted]=useState(false);
  const [termsAccepted,setTermsAccepted]=useState(false);
  const [form,setForm]=useState({name:"Laser Hair Removal",customName:"",clinic:"",brandUnit:"",totalSessions:"",frequency:30,frequencyLabel:"Monthly",customDays:"",expiryDate:"",notes:""});
  const [logForm,setLogForm]=useState({date:new Date().toISOString().split("T")[0],note:"",photo:null});

  const sel=treatments.find(t=>t.id===selectedId);
  const pal=sel?PALETTE[sel.palette%PALETTE.length]:PALETTE[0];
  const ac=sel?(AFTERCARE[sel.name]||AFTERCARE["Other"]):null;
  const sortedSessions=sel?[...sel.sessions].sort((a,b)=>new Date(a.date)-new Date(b.date)):[];
  const selSession=(sel&&sessionIdx!==null)?sortedSessions[sessionIdx]:null;

  const urgent=useMemo(()=>treatments.filter(t=>{
    const e=daysUntil(t.expiryDate),r=t.totalSessions-t.sessions.length;
    return(e!==null&&e<=30&&e>=0)||r===0;
  }),[treatments]);


  function handleOtpInput(val,i){
    if(!/^\d*$/.test(val))return;
    const next=[...otp];next[i]=val.slice(-1);setOtp(next);
    if(val&&i<4)otpRefs[i+1].current&&otpRefs[i+1].current.focus();
  }
  function handleOtpKey(e,i){if(e.key==="Backspace"&&!otp[i]&&i>0)otpRefs[i-1].current&&otpRefs[i-1].current.focus();}
  function verifyOtp(){if(otp.join("")==="12345"){setAuthScreen("app");setOtpError("");}else setOtpError("Incorrect code. Please try again.");}
  function sendOtp(method,contact){setOtpMethod(method);setOtpContact(contact);setOtp(["","","","",""]);setOtpError("");setAuthScreen("otp");}
  function openDot(tId,idx,session){
    setSelectedId(tId);
    if(session){setSessionIdx(idx);setView("session");}
    else{setLogTargetIdx(idx);setLogForm({date:new Date().toISOString().split("T")[0],note:"",photo:null});setShowLog(true);}
  }
  function logSession(){
    setTreatments(treatments.map(t=>t.id!==selectedId?t:{...t,sessions:[...t.sessions,{id:Date.now(),date:logForm.date,note:logForm.note,photo:logForm.photo}]}));
    setShowLog(false);setLogForm({date:new Date().toISOString().split("T")[0],note:"",photo:null});
  }
  function updatePhoto(photo){
    setTreatments(prev=>prev.map(t=>{
      if(t.id!==selectedId)return t;
      const s2=[...t.sessions].sort((a,b)=>new Date(a.date)-new Date(b.date));
      const target=s2[sessionIdx];
      return{...t,sessions:t.sessions.map(s=>s.id===target.id?{...s,photo}:s)};
    }));
  }
  function addTreatment(){
    const n=form.name==="Other"?form.customName:form.name;
    const freq=form.frequencyLabel==="Custom"?parseInt(form.customDays):form.frequency;
    setTreatments([...treatments,{id:Date.now(),name:n,clinic:form.clinic,brandUnit:form.brandUnit,totalSessions:parseInt(form.totalSessions),frequency:freq,frequencyLabel:form.frequencyLabel,expiryDate:form.expiryDate,palette:treatments.length%PALETTE.length,notes:form.notes,sessions:[]}]);
    setShowAdd(false);
    setForm({name:"Laser Hair Removal",customName:"",clinic:"",brandUnit:"",totalSessions:"",frequency:30,frequencyLabel:"Monthly",customDays:"",expiryDate:"",notes:""});
  }
  function deleteTreatment(id){setTreatments(treatments.filter(t=>t.id!==id));setView("home");}
  function goToDetail(id){setSelectedId(id);setDetailTab("sessions");setView("detail");}
  function openEdit(t){setEditForm({name:t.name,clinic:t.clinic,brandUnit:t.brandUnit||"",totalSessions:String(t.totalSessions),frequency:t.frequency,frequencyLabel:t.frequencyLabel,customDays:"",expiryDate:t.expiryDate||"",notes:t.notes||""});setShowEdit(true);}
  function saveEdit(){
    if(!editForm||!sel)return;
    const freq=editForm.frequencyLabel==="Custom"?parseInt(editForm.customDays):editForm.frequency;
    setTreatments(treatments.map(t=>t.id!==sel.id?t:{...t,name:editForm.name,clinic:editForm.clinic,brandUnit:editForm.brandUnit,totalSessions:parseInt(editForm.totalSessions),frequency:freq,frequencyLabel:editForm.frequencyLabel,expiryDate:editForm.expiryDate,notes:editForm.notes}));
    setShowEdit(false);
  }
  function openEditSession(session){setEditSessionForm({date:session.date,note:session.note||""});setShowEditSession(true);}
  function saveEditSession(){
    if(!editSessionForm||!sel||sessionIdx===null)return;
    const sorted=[...sel.sessions].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const target=sorted[sessionIdx];
    setTreatments(treatments.map(t=>t.id!==sel.id?t:{...t,sessions:t.sessions.map(s=>s.id===target.id?{...s,date:editSessionForm.date,note:editSessionForm.note}:s)}));
    setShowEditSession(false);
  }

  const S=`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    .app{max-width:430px;margin:0 auto;min-height:100vh;}
    .card{background:#FFF;border-radius:20px;box-shadow:0 2px 16px rgba(28,22,18,0.06);border:1px solid rgba(180,145,95,0.1);}
    .tcard{background:#FFF;border-radius:20px;box-shadow:0 2px 16px rgba(28,22,18,0.06);border:1px solid rgba(180,145,95,0.1);cursor:pointer;transition:all 0.2s;}
    .tcard:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(28,22,18,0.1);border-color:rgba(180,145,95,0.22);}
    .ucard{background:#FFF;border-radius:16px;box-shadow:0 2px 12px rgba(28,22,18,0.05);border:1px solid rgba(180,145,95,0.1);cursor:pointer;transition:all 0.18s;}
    .ucard:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(28,22,18,0.1);}
    .btn{border:none;border-radius:50px;padding:15px 28px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;width:100%;}
    .btn:hover{transform:translateY(-1px);}
    .btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;}
    .btn-c{background:linear-gradient(135deg,#B4915F,#D4B080);color:#FAF7F2;box-shadow:0 6px 24px rgba(180,145,95,0.28);}
    .btn-c:hover{box-shadow:0 10px 32px rgba(180,145,95,0.4);}
    .btn-g{background:transparent;border:1.5px solid rgba(180,145,95,0.3);color:#B4915F;}
    .btn-g:hover{background:rgba(180,145,95,0.05);}
    .inp{width:100%;padding:13px 16px;border:1.5px solid #EDE5D8;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1C1612;background:#FAF7F2;outline:none;transition:border 0.2s;}
    .inp:focus{border-color:#B4915F;box-shadow:0 0 0 3px rgba(180,145,95,0.1);}
    .inp::placeholder{color:#C4B8A8;}
    select.inp{appearance:none;}
    textarea.inp{resize:none;}
    .lbl{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#9A8A78;margin-bottom:8px;display:block;}
    .pill{display:inline-flex;align-items:center;padding:3px 11px;border-radius:20px;font-size:11px;font-weight:600;}
    .pill-ok{background:#EAF5EE;color:#4A9A6A;}
    .pill-warn{background:#FEF5E4;color:#C89040;}
    .pill-done{background:#F5EFE6;color:#9A8A78;}
    .pill-c{background:rgba(180,145,95,0.1);color:#8C6E40;border:1px solid rgba(180,145,95,0.18);}
    .pill-danger{background:#FAEAEA;color:#C05858;}
    .pill-late{background:#F5E6F0;color:#A0407A;border:1px solid rgba(160,64,122,0.2);}
    .mbg{position:fixed;inset:0;background:rgba(28,22,18,0.45);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
    .msheet{background:#FAF7F2;border-radius:28px 28px 0 0;padding:12px 24px 52px;width:100%;max-width:430px;max-height:90vh;overflow-y:auto;animation:slideUp 0.32s cubic-bezier(0.16,1,0.3,1);}
    .mhandle{width:36px;height:4px;border-radius:2px;background:#EDE5D8;margin:0 auto 24px;}
    .nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(250,247,242,0.97);backdrop-filter:blur(20px);border-top:1px solid rgba(180,145,95,0.1);padding:10px 0 26px;display:flex;justify-content:space-around;align-items:center;z-index:100;}
    .nbtn{background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 20px;border-radius:12px;transition:background 0.15s;}
    .nbtn:hover{background:#F5EFE6;}
    .nbtn.on{background:rgba(180,145,95,0.1);}
    .back{background:#F5EFE6;border:none;border-radius:50px;padding:8px 16px 8px 12px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:#7A6A58;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.15s;}
    .back:hover{background:#EDE5D8;}
    .tabs{display:flex;background:#F5EFE6;border-radius:14px;padding:4px;}
    .t{flex:1;padding:10px;background:none;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;color:#9A8A78;}
    .t.on{background:#FFF;color:#1C1612;box-shadow:0 2px 8px rgba(28,22,18,0.08);}
    .soc{width:100%;padding:14px;border:1.5px solid #EDE5D8;border-radius:14px;background:#FFF;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:#1C1612;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.15s;}
    .soc:hover{border-color:rgba(180,145,95,0.3);transform:translateY(-1px);}
    .otp{width:52px;height:60px;border:1.5px solid #EDE5D8;border-radius:14px;background:#FFF;font-family:'DM Sans',sans-serif;font-size:24px;font-weight:600;color:#1C1612;text-align:center;outline:none;transition:border 0.2s;}
    .otp:focus{border-color:#B4915F;box-shadow:0 0 0 3px rgba(180,145,95,0.1);}
    .otp.done{border-color:#B4915F;background:rgba(180,145,95,0.06);}
    .srow{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid rgba(180,145,95,0.08);cursor:pointer;transition:opacity 0.15s;}
    .srow:hover{opacity:0.72;}
    .srow:last-child{border-bottom:none;}
    .rule{height:1px;background:linear-gradient(90deg,transparent,rgba(180,145,95,0.2),transparent);margin:20px 0;}
    @keyframes slideUp{from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes popIn{from{transform:scale(0.96);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes petalDrift{0%{transform:translate(0,0) rotate(0deg)}25%{transform:translate(4px,-3px) rotate(8deg)}50%{transform:translate(8px,2px) rotate(-4deg)}75%{transform:translate(3px,5px) rotate(10deg)}100%{transform:translate(0,0) rotate(0deg)}}
    @keyframes petalFloat{0%{transform:translate(0,0) rotate(0deg)}33%{transform:translate(-5px,3px) rotate(-10deg)}66%{transform:translate(3px,6px) rotate(6deg)}100%{transform:translate(0,0) rotate(0deg)}}
    @keyframes petalSway{0%{transform:translate(0,0) rotate(0deg) scale(1)}50%{transform:translate(6px,-4px) rotate(12deg) scale(1.05)}100%{transform:translate(0,0) rotate(0deg) scale(1)}}
    @keyframes petalFall{0%{transform:translateY(0) rotate(0deg) translateX(0)}30%{transform:translateY(4px) rotate(-6deg) translateX(3px)}60%{transform:translateY(8px) rotate(5deg) translateX(-2px)}100%{transform:translateY(0) rotate(0deg) translateX(0)}}
    .pop{animation:popIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0;}
    .p1{animation-delay:.05s}.p2{animation-delay:.1s}.p3{animation-delay:.15s}.p4{animation-delay:.2s}.p5{animation-delay:.25s}
    ::-webkit-scrollbar{width:0;}
  `;

  const gLogo=<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;
  const fLogo=<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
  const aLogo=<svg width="16" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>;

  return (
    <div style={{minHeight:"100vh",background:"#FAF7F2",fontFamily:"'DM Sans',sans-serif",color:"#1C1612"}}>
      <style>{S}</style>

      {/* Policy modals — rendered at root so accessible from any screen */}
      {showPrivacy&&<PolicyModal title="Privacy Policy" sections={PRIVACY_SECTIONS} onClose={()=>setShowPrivacy(false)} onAccept={()=>{setPrivacyAccepted(true);setShowPrivacy(false);}} acceptLabel="I Have Read and Accept"/>}
      {showTerms&&<PolicyModal title="Terms of Service" sections={TERMS_SECTIONS} onClose={()=>setShowTerms(false)} onAccept={()=>{setTermsAccepted(true);setShowTerms(false);}} acceptLabel="I Agree to the Terms"/>}

      {/* OAuth overlay */}
      {oauthProvider&&(
        <OAuthScreen
          provider={oauthProvider}
          onSuccess={()=>{setOauthProvider(null);setAuthScreen("app");}}
          onCancel={()=>setOauthProvider(null)}
        />
      )}

      {/* ── LOGIN ── */}
      {authScreen==="login"&&(
        <div className="app" style={{padding:"0 24px"}}>
          <div style={{textAlign:"center",padding:"80px 0 36px"}}>
            <div style={{width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,#B4915F,#D4B080)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 8px 24px rgba(180,145,95,0.28)"}}>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:34,fontWeight:300,color:"#FAF7F2",fontStyle:"italic"}}>b</span>
            </div>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:40,fontWeight:300,letterSpacing:4,marginBottom:6}}>become</h1>
            <p style={{fontSize:12,color:"#9A8A78",letterSpacing:2,textTransform:"uppercase"}}>Your best self, on schedule</p>
          </div>
          <div className="rule"/>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
            <button className="soc" onClick={()=>setOauthProvider("google")}>{gLogo} Continue with Google</button>
            <button className="soc" style={{background:"#1877F2",border:"none",color:"#FFF"}} onClick={()=>setOauthProvider("facebook")}>{fLogo} Continue with Facebook</button>
            <button className="soc" style={{background:"#1C1612",border:"none",color:"#FFF"}} onClick={()=>setOauthProvider("apple")}>{aLogo} Continue with Apple</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <div style={{flex:1,height:1,background:"#EDE5D8"}}/><span style={{fontSize:12,color:"#C4B8A8"}}>or</span><div style={{flex:1,height:1,background:"#EDE5D8"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
            <input className="inp" placeholder="Email address" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})}/>
            <input className="inp" type="password" placeholder="Password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})}/>
            <button className="btn btn-c" onClick={()=>sendOtp("email",loginForm.email||"your email")}>Sign In</button>
          </div>
          <p style={{textAlign:"center",fontSize:13,color:"#9A8A78",marginBottom:32}}>
            Don't have an account?{" "}
            <button onClick={()=>setAuthScreen("signup")} style={{background:"none",border:"none",fontSize:13,fontWeight:600,color:"#B4915F",cursor:"pointer",fontFamily:"inherit"}}>Sign up</button>
          </p>
        </div>
      )}

      {/* ── SIGN UP ── */}
      {authScreen==="signup"&&(
        <div className="app" style={{padding:"0 24px 48px"}}>
          <div style={{padding:"56px 0 28px",display:"flex",alignItems:"center",gap:14}}>
            <button className="back" onClick={()=>setAuthScreen("login")}>← Back</button>
            <div>
              <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:400}}>Create account</h2>
              <p style={{fontSize:13,color:"#9A8A78",marginTop:2}}>Start your becoming journey</p>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div><span className="lbl">Full name</span><input className="inp" placeholder="e.g. Sophia Chen" value={signupForm.name} onChange={e=>setSignupForm({...signupForm,name:e.target.value})}/></div>
            <div><span className="lbl">Email address</span><input className="inp" placeholder="sophia@email.com" value={signupForm.email} onChange={e=>setSignupForm({...signupForm,email:e.target.value})}/></div>
            <div>
              <span className="lbl">Phone number</span>
              <div style={{display:"flex",gap:10}}>
                <select className="inp" style={{width:124,flexShrink:0}} value={signupForm.countryCode} onChange={e=>setSignupForm({...signupForm,countryCode:e.target.value})}>
                  {COUNTRY_CODES.map(c=><option key={c}>{c}</option>)}
                </select>
                <input className="inp" placeholder="89 123 4567" value={signupForm.phone} onChange={e=>setSignupForm({...signupForm,phone:e.target.value})}/>
              </div>
            </div>
            <div><span className="lbl">Password</span><input className="inp" type="password" placeholder="At least 8 characters" value={signupForm.password} onChange={e=>setSignupForm({...signupForm,password:e.target.value})}/></div>
            <div className="rule"/>
            <p style={{fontSize:12,color:"#9A8A78",textAlign:"center"}}>Verify with</p>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-c" style={{flex:1,opacity:privacyAccepted&&termsAccepted?1:0.4}} disabled={!privacyAccepted||!termsAccepted} onClick={()=>sendOtp("email",signupForm.email||"your email")}>Email OTP</button>
              <button className="btn btn-g" style={{flex:1,opacity:privacyAccepted&&termsAccepted?1:0.4}} disabled={!privacyAccepted||!termsAccepted} onClick={()=>sendOtp("phone",signupForm.phone?`${signupForm.countryCode} ${signupForm.phone}`:"your number")}>Phone OTP</button>
            </div>
            <div className="rule"/>
            <button className="soc" style={{opacity:privacyAccepted&&termsAccepted?1:0.4}} disabled={!privacyAccepted||!termsAccepted} onClick={()=>setOauthProvider("google")}>{gLogo} Sign up with Google</button>
            <button className="soc" style={{background:"#1877F2",border:"none",color:"#FFF",opacity:privacyAccepted&&termsAccepted?1:0.4}} disabled={!privacyAccepted||!termsAccepted} onClick={()=>setOauthProvider("facebook")}>{fLogo} Sign up with Facebook</button>
            {/* Acceptance checkboxes */}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:4}}>
              <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
                <div onClick={()=>setPrivacyAccepted(v=>!v)}
                  style={{width:20,height:20,borderRadius:6,border:`2px solid ${privacyAccepted?"#B4915F":"#EDE5D8"}`,background:privacyAccepted?"#B4915F":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s",cursor:"pointer"}}>
                  {privacyAccepted&&<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <p style={{fontSize:12,color:"#6B6060",lineHeight:1.6}}>
                  I have read and accept the{" "}
                  <span onClick={e=>{e.stopPropagation();setShowPrivacy(true);}} style={{color:"#B4915F",fontWeight:600,textDecoration:"underline",cursor:"pointer"}}>Privacy Policy</span>
                  {" "}and consent to the collection and processing of my personal data under Thailand's PDPA
                </p>
              </label>
              <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
                <div onClick={()=>setTermsAccepted(v=>!v)}
                  style={{width:20,height:20,borderRadius:6,border:`2px solid ${termsAccepted?"#B4915F":"#EDE5D8"}`,background:termsAccepted?"#B4915F":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all 0.15s",cursor:"pointer"}}>
                  {termsAccepted&&<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <p style={{fontSize:12,color:"#6B6060",lineHeight:1.6}}>
                  I agree to the{" "}
                  <span onClick={e=>{e.stopPropagation();setShowTerms(true);}} style={{color:"#B4915F",fontWeight:600,textDecoration:"underline",cursor:"pointer"}}>Terms of Service</span>
                </p>
              </label>
              {(!privacyAccepted||!termsAccepted)&&(
                <p style={{fontSize:11,color:"#C4A098",textAlign:"center"}}>Please accept both to continue</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── OTP ── */}
      {authScreen==="otp"&&(
        <div className="app" style={{padding:"0 24px"}}>
          <div style={{paddingTop:56}}>
            <button className="back" onClick={()=>setAuthScreen("signup")} style={{marginBottom:32}}>← Back</button>
            <div style={{width:52,height:52,borderRadius:14,background:"#F5EFE6",border:"1px solid rgba(180,145,95,0.2)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,fontSize:22}}>
              {otpMethod==="email"?"✉":"📱"}
            </div>
            <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:400,marginBottom:8}}>Check your {otpMethod==="email"?"email":"phone"}</h2>
            <p style={{fontSize:14,color:"#9A8A78",lineHeight:1.6,marginBottom:4}}>We sent a 5-digit code to</p>
            <p style={{fontSize:14,fontWeight:600,marginBottom:32}}>{otpContact}</p>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:20}}>
              {otp.map((val,i)=>(
                <input key={i} ref={otpRefs[i]} className={`otp${val?" done":""}`} type="text" inputMode="numeric" maxLength={1} value={val}
                  onChange={e=>handleOtpInput(e.target.value,i)} onKeyDown={e=>handleOtpKey(e,i)}/>
              ))}
            </div>
            {otpError&&(
              <div style={{background:"#FAEAEA",borderRadius:12,padding:"10px 16px",marginBottom:16,textAlign:"center"}}>
                <p style={{fontSize:13,color:"#C05858",fontWeight:500}}>{otpError}</p>
              </div>
            )}
            <div style={{background:"#F5EFE6",borderRadius:12,padding:"12px 16px",marginBottom:24}}>
              <p style={{fontSize:12,color:"#9A8A78",textAlign:"center"}}>💡 Demo code: <strong style={{color:"#B4915F"}}>12345</strong></p>
            </div>
            <button className="btn btn-c" onClick={verifyOtp} disabled={otp.join("").length<5}>Verify & Continue</button>
            <p style={{textAlign:"center",fontSize:13,color:"#9A8A78",marginTop:20}}>
              Didn't receive it?{" "}
              <button onClick={()=>{setOtp(["","","","",""]);setOtpError("");}} style={{background:"none",border:"none",fontSize:13,fontWeight:600,color:"#B4915F",cursor:"pointer",fontFamily:"inherit"}}>Resend</button>
            </p>
          </div>
        </div>
      )}

      {/* ── APP ── */}
      {authScreen==="app"&&(
        <div className="app">

          {/* PROFILE */}
          {appTab==="profile"&&view==="home"&&(
            <div style={{paddingBottom:100}}>
              <div style={{background:"linear-gradient(160deg,#EDE5D8,#F5EFE6,#FAF7F2)",padding:"60px 24px 28px",borderRadius:"0 0 32px 32px",borderBottom:"1px solid rgba(180,145,95,0.12)",position:"relative",overflow:"hidden"}}>
                {/* Sakura — profile header */}
                <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0}}>
                  <svg width="100%" height="100%" viewBox="0 0 430 180" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="sakuraFadeP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="0"/>
                        <stop offset="60%" stopColor="white" stopOpacity="0"/>
                        <stop offset="100%" stopColor="#FAF7F2" stopOpacity="1"/>
                      </linearGradient>
                      <path id="petalP" d="M0,-11 C3.5,-7.5 5,-1.5 0,1 C-5,-1.5 -3.5,-7.5 0,-11Z"/>
                    </defs>
                    <g transform="translate(360,28)" opacity="0.28" style={{animation:"petalDrift 7s ease-in-out infinite",transformOrigin:"360px 28px"}}>
                      <g fill="#D4788A" transform="scale(1.3)"><use href="#petalP" transform="rotate(0)"/><use href="#petalP" transform="rotate(72)"/><use href="#petalP" transform="rotate(144)"/><use href="#petalP" transform="rotate(216)"/><use href="#petalP" transform="rotate(288)"/></g>
                      <circle cx="0" cy="0" r="2.5" fill="#F0B8C8" opacity="0.8"/>
                    </g>
                    <g transform="translate(410,70)" opacity="0.22" style={{animation:"petalFloat 9s ease-in-out infinite 1.5s",transformOrigin:"410px 70px"}}>
                      <g fill="#CC7888" transform="scale(1.5)"><use href="#petalP" transform="rotate(20)"/><use href="#petalP" transform="rotate(92)"/><use href="#petalP" transform="rotate(164)"/><use href="#petalP" transform="rotate(236)"/><use href="#petalP" transform="rotate(308)"/></g>
                      <circle cx="0" cy="0" r="3" fill="#F0B8C8" opacity="0.7"/>
                    </g>
                    <g transform="translate(300,15)" opacity="0.18" style={{animation:"petalSway 10s ease-in-out infinite 0.5s",transformOrigin:"300px 15px"}}>
                      <g fill="#C87890" transform="scale(1.0)"><use href="#petalP" transform="rotate(10)"/><use href="#petalP" transform="rotate(82)"/><use href="#petalP" transform="rotate(154)"/><use href="#petalP" transform="rotate(226)"/><use href="#petalP" transform="rotate(298)"/></g>
                      <circle cx="0" cy="0" r="2" fill="#EAB0C0" opacity="0.6"/>
                    </g>
                    <g transform="translate(420,120)" opacity="0.17" style={{animation:"petalDrift 11s ease-in-out infinite 3s",transformOrigin:"420px 120px"}}>
                      <g fill="#D0809A" transform="scale(1.2)"><use href="#petalP" transform="rotate(30)"/><use href="#petalP" transform="rotate(102)"/><use href="#petalP" transform="rotate(174)"/><use href="#petalP" transform="rotate(246)"/><use href="#petalP" transform="rotate(318)"/></g>
                      <circle cx="0" cy="0" r="2" fill="#EAB0C0" opacity="0.5"/>
                    </g>
                    <g transform="translate(50,20)" opacity="0.16" style={{animation:"petalFloat 8s ease-in-out infinite 2s",transformOrigin:"50px 20px"}}>
                      <g fill="#C87890" transform="scale(0.9)"><use href="#petalP" transform="rotate(15)"/><use href="#petalP" transform="rotate(87)"/><use href="#petalP" transform="rotate(159)"/><use href="#petalP" transform="rotate(231)"/><use href="#petalP" transform="rotate(303)"/></g>
                      <circle cx="0" cy="0" r="1.8" fill="#EAB8C4" opacity="0.5"/>
                    </g>
                    <g style={{animation:"petalFall 6s ease-in-out infinite 1s",transformOrigin:"340px 60px"}}>
                      <use href="#petalP" transform="translate(340,60) rotate(45) scale(1.3)" fill="#D4788A" opacity="0.20"/>
                    </g>
                    <g style={{animation:"petalSway 8s ease-in-out infinite 4s",transformOrigin:"390px 95px"}}>
                      <use href="#petalP" transform="translate(390,95) rotate(120) scale(1.4)" fill="#CC7888" opacity="0.18"/>
                    </g>
                    <use href="#petalP" transform="translate(260,30) rotate(200) scale(1.1)" fill="#C87890" opacity="0.14"/>
                    <g style={{animation:"petalDrift 9s ease-in-out infinite 5s",transformOrigin:"130px 45px"}}>
                      <use href="#petalP" transform="translate(130,45) rotate(80) scale(1.0)" fill="#D0809A" opacity="0.14"/>
                    </g>
                    <rect width="430" height="180" fill="url(#sakuraFadeP)"/>
                  </svg>
                </div>
                <div style={{position:"relative",zIndex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:300}}>Profile</h1>
                  <button onClick={()=>setShowEditProfile(true)}
                    style={{background:"rgba(255,255,255,0.7)",border:"1px solid rgba(180,145,95,0.25)",borderRadius:50,padding:"8px 18px",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:"#B4915F",cursor:"pointer",display:"flex",alignItems:"center",gap:6,backdropFilter:"blur(4px)",transition:"all 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.9)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.7)"}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B4915F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  {/* Tappable avatar */}
                  <div style={{position:"relative",flexShrink:0}} onClick={()=>profilePhotoRef.current&&profilePhotoRef.current.click()}>
                    <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#B4915F,#D4B080)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(180,145,95,0.32)",overflow:"hidden",cursor:"pointer"}}>
                      {profilePhoto
                        ? <img src={profilePhoto} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="Profile"/>
                        : <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:400,color:"#FAF7F2"}}>S</span>
                      }
                    </div>
                    {/* Camera badge */}
                    <div style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:"50%",background:"#B4915F",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(180,145,95,0.4)",border:"2px solid #FAF7F2",cursor:"pointer"}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                    <input ref={profilePhotoRef} type="file" accept="image/*" style={{display:"none"}}
                      onChange={e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setProfilePhoto(ev.target.result);r.readAsDataURL(f);}}/>
                  </div>
                  <div>
                    <p style={{fontSize:17,fontWeight:600}}>{profileForm.name}</p>
                    <p style={{fontSize:13,color:"#9A8A78",marginTop:2}}>{profileForm.email}</p>
                    <p style={{fontSize:13,color:"#9A8A78"}}>{profileForm.phone}</p>
                    <p style={{fontSize:11,color:"#B4915F",marginTop:4,cursor:"pointer"}} onClick={()=>profilePhotoRef.current&&profilePhotoRef.current.click()}>Tap photo to change</p>
                  </div>
                </div>
                </div>{/* end zIndex wrapper - profile */}
              </div>
              <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:16}}>
                <div>
                  <p style={{fontSize:10,fontWeight:600,color:"#9A8A78",letterSpacing:2,textTransform:"uppercase",marginBottom:10,paddingLeft:4}}>Account</p>
                  <div className="card" style={{padding:"4px 20px"}}>
                    {[{l:"Full Name",v:profileForm.name},{l:"Email",v:profileForm.email},{l:"Phone",v:profileForm.phone}].map(r=>(
                      <div key={r.l} className="srow" style={{cursor:"default"}}><p style={{fontSize:13,fontWeight:500}}>{r.l}</p><p style={{fontSize:13,color:"#9A8A78"}}>{r.v}</p></div>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{fontSize:10,fontWeight:600,color:"#9A8A78",letterSpacing:2,textTransform:"uppercase",marginBottom:10,paddingLeft:4}}>Preferences</p>
                  <div className="card" style={{padding:"4px 20px"}}>
                    <div className="srow" onClick={()=>setShowLangPicker(true)}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>🌐</span><p style={{fontSize:13,fontWeight:500}}>Language</p></div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><p style={{fontSize:13,color:"#9A8A78"}}>{language.split("—")[0].trim()}</p><span style={{color:"#C4B8A8"}}>›</span></div>
                    </div>
                    <div className="srow" onClick={()=>setShowCurrPicker(true)}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>💱</span><p style={{fontSize:13,fontWeight:500}}>Currency</p></div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><p style={{fontSize:13,color:"#9A8A78"}}>{currency.split("—")[0].trim()}</p><span style={{color:"#C4B8A8"}}>›</span></div>
                    </div>
                    <div className="srow"><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>🔔</span><p style={{fontSize:13,fontWeight:500}}>Notifications</p></div><span style={{color:"#C4B8A8"}}>›</span></div>
                  </div>
                </div>
                <div>
                  <p style={{fontSize:10,fontWeight:600,color:"#9A8A78",letterSpacing:2,textTransform:"uppercase",marginBottom:10,paddingLeft:4}}>Support</p>
                  <div className="card" style={{padding:"4px 20px"}}>
                    <div className="srow" onClick={()=>{}}><p style={{fontSize:13,fontWeight:500}}>Help Centre</p><span style={{color:"#C4B8A8"}}>›</span></div>
                    <div className="srow" onClick={()=>setShowPrivacy(true)}><p style={{fontSize:13,fontWeight:500}}>Privacy Policy</p><span style={{color:"#C4B8A8"}}>›</span></div>
                    <div className="srow" onClick={()=>setShowTerms(true)}><p style={{fontSize:13,fontWeight:500}}>Terms of Service</p><span style={{color:"#C4B8A8"}}>›</span></div>
                  </div>
                </div>
                <button className="btn btn-g" onClick={()=>{setAuthScreen("login");setAppTab("home");setView("home");}}>Sign Out</button>
                <p style={{fontSize:11,color:"#C4B8A8",textAlign:"center"}}>Become v1.0.0</p>
              </div>
            </div>
          )}

          {/* HOME */}
          {appTab==="home"&&view==="home"&&(
            <div style={{paddingBottom:100}}>
              <div style={{background:"linear-gradient(160deg,#EDE5D8,#F5EFE6,#FAF7F2)",padding:"60px 24px 28px",borderRadius:"0 0 32px 32px",borderBottom:"1px solid rgba(180,145,95,0.12)",position:"relative",overflow:"hidden"}}>
                {/* Sakura background pattern */}
                <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0}}>
                  <svg width="100%" height="100%" viewBox="0 0 430 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="sakuraFade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="0"/>
                        <stop offset="55%" stopColor="white" stopOpacity="0"/>
                        <stop offset="100%" stopColor="#FAF7F2" stopOpacity="1"/>
                      </linearGradient>
                      <path id="petal" d="M0,-12 C4,-8 6,-2 0,1 C-6,-2 -4,-8 0,-12Z"/>
                      <path id="petalB" d="M0,-9 C3,-6 4,-1 0,1 C-4,-1 -3,-6 0,-9Z"/>
                    </defs>

                    {/* ── BIG ANCHOR FLOWERS ── */}
                    {/* F1 top-right large — drifts */}
                    <g transform="translate(345,32)" opacity="0.17" style={{animation:"petalDrift 6s ease-in-out infinite",transformOrigin:"345px 32px"}}>
                      <g fill="#D4788A"><use href="#petal" transform="rotate(0) scale(1.4)"/><use href="#petal" transform="rotate(72) scale(1.4)"/><use href="#petal" transform="rotate(144) scale(1.4)"/><use href="#petal" transform="rotate(216) scale(1.4)"/><use href="#petal" transform="rotate(288) scale(1.4)"/></g>
                      <circle cx="0" cy="0" r="3" fill="#F0B8C8" opacity="0.9"/>
                    </g>
                    {/* F2 right edge — floats */}
                    <g transform="translate(408,62)" opacity="0.26" style={{animation:"petalFloat 8s ease-in-out infinite 1.5s",transformOrigin:"408px 62px"}}>
                      <g fill="#E0909A" transform="scale(1.6)"><use href="#petal" transform="rotate(20)"/><use href="#petal" transform="rotate(92)"/><use href="#petal" transform="rotate(164)"/><use href="#petal" transform="rotate(236)"/><use href="#petal" transform="rotate(308)"/></g>
                      <circle cx="0" cy="0" r="3.5" fill="#F0C0D0" opacity="0.8"/>
                    </g>
                    {/* F3 upper-centre — sways */}
                    <g transform="translate(270,15)" opacity="0.20" style={{animation:"petalSway 9s ease-in-out infinite 0.5s",transformOrigin:"270px 15px"}}>
                      <g fill="#C87890" transform="scale(1.1)"><use href="#petal" transform="rotate(10)"/><use href="#petal" transform="rotate(82)"/><use href="#petal" transform="rotate(154)"/><use href="#petal" transform="rotate(226)"/><use href="#petal" transform="rotate(298)"/></g>
                      <circle cx="0" cy="0" r="2.5" fill="#EAB0C0" opacity="0.7"/>
                    </g>
                    {/* F4 mid-right large — sways */}
                    <g transform="translate(378,95)" opacity="0.15" style={{animation:"petalSway 7s ease-in-out infinite 0.8s",transformOrigin:"378px 95px"}}>
                      <g fill="#D8809A" transform="scale(1.8)"><use href="#petal" transform="rotate(5)"/><use href="#petal" transform="rotate(77)"/><use href="#petal" transform="rotate(149)"/><use href="#petal" transform="rotate(221)"/><use href="#petal" transform="rotate(293)"/></g>
                      <circle cx="0" cy="0" r="3.5" fill="#F0B8C8" opacity="0.8"/>
                    </g>
                    {/* F5 top-left — drifts */}
                    <g transform="translate(55,28)" opacity="0.22" style={{animation:"petalDrift 10s ease-in-out infinite 2s",transformOrigin:"55px 28px"}}>
                      <g fill="#CC7888" transform="scale(1.3)"><use href="#petal" transform="rotate(15)"/><use href="#petal" transform="rotate(87)"/><use href="#petal" transform="rotate(159)"/><use href="#petal" transform="rotate(231)"/><use href="#petal" transform="rotate(303)"/></g>
                      <circle cx="0" cy="0" r="2.5" fill="#EAB0C0" opacity="0.7"/>
                    </g>
                    {/* F6 upper-mid — floats */}
                    <g transform="translate(195,10)" opacity="0.18" style={{animation:"petalFloat 9s ease-in-out infinite 3s",transformOrigin:"195px 10px"}}>
                      <g fill="#D4889A" transform="scale(1.0)"><use href="#petal" transform="rotate(0)"/><use href="#petal" transform="rotate(72)"/><use href="#petal" transform="rotate(144)"/><use href="#petal" transform="rotate(216)"/><use href="#petal" transform="rotate(288)"/></g>
                      <circle cx="0" cy="0" r="2" fill="#EAB8C4" opacity="0.6"/>
                    </g>
                    {/* F7 far right low — floats */}
                    <g transform="translate(422,128)" opacity="0.24" style={{animation:"petalFloat 10s ease-in-out infinite 2s",transformOrigin:"422px 128px"}}>
                      <g fill="#CC7888" transform="scale(1.4)"><use href="#petal" transform="rotate(30)"/><use href="#petal" transform="rotate(102)"/><use href="#petal" transform="rotate(174)"/><use href="#petal" transform="rotate(246)"/><use href="#petal" transform="rotate(318)"/></g>
                      <circle cx="0" cy="0" r="3" fill="#F0B8C8" opacity="0.7"/>
                    </g>
                    {/* F8 centre-left — drifts */}
                    <g transform="translate(120,45)" opacity="0.17" style={{animation:"petalDrift 8s ease-in-out infinite 4s",transformOrigin:"120px 45px"}}>
                      <g fill="#C87890" transform="scale(0.9)"><use href="#petal" transform="rotate(0)"/><use href="#petal" transform="rotate(72)"/><use href="#petal" transform="rotate(144)"/><use href="#petal" transform="rotate(216)"/><use href="#petal" transform="rotate(288)"/></g>
                      <circle cx="0" cy="0" r="2" fill="#EAB0C0" opacity="0.6"/>
                    </g>
                    {/* F9 top far-left — sways */}
                    <g transform="translate(22,18)" opacity="0.15" style={{animation:"petalSway 11s ease-in-out infinite 1s",transformOrigin:"22px 18px"}}>
                      <g fill="#D08090" transform="scale(0.85)"><use href="#petal" transform="rotate(40)"/><use href="#petal" transform="rotate(112)"/><use href="#petal" transform="rotate(184)"/><use href="#petal" transform="rotate(256)"/><use href="#petal" transform="rotate(328)"/></g>
                      <circle cx="0" cy="0" r="1.8" fill="#EAB8C4" opacity="0.5"/>
                    </g>
                    {/* F10 mid-centre — falls */}
                    <g transform="translate(310,65)" opacity="0.18" style={{animation:"petalFall 7s ease-in-out infinite 0.3s",transformOrigin:"310px 65px"}}>
                      <g fill="#D07888" transform="scale(1.0)"><use href="#petal" transform="rotate(20)"/><use href="#petal" transform="rotate(92)"/><use href="#petal" transform="rotate(164)"/><use href="#petal" transform="rotate(236)"/><use href="#petal" transform="rotate(308)"/></g>
                      <circle cx="0" cy="0" r="2" fill="#EAB0C0" opacity="0.6"/>
                    </g>
                    {/* F11 lower-right — drifts */}
                    <g transform="translate(395,155)" opacity="0.13" style={{animation:"petalDrift 12s ease-in-out infinite 5s",transformOrigin:"395px 155px"}}>
                      <g fill="#C87890" transform="scale(1.1)"><use href="#petal" transform="rotate(0)"/><use href="#petal" transform="rotate(72)"/><use href="#petal" transform="rotate(144)"/><use href="#petal" transform="rotate(216)"/><use href="#petal" transform="rotate(288)"/></g>
                      <circle cx="0" cy="0" r="2" fill="#EAB0C0" opacity="0.5"/>
                    </g>
                    {/* F12 between left flowers — floats */}
                    <g transform="translate(160,12)" opacity="0.16" style={{animation:"petalFloat 8s ease-in-out infinite 6s",transformOrigin:"160px 12px"}}>
                      <g fill="#D4789A" transform="scale(0.8)"><use href="#petal" transform="rotate(35)"/><use href="#petal" transform="rotate(107)"/><use href="#petal" transform="rotate(179)"/><use href="#petal" transform="rotate(251)"/><use href="#petal" transform="rotate(323)"/></g>
                      <circle cx="0" cy="0" r="1.5" fill="#EAB8C4" opacity="0.5"/>
                    </g>

                    {/* ── LOOSE PETALS drifting ── */}
                    <g style={{animation:"petalFall 5s ease-in-out infinite",transformOrigin:"325px 68px"}}>
                      <use href="#petalB" transform="translate(325,68) rotate(45) scale(1.5)" fill="#D4788A" opacity="0.26"/>
                    </g>
                    <g style={{animation:"petalDrift 7s ease-in-out infinite 4s",transformOrigin:"252px 38px"}}>
                      <use href="#petalB" transform="translate(252,38) rotate(200) scale(1.4)" fill="#CC7888" opacity="0.22"/>
                    </g>
                    <g style={{animation:"petalSway 6s ease-in-out infinite 1s",transformOrigin:"388px 112px"}}>
                      <use href="#petalB" transform="translate(388,112) rotate(80) scale(1.6)" fill="#D8809A" opacity="0.24"/>
                    </g>
                    <g style={{animation:"petalFloat 9s ease-in-out infinite 2.5s",transformOrigin:"78px 52px"}}>
                      <use href="#petalB" transform="translate(78,52) rotate(130) scale(1.3)" fill="#C87890" opacity="0.18"/>
                    </g>
                    <g style={{animation:"petalFall 8s ease-in-out infinite 3.5s",transformOrigin:"420px 72px"}}>
                      <use href="#petalB" transform="translate(420,72) rotate(160) scale(1.2)" fill="#CC7888" opacity="0.20"/>
                    </g>
                    <use href="#petalB" transform="translate(355,44) rotate(120) scale(1.1)" fill="#D4889A" opacity="0.17"/>
                    <g style={{animation:"petalDrift 6s ease-in-out infinite 7s",transformOrigin:"230px 28px"}}>
                      <use href="#petalB" transform="translate(230,28) rotate(60) scale(1.0)" fill="#D07888" opacity="0.16"/>
                    </g>
                    <g style={{animation:"petalSway 10s ease-in-out infinite 1.5s",transformOrigin:"140px 22px"}}>
                      <use href="#petalB" transform="translate(140,22) rotate(300) scale(0.9)" fill="#CC8090" opacity="0.15"/>
                    </g>
                    <g style={{animation:"petalFloat 7s ease-in-out infinite 4.5s",transformOrigin:"440px 100px"}}>
                      <use href="#petalB" transform="translate(440,100) rotate(220) scale(1.3)" fill="#D4788A" opacity="0.18"/>
                    </g>
                    <use href="#petalB" transform="translate(35,42) rotate(75) scale(1.0)" fill="#C87890" opacity="0.13"/>
                    <g style={{animation:"petalFall 9s ease-in-out infinite 6s",transformOrigin:"290px 80px"}}>
                      <use href="#petalB" transform="translate(290,80) rotate(190) scale(1.1)" fill="#D0809A" opacity="0.15"/>
                    </g>

                    {/* Fade overlay */}
                    <rect width="430" height="220" fill="url(#sakuraFade)"/>
                  </svg>
                </div>
                <div style={{position:"relative",zIndex:1}}>
                <div className="pop p1" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <p style={{fontSize:11,color:"#B4915F",fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",marginBottom:10}}>{greet()}</p>
                    <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:44,fontWeight:300,lineHeight:1.05}}>
                      How are you<br/><em style={{fontWeight:400,color:"#B4915F"}}>becoming</em><br/>today?
                    </h1>
                  </div>
                  <div style={{width:46,height:46,borderRadius:13,background:"linear-gradient(135deg,#B4915F,#D4B080)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 20px rgba(180,145,95,0.28)",flexShrink:0}}>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:300,color:"#FAF7F2",fontStyle:"italic"}}>b</span>
                  </div>
                </div>
                </div>{/* end zIndex wrapper */}
              </div>

              <div style={{padding:"20px 20px 0"}}>
                {/* Urgent */}
                {urgent.length>0&&(
                  <div className="pop p2" style={{marginBottom:20}}>
                    <div style={{background:"#FEF5E4",borderRadius:20,padding:"18px 20px",border:"1px solid rgba(200,144,64,0.2)"}}>
                      <p style={{fontSize:10,fontWeight:600,color:"#C89040",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Needs attention</p>
                      {urgent.map((t,i)=>{
                        const e=daysUntil(t.expiryDate),r=t.totalSessions-t.sessions.length;
                        return(
                          <div key={t.id} onClick={()=>goToDetail(t.id)}
                            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:i>0?"1px solid rgba(200,144,64,0.12)":"none",cursor:"pointer"}}>
                            <div>
                              <p style={{fontSize:14,fontWeight:600}}>{t.name}</p>
                              <p style={{fontSize:12,color:"#9A8A78"}}>{t.clinic}</p>
                            </div>
                            <span className="pill pill-warn">{r===0?"All used":`${e}d left`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* Until My Treatment */}
                {treatments.some(t=>getNext(t)&&t.sessions.length<t.totalSessions)&&(
                  <div className="pop p4" style={{marginBottom:20}}>
                    <p style={{fontSize:10,fontWeight:600,color:"#9A8A78",letterSpacing:2,textTransform:"uppercase",marginBottom:14,paddingLeft:4}}>Until my treatment</p>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {treatments
                        .map(t=>({...t,nextDate:getNext(t),nextDays:daysUntil(getNext(t))}))
                        .filter(t=>t.nextDate&&t.sessions.length<t.totalSessions)
                        .sort((a,b)=>(a.nextDays??999)-(b.nextDays??999))
                        .map(t=>{
                          const p=PALETTE[t.palette%PALETTE.length];
                          const d=t.nextDays;
                          const isLate=d!==null&&d<0;
                          const isToday=d===0;
                          const maxDays=180;
                          const pct=isLate?100:isToday?100:Math.max(0,Math.min(100,100-(d/maxDays*100)));
                          const r=20;
                          const circ=2*Math.PI*r;
                          const dash=circ*(pct/100);
                          return(
                            <div key={t.id} className="card" style={{padding:"16px 18px",cursor:"pointer",transition:"all 0.2s"}}
                              onClick={()=>goToDetail(t.id)}
                              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
                              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                              <div style={{display:"flex",alignItems:"center",gap:14}}>
                                {/* Ring countdown */}
                                <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                                  <svg width="52" height="52" viewBox="0 0 52 52">
                                    {/* Track */}
                                    <circle cx="26" cy="26" r={r} fill="none" stroke={p.bg} strokeWidth="4"/>
                                    {/* Progress */}
                                    <circle cx="26" cy="26" r={r} fill="none"
                                      stroke={isLate?"#A0407A":isToday?p.accent:p.accent}
                                      strokeWidth="4"
                                      strokeLinecap="round"
                                      strokeDasharray={`${dash} ${circ}`}
                                      strokeDashoffset={circ*0.25}
                                      style={{transition:"stroke-dasharray 0.6s ease"}}
                                    />
                                  </svg>
                                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                                    <p style={{fontSize:isLate||isToday?10:13,fontWeight:800,color:isLate?"#A0407A":p.accent,lineHeight:1,letterSpacing:-0.3}}>
                                      {isToday?"now":isLate?"late":d}
                                    </p>
                                    {!isToday&&!isLate&&<p style={{fontSize:7,color:p.accent,fontWeight:600,letterSpacing:0.3}}>days</p>}
                                  </div>
                                </div>
                                {/* Info */}
                                <div style={{flex:1,minWidth:0}}>
                                  <p style={{fontSize:14,fontWeight:600,color:"#1C1612",marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.name}</p>
                                  <p style={{fontSize:12,color:"#9A8A78"}}>{t.clinic}</p>
                                </div>
                                {/* Date / status badge */}
                                <div style={{textAlign:"right",flexShrink:0}}>
                                  {isLate?(
                                    <span className="pill pill-late" style={{fontSize:11}}>Late</span>
                                  ):isToday?(
                                    <span style={{fontSize:12,fontWeight:700,color:p.accent}}>Today!</span>
                                  ):(
                                    <div>
                                      <p style={{fontSize:12,fontWeight:600,color:"#1C1612"}}>{fmtShort(t.nextDate)}</p>
                                      <p style={{fontSize:10,color:"#9A8A78",marginTop:1}}>{t.frequencyLabel}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                )}

                {/* Treatments */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingLeft:4}}>
                  <p style={{fontSize:10,fontWeight:600,color:"#9A8A78",letterSpacing:2,textTransform:"uppercase"}}>My treatments</p>
                  <button onClick={()=>setShowAdd(true)} style={{background:"none",border:"none",fontSize:12,fontWeight:600,color:"#B4915F",cursor:"pointer",fontFamily:"inherit"}}>+ Add new</button>
                </div>

                {treatments.length===0&&(
                  <div className="card" style={{padding:"52px 24px",textAlign:"center"}}>
                    <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#B4915F,#D4B080)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 8px 24px rgba(180,145,95,0.24)"}}>
                      <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,color:"#FAF7F2",fontStyle:"italic",fontWeight:300}}>b</span>
                    </div>
                    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,color:"#9A8A78",fontStyle:"italic",marginBottom:8}}>Your becoming starts here.</p>
                    <p style={{fontSize:13,color:"#C4B8A8",marginBottom:28}}>Add your first treatment to begin</p>
                    <button className="btn btn-c" style={{width:"auto",padding:"14px 32px"}} onClick={()=>setShowAdd(true)}>Add Treatment</button>
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {treatments.map((t,i)=>{
                    const p=PALETTE[t.palette%PALETTE.length];
                    const used=t.sessions.length;
                    const rem=t.totalSessions-used;
                    const expDays=daysUntil(t.expiryDate);
                    const isExpired=expDays!==null&&expDays<0;
                    const next=getNext(t);
                    const sortedS=[...t.sessions].sort((a,b)=>new Date(a.date)-new Date(b.date));
                    return(
                      <div key={t.id} className={`tcard pop p${Math.min(i+3,5)}`} style={{padding:"22px 20px"}} onClick={()=>goToDetail(t.id)}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                          <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1}}>
                            <div style={{width:44,height:44,borderRadius:13,background:p.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20,color:p.accent}}>
                              {TREATMENT_ICONS[t.name]||"✧"}
                            </div>
                            <div style={{flex:1}}>
                              <p style={{fontSize:15,fontWeight:600,marginBottom:2}}>{t.name}</p>
                              <p style={{fontSize:12,color:"#9A8A78"}}>{t.clinic}</p>
                              {t.brandUnit&&<p style={{fontSize:11,color:"#B4915F",fontWeight:500,marginTop:2}}>{t.brandUnit}</p>}{t.notes&&<p style={{fontSize:11,color:"#C4B8A8",fontStyle:"italic",marginTop:2}}>{t.notes}</p>}
                            </div>
                          </div>
                          <div style={{textAlign:"right",marginLeft:12,display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
                            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:40,fontWeight:400,color:p.accent,lineHeight:1}}>{rem}</p>
                            <p style={{fontSize:9,color:"#C4B8A8",fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>left</p>
                            {isExpired
                              ? <span style={{fontSize:11,fontWeight:700,color:"#C05858",background:"#FAEAEA",padding:"3px 10px",borderRadius:20}}>Expired</span>
                              : t.expiryDate
                                ? <span style={{fontSize:11,color:"#9A8A78"}}>Exp {fmtShort(t.expiryDate)}</span>
                                : null
                            }
                          </div>
                        </div>
                        <div style={{height:1,background:`linear-gradient(90deg,transparent,${p.accent}20,transparent)`,marginBottom:16}}/>
                        <div style={{marginBottom:16}}>
                          <p style={{fontSize:10,fontWeight:600,color:"#9A8A78",letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>Sessions — tap to view or log</p>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                            {Array.from({length:t.totalSessions}).map((_,idx)=>{
                              const sess=sortedS[idx];
                              const isDone=idx<used;
                              const isNext=idx===used;
                              return(
                                <button key={idx} onClick={e=>{e.stopPropagation();openDot(t.id,idx,sess);}}
                                  style={{width:isDone?34:isNext?28:22,height:isDone?34:isNext?28:22,borderRadius:"50%",
                                    border:isDone?"none":isNext?`2px dashed ${p.accent}`:`1.5px dashed ${p.accent}30`,
                                    background:isDone?`linear-gradient(135deg,${p.soft},${p.accent})`:isNext?`${p.accent}0D`:"transparent",
                                    cursor:isDone||isNext?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",
                                    boxShadow:isDone?`0 3px 10px ${p.accent}35`:"none",transition:"all 0.18s",padding:0,flexShrink:0}}>
                                  {isDone&&sess&&sess.photo
                                    ? <img src={sess.photo} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}} alt=""/>
                                    : isDone
                                      ? <span style={{fontSize:11,color:"#FFF",fontWeight:700}}>{idx+1}</span>
                                      : isNext
                                        ? <span style={{fontSize:13,color:p.accent,lineHeight:1}}>+</span>
                                        : <span style={{fontSize:9,color:`${p.accent}40`,fontWeight:600}}>{idx+1}</span>
                                  }
                                </button>
                              );
                            })}
                            <span style={{fontSize:11,color:"#9A8A78",marginLeft:4,fontWeight:500}}>{used}/{t.totalSessions}</span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {next&&rem>0&&daysUntil(next)>=0&&<span className="pill pill-ok">Next {fmtShort(next)}</span>}
                          {next&&rem>0&&daysUntil(next)<0&&<span className="pill pill-late">Late · {Math.abs(daysUntil(next))}d overdue</span>}
                          {expDays!==null&&expDays>=0&&expDays<=30&&<span className="pill pill-warn">Exp in {expDays}d</span>}
                          {rem===0&&<span className="pill pill-done">Complete</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {treatments.length>0&&(
                  <button className="btn btn-c" style={{marginTop:20,marginBottom:4}} onClick={()=>setShowAdd(true)}>+ Add New Treatment</button>
                )}
              </div>
            </div>
          )}

          {/* DETAIL */}
          {view==="detail"&&sel&&(
            <div style={{paddingBottom:60}}>
              <div style={{background:`linear-gradient(160deg,${pal.bg},#FAF7F2)`,padding:"52px 24px 28px",borderRadius:"0 0 32px 32px",borderBottom:"1px solid rgba(180,145,95,0.1)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                  <button className="back" onClick={()=>setView("home")}>← Back</button>
                  <button onClick={()=>openEdit(sel)}
                    style={{background:"#F5EFE6",border:"1px solid rgba(180,145,95,0.2)",borderRadius:50,padding:"8px 18px",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:"#B4915F",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#EDE5D8"}
                    onMouseLeave={e=>e.currentTarget.style.background="#F5EFE6"}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B4915F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                </div>
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:54,height:54,borderRadius:16,background:pal.bg,border:`1px solid ${pal.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:24,color:pal.accent}}>
                    {TREATMENT_ICONS[sel.name]||"✧"}
                  </div>
                  <div>
                    <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:400,lineHeight:1.1}}>{sel.name}</h2>
                    <p style={{fontSize:13,color:"#9A8A78",marginTop:4}}>{sel.clinic}</p>
                    {sel.brandUnit&&<p style={{fontSize:12,color:"#B4915F",fontWeight:500,marginTop:2}}>{sel.brandUnit}</p>}{sel.notes&&<p style={{fontSize:12,color:"#C4B8A8",fontStyle:"italic",marginTop:2}}>{sel.notes}</p>}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:24}}>
                  {[{label:"Done",val:sel.sessions.length},{label:"Left",val:sel.totalSessions-sel.sessions.length},{label:"Total",val:sel.totalSessions}].map(s=>(
                    <div key={s.label} className="card" style={{padding:"14px 10px",textAlign:"center"}}>
                      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:400,color:pal.accent,lineHeight:1}}>{s.val}</p>
                      <p style={{fontSize:10,color:"#9A8A78",fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",marginTop:4}}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{padding:"20px"}}>
                <div className="tabs" style={{marginBottom:20}}>
                  <button className={`t ${detailTab==="sessions"?"on":""}`} onClick={()=>setDetailTab("sessions")}>Session Timeline</button>
                  <button className={`t ${detailTab==="aftercare"?"on":""}`} onClick={()=>setDetailTab("aftercare")}>Aftercare Guide</button>
                </div>

                {detailTab==="sessions"&&(
                  <div>
                    {getNext(sel)&&sel.sessions.length<sel.totalSessions&&(()=>{
                      const nextDays=daysUntil(getNext(sel));
                      const isLate=nextDays!==null&&nextDays<0;
                      return(
                        <div style={{background:isLate?"#F9EEF5":pal.bg,borderRadius:20,padding:"20px",border:isLate?"1px solid rgba(160,64,122,0.2)":`1px solid ${pal.accent}18`,marginBottom:16}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <p style={{fontSize:10,fontWeight:600,color:isLate?"#A0407A":pal.text,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>{isLate?"Session overdue":"Time to become"}</p>
                              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:400}}>{fmtDate(getNext(sel))}</p>
                              <p style={{fontSize:12,color:"#9A8A78",marginTop:4}}>{isLate?`${Math.abs(nextDays)} days overdue · ${sel.frequencyLabel.toLowerCase()}`:`In ${nextDays} days · ${sel.frequencyLabel.toLowerCase()}`}</p>
                            </div>
                            <div style={{width:52,height:52,borderRadius:"50%",background:"#FFF",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:isLate?"0 4px 16px rgba(160,64,122,0.15)":"0 4px 16px rgba(180,145,95,0.15)",flexShrink:0}}>
                              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:400,color:isLate?"#A0407A":pal.accent,lineHeight:1}}>{isLate?Math.abs(nextDays):nextDays}</p>
                              <p style={{fontSize:8,color:"#9A8A78",letterSpacing:1,textTransform:"uppercase"}}>{isLate?"late":"days"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                      <div className="card" style={{padding:"16px"}}>
                        <span className="lbl">Frequency</span>
                        <p style={{fontSize:14,fontWeight:600}}>{sel.frequencyLabel}</p>
                      </div>
                      <div className="card" style={{padding:"16px"}}>
                        <span className="lbl">Expires</span>
                        <p style={{fontSize:14,fontWeight:600}}>{fmtDate(sel.expiryDate)}</p>
                        {sel.expiryDate&&(()=>{
                          const d=daysUntil(sel.expiryDate);
                          if(d<0)return <span className="pill pill-danger" style={{marginTop:6,display:"inline-flex"}}>Expired</span>;
                          if(d<=30)return <span className="pill pill-warn" style={{marginTop:6,display:"inline-flex"}}>{d}d left</span>;
                          return <span className="pill pill-c" style={{marginTop:6,display:"inline-flex"}}>{d} days</span>;
                        })()}
                      </div>
                    </div>

                    <div className="card" style={{padding:"22px",marginBottom:16}}>
                      <p style={{fontSize:14,fontWeight:600,marginBottom:4}}>Session Timeline</p>
                      <p style={{fontSize:12,color:"#9A8A78",marginBottom:20}}>Tap a completed dot to view details, tap + to log next session</p>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-start"}}>
                        {Array.from({length:sel.totalSessions}).map((_,i)=>{
                          const ss=sortedSessions[i];
                          const isDone=i<sel.sessions.length;
                          const isNext=i===sel.sessions.length;
                          return(
                            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                              <button
                                onClick={()=>{
                                  if(ss){setSessionIdx(i);setView("session");}
                                  else{setLogTargetIdx(i);setLogForm({date:new Date().toISOString().split("T")[0],note:"",photo:null});setShowLog(true);}
                                }}
                                style={{width:isDone?48:isNext?40:32,height:isDone?48:isNext?40:32,borderRadius:"50%",
                                  border:isDone?"none":isNext?`2px dashed ${pal.accent}`:`1.5px dashed ${pal.accent}25`,
                                  background:isDone?`linear-gradient(135deg,${pal.soft},${pal.accent})`:isNext?`${pal.accent}0D`:"transparent",
                                  cursor:isDone||isNext?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",
                                  boxShadow:isDone?`0 4px 14px ${pal.accent}35`:"none",transition:"all 0.2s",padding:0,flexShrink:0}}>
                                {isDone&&ss&&ss.photo
                                  ? <img src={ss.photo} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}} alt=""/>
                                  : isDone
                                    ? <span style={{fontSize:14,color:"#FFF",fontWeight:700}}>{i+1}</span>
                                    : isNext
                                      ? <span style={{fontSize:16,color:pal.accent}}>+</span>
                                      : <span style={{fontSize:11,color:`${pal.accent}35`,fontWeight:600}}>{i+1}</span>
                                }
                              </button>
                              <p style={{fontSize:9,color:isDone?"#9A8A78":"#C4B8A8",textAlign:"center",maxWidth:48,lineHeight:1.3}}>
                                {isDone&&ss&&ss.date?fmtShort(ss.date):isNext?"next":""}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {sel.sessions.length<sel.totalSessions&&(
                      <button className="btn" style={{background:pal.accent,color:"#FFF",boxShadow:`0 8px 24px ${pal.accent}30`,marginBottom:16,fontWeight:600}}
                        onClick={()=>{setLogTargetIdx(sel.sessions.length);setLogForm({date:new Date().toISOString().split("T")[0],note:"",photo:null});setShowLog(true);}}>
                        + Log Session {sel.sessions.length+1}
                      </button>
                    )}
                  </div>
                )}

                {detailTab==="aftercare"&&ac&&(
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{background:pal.bg,borderRadius:20,padding:"20px",border:`1px solid ${pal.accent}15`}}>
                      <p style={{fontSize:10,fontWeight:600,color:pal.text,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Good to know</p>
                      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:300,lineHeight:1.7,fontStyle:"italic"}}>"{ac.tip}"</p>
                    </div>
                    <div className="card" style={{padding:"20px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:"#EAF5EE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:12,color:"#4A9A6A",fontWeight:700}}>✓</span>
                        </div>
                        <p style={{fontSize:14,fontWeight:600,color:"#4A9A6A"}}>Do these after treatment</p>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {ac.dos.map((d,i)=>(
                          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                            <div style={{width:5,height:5,borderRadius:"50%",background:"#4A9A6A",flexShrink:0,marginTop:7}}/>
                            <p style={{fontSize:13,color:"#4A3C30",lineHeight:1.65}}>{d}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card" style={{padding:"20px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:"#FAEAEA",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:12,color:"#C05858",fontWeight:700}}>✕</span>
                        </div>
                        <p style={{fontSize:14,fontWeight:600,color:"#C05858"}}>Avoid these after treatment</p>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {ac.donts.map((d,i)=>(
                          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                            <div style={{width:5,height:5,borderRadius:"50%",background:"#C05858",flexShrink:0,marginTop:7}}/>
                            <p style={{fontSize:13,color:"#4A3C30",lineHeight:1.65}}>{d}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{textAlign:"center",marginTop:36}}>
                  <button onClick={()=>deleteTreatment(sel.id)} style={{background:"none",border:"none",color:"#C4B8A8",fontSize:12,fontFamily:"inherit",cursor:"pointer",fontWeight:500}}>
                    Remove this treatment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SESSION */}
          {view==="session"&&sel&&selSession&&(
            <div style={{paddingBottom:60}}>
              <div style={{background:`linear-gradient(160deg,${pal.bg},#FAF7F2)`,padding:"52px 24px 28px",borderRadius:"0 0 32px 32px",borderBottom:"1px solid rgba(180,145,95,0.1)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                  <button className="back" onClick={()=>{setView("detail");setDetailTab("sessions");}}>← Back</button>
                  <button onClick={()=>openEditSession(selSession)}
                    style={{background:"#F5EFE6",border:"1px solid rgba(180,145,95,0.2)",borderRadius:50,padding:"8px 18px",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:"#B4915F",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#EDE5D8"}
                    onMouseLeave={e=>e.currentTarget.style.background="#F5EFE6"}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B4915F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${pal.soft},${pal.accent})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 14px ${pal.accent}30`,flexShrink:0}}>
                    <span style={{fontSize:17,color:"#FFF",fontWeight:700}}>{sessionIdx+1}</span>
                  </div>
                  <div>
                    <p style={{fontSize:12,color:"#9A8A78"}}>{sel.name} · {sel.clinic}</p>
                    <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:400}}>Session {sessionIdx+1}</h2>
                    <p style={{fontSize:13,color:pal.text,fontWeight:600,marginTop:2}}>{fmtDate(selSession.date)}</p>
                  </div>
                </div>
              </div>
              <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:14}}>
                <div className="card" style={{padding:"20px"}}>
                  <p style={{fontSize:13,fontWeight:600,marginBottom:4}}>Treatment Photo</p>
                  <p style={{fontSize:12,color:"#9A8A78",marginBottom:16}}>Document your results or any reactions</p>
                  {selSession.photo?(
                    <div style={{position:"relative"}}>
                      <img src={selSession.photo} alt="" style={{width:"100%",borderRadius:16,objectFit:"cover",maxHeight:260}}/>
                      <button onClick={()=>editPhotoRef.current&&editPhotoRef.current.click()}
                        style={{position:"absolute",bottom:12,right:12,background:"rgba(28,22,18,0.65)",border:"none",borderRadius:20,padding:"7px 16px",color:"#FAF7F2",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                        Change photo
                      </button>
                      <input ref={editPhotoRef} type="file" accept="image/*" style={{display:"none"}}
                        onChange={e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>updatePhoto(ev.target.result);r.readAsDataURL(f);}}/>
                    </div>
                  ):(
                    <button onClick={()=>editPhotoRef.current&&editPhotoRef.current.click()}
                      style={{width:"100%",border:`2px dashed ${pal.accent}30`,borderRadius:16,padding:"36px 20px",background:pal.bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                      <div style={{width:42,height:42,borderRadius:"50%",background:`${pal.accent}12`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontSize:18,color:pal.accent}}>◎</span>
                      </div>
                      <p style={{fontSize:14,fontWeight:600,color:pal.text,fontFamily:"'DM Sans',sans-serif"}}>Add a photo</p>
                      <p style={{fontSize:12,color:"#9A8A78",fontFamily:"'DM Sans',sans-serif"}}>Capture your results or any reactions</p>
                      <input ref={editPhotoRef} type="file" accept="image/*" style={{display:"none"}}
                        onChange={e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>updatePhoto(ev.target.result);r.readAsDataURL(f);}}/>
                    </button>
                  )}
                </div>
                {selSession.note&&(
                  <div className="card" style={{padding:"20px"}}>
                    <p style={{fontSize:13,fontWeight:600,marginBottom:10}}>Session Notes</p>
                    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:300,color:"#4A3C30",lineHeight:1.7,fontStyle:"italic"}}>"{selSession.note}"</p>
                  </div>
                )}
                {ac&&(
                  <div style={{background:pal.bg,borderRadius:20,padding:"18px 20px",border:`1px solid ${pal.accent}15`}}>
                    <p style={{fontSize:10,fontWeight:600,color:pal.text,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Aftercare reminder</p>
                    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:300,lineHeight:1.65,fontStyle:"italic",marginBottom:14}}>"{ac.tip}"</p>
                    <button onClick={()=>{setView("detail");setDetailTab("aftercare");}}
                      style={{background:pal.accent,border:"none",borderRadius:50,padding:"10px 22px",color:"#FFF",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 14px ${pal.accent}25`}}>
                      View Full Aftercare Guide →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ADD MODAL */}
          {showAdd&&(
            <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false);}}>
              <div className="msheet">
                <div className="mhandle"/>
                <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:400,marginBottom:4}}>New Treatment</h2>
                <p style={{fontSize:13,color:"#9A8A78",marginBottom:24}}>Add a package from any clinic</p>
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <div><span className="lbl">Treatment type</span>
                    <select className="inp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}>
                      {TREATMENT_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {form.name==="Other"&&<div><span className="lbl">Treatment name</span><input className="inp" placeholder="e.g. Sculptra" value={form.customName} onChange={e=>setForm({...form,customName:e.target.value})}/></div>}
                  <div><span className="lbl">Clinic / Provider</span><input className="inp" placeholder="e.g. Glow Clinic Bangkok" value={form.clinic} onChange={e=>setForm({...form,clinic:e.target.value})}/></div>
                  <div><span className="lbl">Brand, Unit or cc (optional)</span><input className="inp" placeholder="e.g. Botox 20 units · Juvederm 1cc" value={form.brandUnit} onChange={e=>setForm({...form,brandUnit:e.target.value})}/></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div><span className="lbl">Total sessions</span><input className="inp" type="number" min="1" placeholder="e.g. 6" value={form.totalSessions} onChange={e=>setForm({...form,totalSessions:e.target.value})}/></div>
                    <div><span className="lbl">Expiry date</span><input className="inp" type="date" value={form.expiryDate} onChange={e=>setForm({...form,expiryDate:e.target.value})}/></div>
                  </div>
                  <div><span className="lbl">How often do you go?</span>
                    <select className="inp" value={form.frequencyLabel} onChange={e=>{const f=FREQUENCIES.find(x=>x.label===e.target.value);setForm({...form,frequencyLabel:e.target.value,frequency:f?f.days:30});}}>
                      {FREQUENCIES.map(f=><option key={f.label}>{f.label}</option>)}
                    </select>
                  </div>
                  {form.frequencyLabel==="Custom"&&<div><span className="lbl">Every how many days?</span><input className="inp" type="number" placeholder="e.g. 45" value={form.customDays} onChange={e=>setForm({...form,customDays:e.target.value})}/></div>}
                  <div><span className="lbl">Notes (optional)</span><textarea className="inp" rows={2} placeholder="Area treated, units, add-ons..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
                  <button className="btn btn-c" style={{marginTop:4}} onClick={addTreatment} disabled={!form.totalSessions||!form.clinic}>Add to My Diary</button>
                </div>
              </div>
            </div>
          )}

          {/* LOG MODAL */}
          {showLog&&sel&&(
            <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setShowLog(false);}}>
              <div className="msheet">
                <div className="mhandle"/>
                <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:400,marginBottom:4}}>Log Session {(logTargetIdx!==null?logTargetIdx:sel.sessions.length)+1}</h2>
                <p style={{fontSize:13,color:"#9A8A78",marginBottom:24}}>{sel.name} · {sel.clinic}</p>
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <div><span className="lbl">Date of appointment</span><input className="inp" type="date" value={logForm.date} onChange={e=>setLogForm({...logForm,date:e.target.value})}/></div>
                  <div>
                    <span className="lbl">Add a photo (optional)</span>
                    {logForm.photo?(
                      <div style={{position:"relative"}}>
                        <img src={logForm.photo} alt="" style={{width:"100%",borderRadius:14,objectFit:"cover",maxHeight:180}}/>
                        <button onClick={()=>setLogForm(f=>({...f,photo:null}))}
                          style={{position:"absolute",top:10,right:10,background:"rgba(28,22,18,0.6)",border:"none",borderRadius:"50%",width:28,height:28,color:"#FAF7F2",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                      </div>
                    ):(
                      <button onClick={()=>fileRef.current&&fileRef.current.click()}
                        style={{width:"100%",border:`2px dashed ${pal.accent}28`,borderRadius:14,padding:"22px 20px",background:pal.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
                        <span style={{fontSize:18,color:pal.accent}}>◎</span>
                        <p style={{fontSize:13,fontWeight:600,color:pal.text,fontFamily:"'DM Sans',sans-serif"}}>Upload photo</p>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
                      onChange={e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setLogForm(lf=>({...lf,photo:ev.target.result}));r.readAsDataURL(f);}}/>
                  </div>
                  <div><span className="lbl">How did it go?</span><textarea className="inp" rows={3} placeholder="Results, any reactions, how you feel..." value={logForm.note} onChange={e=>setLogForm({...logForm,note:e.target.value})}/></div>
                  <button className="btn" style={{background:pal.accent,color:"#FFF",boxShadow:`0 8px 24px ${pal.accent}28`,marginTop:4,fontWeight:600}} onClick={logSession}>Save Session</button>
                </div>
              </div>
            </div>
          )}

          {/* LANGUAGE */}
          {showLangPicker&&(
            <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setShowLangPicker(false);}}>
              <div className="msheet">
                <div className="mhandle"/>
                <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:400,marginBottom:24}}>Language</h2>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {LANGUAGES.map(l=>(
                    <button key={l} onClick={()=>{setLanguage(l);setShowLangPicker(false);}}
                      style={{background:language===l?"rgba(180,145,95,0.08)":"transparent",border:"none",borderRadius:14,padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'DM Sans',sans-serif"}}>
                      <span style={{fontSize:14,color:"#1C1612",fontWeight:language===l?600:400}}>{l}</span>
                      {language===l&&<span style={{color:"#B4915F",fontSize:16}}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CURRENCY */}
          {showCurrPicker&&(
            <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setShowCurrPicker(false);}}>
              <div className="msheet">
                <div className="mhandle"/>
                <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:400,marginBottom:24}}>Currency</h2>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {CURRENCIES.map(c=>(
                    <button key={c} onClick={()=>{setCurrency(c);setShowCurrPicker(false);}}
                      style={{background:currency===c?"rgba(180,145,95,0.08)":"transparent",border:"none",borderRadius:14,padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'DM Sans',sans-serif"}}>
                      <span style={{fontSize:14,color:"#1C1612",fontWeight:currency===c?600:400}}>{c}</span>
                      {currency===c&&<span style={{color:"#B4915F",fontSize:16}}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}



          {/* EDIT SESSION */}
          {showEditSession&&editSessionForm&&selSession&&(
            <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setShowEditSession(false);}}>
              <div className="msheet">
                <div className="mhandle"/>
                <div style={{marginBottom:24}}>
                  <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:400}}>Edit Session {sessionIdx+1}</h2>
                  <p style={{fontSize:13,color:"#9A8A78",marginTop:2}}>{sel&&sel.name} · {sel&&sel.clinic}</p>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <div>
                    <span className="lbl">Date of appointment</span>
                    <input className="inp" type="date" value={editSessionForm.date} onChange={e=>setEditSessionForm({...editSessionForm,date:e.target.value})}/>
                  </div>
                  <div>
                    <span className="lbl">Session notes</span>
                    <textarea className="inp" rows={4} placeholder="Results, reactions, how you felt..." value={editSessionForm.note} onChange={e=>setEditSessionForm({...editSessionForm,note:e.target.value})}/>
                  </div>
                  <button className="btn btn-c" style={{marginTop:4}} onClick={saveEditSession} disabled={!editSessionForm.date}>
                    Save Changes
                  </button>
                  <button onClick={()=>setShowEditSession(false)}
                    style={{background:"none",border:"none",color:"#9A8A78",fontSize:13,fontFamily:"inherit",cursor:"pointer",fontWeight:500,padding:"4px 0"}}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* EDIT TREATMENT */}
          {showEdit&&editForm&&sel&&(
            <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setShowEdit(false);}}>
              <div className="msheet">
                <div className="mhandle"/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
                  <div>
                    <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:400}}>Edit Treatment</h2>
                    <p style={{fontSize:13,color:"#9A8A78",marginTop:2}}>Update your package details</p>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <div><span className="lbl">Treatment type</span>
                    <select className="inp" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}>
                      {TREATMENT_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><span className="lbl">Clinic / Provider</span>
                    <input className="inp" placeholder="e.g. Glow Clinic Bangkok" value={editForm.clinic} onChange={e=>setEditForm({...editForm,clinic:e.target.value})}/>
                  </div>
                  <div><span className="lbl">Brand, Unit or cc (optional)</span>
                    <input className="inp" placeholder="e.g. Botox 20 units · Juvederm 1cc" value={editForm.brandUnit} onChange={e=>setEditForm({...editForm,brandUnit:e.target.value})}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div><span className="lbl">Total sessions</span>
                      <input className="inp" type="number" min="1" placeholder="e.g. 6" value={editForm.totalSessions} onChange={e=>setEditForm({...editForm,totalSessions:e.target.value})}/>
                    </div>
                    <div><span className="lbl">Expiry date</span>
                      <input className="inp" type="date" value={editForm.expiryDate} onChange={e=>setEditForm({...editForm,expiryDate:e.target.value})}/>
                    </div>
                  </div>
                  <div><span className="lbl">How often do you go?</span>
                    <select className="inp" value={editForm.frequencyLabel} onChange={e=>{const f=FREQUENCIES.find(x=>x.label===e.target.value);setEditForm({...editForm,frequencyLabel:e.target.value,frequency:f?f.days:30});}}>
                      {FREQUENCIES.map(f=><option key={f.label}>{f.label}</option>)}
                    </select>
                  </div>
                  {editForm.frequencyLabel==="Custom"&&(
                    <div><span className="lbl">Every how many days?</span>
                      <input className="inp" type="number" placeholder="e.g. 45" value={editForm.customDays} onChange={e=>setEditForm({...editForm,customDays:e.target.value})}/>
                    </div>
                  )}
                  <div><span className="lbl">Notes (optional)</span>
                    <textarea className="inp" rows={2} placeholder="Area treated, units, add-ons..." value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})}/>
                  </div>
                  <button className="btn btn-c" style={{marginTop:4}} onClick={saveEdit} disabled={!editForm.totalSessions||!editForm.clinic}>
                    Save Changes
                  </button>
                  <button onClick={()=>setShowEdit(false)}
                    style={{background:"none",border:"none",color:"#9A8A78",fontSize:13,fontFamily:"inherit",cursor:"pointer",fontWeight:500,padding:"4px 0"}}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* EDIT PROFILE */}
          {showEditProfile&&(
            <div className="mbg" onClick={e=>{if(e.target===e.currentTarget)setShowEditProfile(false);}}>
              <div className="msheet">
                <div className="mhandle"/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
                  <div>
                    <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:400}}>Edit Profile</h2>
                    <p style={{fontSize:13,color:"#9A8A78",marginTop:2}}>Update your account details</p>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  {/* Avatar in modal */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:4}}>
                    <div style={{position:"relative"}} onClick={()=>profilePhotoRef.current&&profilePhotoRef.current.click()}>
                      <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#B4915F,#D4B080)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",cursor:"pointer",boxShadow:"0 4px 16px rgba(180,145,95,0.3)"}}>
                        {profilePhoto
                          ?<img src={profilePhoto} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="Profile"/>
                          :<span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:400,color:"#FAF7F2"}}>{profileForm.name[0]||"S"}</span>
                        }
                      </div>
                      <div style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:"50%",background:"#B4915F",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #FAF7F2",cursor:"pointer"}}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    </div>
                    <p style={{fontSize:11,color:"#B4915F",fontWeight:500,cursor:"pointer"}} onClick={()=>profilePhotoRef.current&&profilePhotoRef.current.click()}>Change photo</p>
                  </div>
                  <div><span className="lbl">Full name</span>
                    <input className="inp" placeholder="Your name" value={profileForm.name} onChange={e=>setProfileForm({...profileForm,name:e.target.value})}/>
                  </div>
                  <div><span className="lbl">Email address</span>
                    <input className="inp" type="email" placeholder="your@email.com" value={profileForm.email} onChange={e=>setProfileForm({...profileForm,email:e.target.value})}/>
                  </div>
                  <div><span className="lbl">Phone number</span>
                    <input className="inp" type="tel" placeholder="+66 89 123 4567" value={profileForm.phone} onChange={e=>setProfileForm({...profileForm,phone:e.target.value})}/>
                  </div>
                  <button className="btn btn-c" style={{marginTop:4}} onClick={()=>setShowEditProfile(false)} disabled={!profileForm.name||!profileForm.email}>
                    Save Changes
                  </button>
                  <button onClick={()=>setShowEditProfile(false)}
                    style={{background:"none",border:"none",color:"#9A8A78",fontSize:13,fontFamily:"inherit",cursor:"pointer",fontWeight:500,padding:"4px 0"}}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* NAV */}
          {view==="home"&&(
            <nav className="nav">
              <button className={`nbtn ${appTab==="home"?"on":""}`} onClick={()=>{setAppTab("home");setView("home");}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={appTab==="home"?"#B4915F":"none"} stroke={appTab==="home"?"#B4915F":"#C4B8A8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22" fill="none"/>
                </svg>
                <span style={{fontSize:10,fontWeight:600,color:appTab==="home"?"#B4915F":"#C4B8A8"}}>Home</span>
              </button>
              <button onClick={()=>setShowAdd(true)}
                style={{width:50,height:50,borderRadius:"50%",background:"linear-gradient(135deg,#B4915F,#D4B080)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 24px rgba(180,145,95,0.35)"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FAF7F2" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <button className={`nbtn ${appTab==="profile"?"on":""}`} onClick={()=>{setAppTab("profile");setView("home");}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={appTab==="profile"?"#B4915F":"#C4B8A8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span style={{fontSize:10,fontWeight:600,color:appTab==="profile"?"#B4915F":"#C4B8A8"}}>Profile</span>
              </button>
            </nav>
          )}

        </div>
      )}

    </div>
  );
}
