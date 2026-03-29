"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  onSnapshot, query, orderBy, writeBatch,
} from "firebase/firestore";

type QuestionType = "SHORT" | "PARAGRAPH" | "MCQ" | "CHECKBOX" | "DROPDOWN" | "EMAIL" | "PHONE" | "DATE";
interface FormQuestion { id: string; type: QuestionType; label: string; required: boolean; options?: string[]; }
interface FormSchema { id?: string; title: string; description: string; eventId: string; questions: FormQuestion[]; createdAt?: any; }
interface Registration { id?: string; formId: string; eventId: string; eventTitle?: string; userEmail: string; userName?: string; responses: Record<string, any>; attendanceStatus: "REGISTERED" | "PRESENT" | "ABSENT"; certificateIssued?: boolean; submittedAt: string; }

const NAME_KEYWORDS = ["name","fullname","full_name","yourname","participant","studentname","attendee","naam"];
const extractName = (reg: Registration): string => {
  if (reg.userName?.trim()) return reg.userName.trim();
  const r = reg.responses || {};
  const km = Object.entries(r).find(([k]) => NAME_KEYWORDS.some(kw => k.toLowerCase().replace(/[\s_\-]/g,"").includes(kw)));
  if (km && typeof km[1]==="string" && km[1].trim()) return km[1].trim();
  const nl = Object.values(r).find(v => typeof v==="string" && v.trim().length>=2 && v.trim().length<=60 && !v.includes("@") && !v.startsWith("http") && !/^\d+$/.test(v.trim()));
  if (nl) return (nl as string).trim();
  return reg.userEmail?.split("@")[0] || "Participant";
};

const CERT_FONTS = [
  { name:"Playfair Display", cat:"Elegant" }, { name:"Cormorant Garamond", cat:"Elegant" },
  { name:"EB Garamond", cat:"Elegant" },      { name:"Libre Baskerville", cat:"Elegant" },
  { name:"Merriweather", cat:"Elegant" },     { name:"Lora", cat:"Elegant" },
  { name:"Crimson Text", cat:"Elegant" },     { name:"Spectral", cat:"Elegant" },
  { name:"Great Vibes", cat:"Script" },       { name:"Pacifico", cat:"Script" },
  { name:"Dancing Script", cat:"Script" },    { name:"Satisfy", cat:"Script" },
  { name:"Sacramento", cat:"Script" },        { name:"Parisienne", cat:"Script" },
  { name:"Alex Brush", cat:"Script" },        { name:"Pinyon Script", cat:"Script" },
  { name:"Montserrat", cat:"Modern" },        { name:"Raleway", cat:"Modern" },
  { name:"Cinzel", cat:"Modern" },            { name:"Josefin Sans", cat:"Modern" },
  { name:"Quicksand", cat:"Modern" },         { name:"Exo 2", cat:"Modern" },
  { name:"Nunito", cat:"Modern" },            { name:"Poppins", cat:"Modern" },
  { name:"Abril Fatface", cat:"Display" },    { name:"Bebas Neue", cat:"Display" },
  { name:"Righteous", cat:"Display" },        { name:"Alfa Slab One", cat:"Display" },
];
const FONT_CATS = ["All","Elegant","Script","Modern","Display"];

function loadGoogleFont(name: string) {
  const id = `gfont-${name.replace(/\s+/g,"-")}`;
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id; l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
  document.head.appendChild(l);
}

const cyberStyles = `
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter:invert(72%) sepia(95%) saturate(1000%) hue-rotate(155deg) brightness(100%) contrast(105%)!important;
    cursor:pointer!important;opacity:1!important;
  }
  .custom-scrollbar::-webkit-scrollbar{width:4px}
  .custom-scrollbar::-webkit-scrollbar-thumb{background:#00d2ff33;border-radius:10px}
  .font-grid::-webkit-scrollbar{width:4px}
  .font-grid::-webkit-scrollbar-thumb{background:#ffb86c33;border-radius:10px}
  input,select,textarea,button,a{cursor:pointer!important}
  input[type="text"],input[type="number"],input[type="email"],input[type="tel"],textarea{cursor:text!important}
  @keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeSlideIn 0.25s ease forwards}
  .cert-canvas{position:relative;width:100%;cursor:crosshair;user-select:none;border-radius:12px;overflow:hidden}
  .cert-canvas img{width:100%;display:block;pointer-events:none}
  .name-handle{position:absolute;transform:translate(-50%,-50%);cursor:grab;z-index:10;white-space:nowrap;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;text-shadow:0 1px 6px rgba(0,0,0,0.8);padding:4px 8px;border:1px dashed rgba(255,184,108,0.6);border-radius:4px}
  .name-handle:active{cursor:grabbing}
  .guide-h{position:absolute;left:0;right:0;height:1px;background:rgba(255,184,108,0.4);pointer-events:none}
  .guide-v{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,184,108,0.4);pointer-events:none}

  /* KEY FIX: prevent horizontal overflow everywhere */
  *{box-sizing:border-box;}
  html,body{overflow-x:hidden;max-width:100vw;}
  input,select,textarea{max-width:100%;min-width:0;}

  /* date/time inputs on mobile — prevent intrinsic width blowout */
  input[type="date"],input[type="time"]{
    width:100%;
    min-width:0;
    max-width:100%;
  }

  /* modal scroll lock body when open */
  body.modal-open{overflow:hidden;}
`;

/* Base input class — min-w-0 is CRITICAL to prevent flex/grid overflow */
const ai = "bg-black/60 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-[#00d2ff] w-full min-w-0 transition-all text-white font-mono block";

const uid = () => Math.random().toString(36).slice(2,9);
const uploadToCloudinary = async (f: File) => {
  const fd = new FormData(); fd.append("file",f); fd.append("upload_preset","ml_default");
  const r = await fetch(`https://api.cloudinary.com/v1_1/dbzezvhhq/image/upload`,{method:"POST",body:fd});
  return (await r.json()).secure_url;
};
const Q_TYPES: {value:QuestionType;label:string;icon:string}[] = [
  {value:"SHORT",label:"Short Answer",icon:"—"},{value:"PARAGRAPH",label:"Paragraph",icon:"¶"},
  {value:"EMAIL",label:"Email",icon:"@"},{value:"PHONE",label:"Phone",icon:"#"},
  {value:"DATE",label:"Date",icon:"📅"},{value:"MCQ",label:"Multiple Choice",icon:"◉"},
  {value:"CHECKBOX",label:"Checkboxes",icon:"☑"},{value:"DROPDOWN",label:"Dropdown",icon:"▾"},
];

// ════════════════════════════════════════════════════════
// CERT PLACEMENT PICKER
// ════════════════════════════════════════════════════════
interface CPProps {
  previewUrl:string; nameX:number; nameY:number; fontSize:number;
  fontColor:string; fontFamily:string;
  onChangeX:(v:number)=>void; onChangeY:(v:number)=>void;
  onChangeFontSize:(v:number)=>void; onChangeColor:(v:string)=>void;
  onChangeFont:(v:string)=>void;
}
function CertPlacementPicker({previewUrl,nameX,nameY,fontSize,fontColor,fontFamily,onChangeX,onChangeY,onChangeFontSize,onChangeColor,onChangeFont}:CPProps){
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [showGuides,setShowGuides] = useState(false);
  const [fontCat,setFontCat] = useState("All");
  const [fontSearch,setFontSearch] = useState("");
  const PRESET_COLORS = ["#ffffff","#1a1a1a","#c9a84c","#2c3e6e","#8b0000","#00d2ff"];

  useEffect(()=>{ CERT_FONTS.forEach(f=>loadGoogleFont(f.name)); },[]);

  const filtered = CERT_FONTS.filter(f=>(fontCat==="All"||f.cat===fontCat)&&f.name.toLowerCase().includes(fontSearch.toLowerCase()));

  const posFromEvent = useCallback((e:MouseEvent|TouchEvent)=>{
    if(!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x:Math.round(Math.max(0,Math.min(100,((cx-rect.left)/rect.width)*100))),
      y:Math.round(Math.max(0,Math.min(100,((cy-rect.top)/rect.height)*100))),
    };
  },[]);

  const handleClick = (e:React.MouseEvent<HTMLDivElement>)=>{
    if(dragging.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    onChangeX(Math.round(Math.max(0,Math.min(100,((e.clientX-rect.left)/rect.width)*100))));
    onChangeY(Math.round(Math.max(0,Math.min(100,((e.clientY-rect.top)/rect.height)*100))));
  };

  useEffect(()=>{
    const mv=(e:MouseEvent|TouchEvent)=>{ if(!dragging.current) return; const p=posFromEvent(e); if(p){onChangeX(p.x);onChangeY(p.y);} };
    const up=()=>{ dragging.current=false; setShowGuides(false); };
    window.addEventListener("mousemove",mv);
    window.addEventListener("touchmove",mv as any,{passive:true});
    window.addEventListener("mouseup",up);
    window.addEventListener("touchend",up);
    return ()=>{ window.removeEventListener("mousemove",mv); window.removeEventListener("touchmove",mv as any); window.removeEventListener("mouseup",up); window.removeEventListener("touchend",up); };
  },[posFromEvent,onChangeX,onChangeY]);

  const sf = Math.max(9,fontSize*0.18);
  return (
    <div className="space-y-4">
      <p className="text-[9px] text-[#ffb86c] uppercase font-bold tracking-widest">Name Placement — drag the label or click anywhere</p>

      <div ref={canvasRef} className="cert-canvas border border-[#ffb86c]/30" onClick={handleClick}>
        <img src={previewUrl} alt="cert" draggable={false}/>
        {showGuides&&<><div className="guide-h" style={{top:`${nameY}%`}}/><div className="guide-v" style={{left:`${nameX}%`}}/></>}
        <div className="name-handle" style={{left:`${nameX}%`,top:`${nameY}%`,fontSize:`${sf}px`,color:fontColor,fontFamily:`'${fontFamily}',serif`}}
          onMouseDown={e=>{e.stopPropagation();dragging.current=true;setShowGuides(true);}}
          onTouchStart={e=>{e.stopPropagation();dragging.current=true;setShowGuides(true);}}>
          PARTICIPANT NAME
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[{label:"X Position",val:nameX,fn:onChangeX},{label:"Y Position",val:nameY,fn:onChangeY},{label:"Font Size",val:fontSize,fn:onChangeFontSize,min:12,max:120}].map(({label,val,fn,min=0,max=100})=>(
          <div key={label}>
            <div className="flex justify-between mb-1">
              <label className="text-[8px] text-gray-500 uppercase">{label}</label>
              <span className="text-[8px] text-[#ffb86c] font-bold">{val}{label==="Font Size"?"px":"%"}</span>
            </div>
            <input type="range" min={min} max={max} step={1} value={val} onChange={e=>fn(+e.target.value)} className="w-full accent-[#ffb86c]"/>
          </div>
        ))}
      </div>

      <div>
        <label className="text-[8px] text-gray-500 uppercase block mb-2">Font Color</label>
        <div className="flex gap-2 flex-wrap items-center">
          {PRESET_COLORS.map(c=>(
            <div key={c} onClick={()=>onChangeColor(c)} style={{background:c,border:fontColor===c?"2px solid #ffb86c":"1px solid rgba(255,255,255,0.2)"}} className="w-7 h-7 rounded-lg cursor-pointer transition-all shrink-0"/>
          ))}
          <input type="color" value={fontColor} onChange={e=>onChangeColor(e.target.value)} className="w-7 h-7 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0" title="Custom"/>
          <span className="text-[9px] text-gray-500 font-mono ml-1">{fontColor}</span>
        </div>
      </div>

      <div>
        <label className="text-[8px] text-gray-500 uppercase block mb-2">
          Font Family — <span className="text-[#ffb86c]" style={{fontFamily:`'${fontFamily}',serif`}}>{fontFamily}</span>
        </label>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input type="text" placeholder="Search fonts..." value={fontSearch} onChange={e=>setFontSearch(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-[#ffb86c] flex-1 font-mono min-w-0 w-full sm:w-auto"/>
          <div className="flex gap-1 flex-wrap">
            {FONT_CATS.map(cat=>(
              <button key={cat} onClick={()=>setFontCat(cat)}
                className={`text-[8px] font-black uppercase px-2 py-1.5 rounded-lg transition-all whitespace-nowrap ${fontCat===cat?"bg-[#ffb86c] text-black":"bg-white/5 text-gray-400 border border-white/10 hover:border-[#ffb86c]/40 hover:text-white"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="font-grid grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {filtered.map(font=>(
            <button key={font.name} onClick={()=>onChangeFont(font.name)}
              className={`text-left px-3 py-3 rounded-xl border transition-all ${fontFamily===font.name?"bg-[#ffb86c]/15 border-[#ffb86c]/60":"bg-white/5 border-white/5 hover:border-white/20"}`}>
              <p style={{fontFamily:`'${font.name}',serif`,fontSize:"16px",color:fontColor==="05060a"?"#fff":fontColor,lineHeight:1.2}} className="truncate">
                Participant
              </p>
              <p className="text-[8px] text-gray-600 uppercase tracking-widest mt-1 font-mono truncate">
                {font.name}{fontFamily===font.name&&<span className="text-[#ffb86c] ml-1">✓</span>}
              </p>
            </button>
          ))}
          {filtered.length===0&&<p className="col-span-2 text-center text-[10px] text-gray-600 py-6 uppercase tracking-widest">No fonts match</p>}
        </div>
      </div>

      <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-mono text-[10px] text-[#ffb86c] grid grid-cols-2 md:grid-cols-5 gap-3">
        <div><span className="text-gray-600 block text-[8px]">nameX</span>{nameX}%</div>
        <div><span className="text-gray-600 block text-[8px]">nameY</span>{nameY}%</div>
        <div><span className="text-gray-600 block text-[8px]">fontSize</span>{fontSize}px</div>
        <div><span className="text-gray-600 block text-[8px]">fontColor</span>{fontColor}</div>
        <div className="col-span-2 md:col-span-1"><span className="text-gray-600 block text-[8px]">fontFamily</span><span className="truncate block">{fontFamily}</span></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════
export default function AdminDashboard(){
  const {data:session} = useSession();
  const [activeModal,setActiveModal] = useState<"EVENT"|"MEMBER"|"FORM_BUILDER"|"CERT_DESIGN"|null>(null);
  const [loading,setLoading] = useState(false);
  const [events,setEvents] = useState<any[]>([]);
  const [teamMembers,setTeamMembers] = useState<any[]>([]);
  const [forms,setForms] = useState<FormSchema[]>([]);
  const [registrations,setRegistrations] = useState<Registration[]>([]);
  const [file,setFile] = useState<File|null>(null);
  const [previewUrl,setPreviewUrl] = useState<string|null>(null);
  const [avatarError,setAvatarError] = useState(false);
  const [adminDropdownOpen,setAdminDropdownOpen] = useState(false);
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const [editingId,setEditingId] = useState<string|null>(null);
  const [newEvent,setNewEvent] = useState({title:"",date:"",startTime:"",endDate:"",endTime:"",venue:"",category:"Workshop",description:""});
  const [selectedRegIds,setSelectedRegIds] = useState<Set<string>>(new Set());
  const [newMember,setNewMember] = useState({name:"",role:"",section:"Student",linkedin:"",hierarchy:1,collegeId:""});
  const [formSchema,setFormSchema] = useState<FormSchema>({title:"",description:"",eventId:"",questions:[]});
  const [editingFormId,setEditingFormId] = useState<string|null>(null);
  const [formError,setFormError] = useState<string|null>(null);
 const [certDesign, setCertDesign] = useState({ eventId: "", templateUrl: "", nameX: 50, nameY: 50, fontSize: 48, fontColor: "#ffffff", fontFamily: "monospace" });
  const [certFile,setCertFile] = useState<File|null>(null);
  const [certPreview,setCertPreview] = useState<string|null>(null);
  const [attendanceEventId,setAttendanceEventId] = useState("");

  // Lock body scroll when modal is open
  useEffect(()=>{
    if(activeModal){
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return ()=>document.body.classList.remove("modal-open");
  },[activeModal]);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(adminDropdownRef.current&&!adminDropdownRef.current.contains(e.target as Node)) setAdminDropdownOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    const unE=onSnapshot(query(collection(db,"events"),orderBy("timestamp","desc")),s=>setEvents(s.docs.map(d=>({id:d.id,...d.data()}))));
    const unT=onSnapshot(query(collection(db,"team"),orderBy("hierarchy","asc")),s=>setTeamMembers(s.docs.map(d=>({id:d.id,...d.data()}))));
    const unF=onSnapshot(collection(db,"forms"),s=>{
      const docs=s.docs.map(d=>({id:d.id,...d.data()} as FormSchema));
      docs.sort((a:any,b:any)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      setForms(docs);
    });
    const unR=onSnapshot(query(collection(db,"registrations"),orderBy("submittedAt","desc")),s=>setRegistrations(s.docs.map(d=>({id:d.id,...d.data()} as Registration))));
    return ()=>{unE();unT();unF();unR();};
  },[]);

  const emailPrefix = session?.user?.email?.split("@")[0]||"ADMIN";
  const avatarSrc = (!avatarError&&session?.user?.image)?session.user.image:`https://ui-avatars.com/api/?name=${encodeURIComponent(emailPrefix)}&background=0f111a&color=00d2ff&bold=true&size=64`;

  const handleAdminLogout = async()=>{
    if(confirm("TERMINATE_ADMIN_SESSION?")){
      await firebaseSignOut(auth);
      await nextAuthSignOut({redirect:false});
      window.location.href="/?bye=1";
    }
  };

  const handleEventDeploy = async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!file&&!editingId) return alert("MISSING_POSTER");
    setLoading(true);
    try{
      let posterUrl=previewUrl;
      if(file) posterUrl=await uploadToCloudinary(file);
      const act=`${newEvent.date}T${newEvent.startTime||"00:00"}`;
      const cpa=newEvent.endDate?`${newEvent.endDate}T${newEvent.endTime||"23:59"}`:act;
      if(editingId) await updateDoc(doc(db,"events",editingId),{...newEvent,countdownTarget:act,certPublishAt:cpa,posterUrl,category:newEvent.category.toLowerCase()});
      else await addDoc(collection(db,"events"),{...newEvent,countdownTarget:act,certPublishAt:cpa,posterUrl,category:newEvent.category.toLowerCase(),timestamp:serverTimestamp()});
      closeModal();
    }catch(err){alert("DEPLOY_FAILED: "+err);}
    setLoading(false);
  };

  const handleMemberDeploy = async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!file&&!editingId) return alert("MISSING_PHOTO");
    setLoading(true);
    try{
      let photoUrl=previewUrl;
      if(file) photoUrl=await uploadToCloudinary(file);
      if(editingId) await updateDoc(doc(db,"team",editingId),{...newMember,image:photoUrl});
      else await addDoc(collection(db,"team"),{...newMember,image:photoUrl,timestamp:serverTimestamp()});
      closeModal();
    }catch(err){alert("RECRUIT_FAILED: "+err);}
    setLoading(false);
  };

  const addQ=(type:QuestionType)=>setFormSchema(f=>({...f,questions:[...f.questions,{id:uid(),type,label:"",required:false,options:["MCQ","CHECKBOX","DROPDOWN"].includes(type)?["Option 1"]:undefined}]}));
  const updQ=(id:string,p:Partial<FormQuestion>)=>setFormSchema(f=>({...f,questions:f.questions.map(q=>q.id===id?{...q,...p}:q)}));
  const delQ=(id:string)=>setFormSchema(f=>({...f,questions:f.questions.filter(q=>q.id!==id)}));
  const addOpt=(qId:string)=>setFormSchema(f=>({...f,questions:f.questions.map(q=>q.id===qId?{...q,options:[...(q.options||[]),`Option ${(q.options?.length||0)+1}`]}:q)}));
  const updOpt=(qId:string,i:number,v:string)=>setFormSchema(f=>({...f,questions:f.questions.map(q=>q.id===qId?{...q,options:q.options?.map((o,j)=>j===i?v:o)}:q)}));
  const delOpt=(qId:string,i:number)=>setFormSchema(f=>({...f,questions:f.questions.map(q=>q.id===qId?{...q,options:q.options?.filter((_,j)=>j!==i)}:q)}));

  const handleFormSave = async()=>{
    setFormError(null);
    if(!formSchema.title.trim()){setFormError("Form title is required.");return;}
    if(!formSchema.eventId){setFormError("You must link this form to an event.");return;}
    if(formSchema.questions.length===0){setFormError("Add at least one question.");return;}
    if(formSchema.questions.find(q=>!q.label.trim())){setFormError("All questions must have a label.");return;}
    setLoading(true);
    try{
      const payload={
        title:formSchema.title.trim(),description:formSchema.description.trim(),eventId:formSchema.eventId,
        questions:formSchema.questions.map(q=>({id:q.id,type:q.type,label:q.label.trim(),required:q.required,...(q.options?{options:q.options}:{})})),
        createdAt:serverTimestamp(),
      };
      if(editingFormId) await updateDoc(doc(db,"forms",editingFormId),payload);
      else await addDoc(collection(db,"forms"),payload);
      closeModal();
    }catch(err:any){setFormError("Save failed: "+(err?.message||"Unknown error."));}
    setLoading(false);
  };

  const handleCertDesignSave = async()=>{
    if(!certDesign.eventId) return alert("SELECT_EVENT");
    setLoading(true);
    try{
      let templateUrl=certDesign.templateUrl;
      if(certFile) templateUrl=await uploadToCloudinary(certFile);
      if(!templateUrl) return alert("UPLOAD_CERTIFICATE_TEMPLATE");
      const event=events.find(e=>e.id===certDesign.eventId);
      const eventRegs=registrations.filter(r=>r.eventId===certDesign.eventId&&r.attendanceStatus==="PRESENT");
      const batch=writeBatch(db);
      eventRegs.forEach(reg=>{
        const ref=doc(collection(db,"certificates"));
        batch.set(ref,{
          userEmail:reg.userEmail,userName:extractName(reg),
          eventId:certDesign.eventId,eventTitle:event?.title||"Event",
          templateUrl,nameX:certDesign.nameX,nameY:certDesign.nameY,
          fontSize:certDesign.fontSize,fontColor:certDesign.fontColor,
          fontFamily:certDesign.fontFamily,
          issueDate:new Date().toLocaleDateString(),
          certHash:Math.random().toString(36).substring(7).toUpperCase(),
          timestamp:serverTimestamp()
        });
        if(reg.id) batch.update(doc(db,"registrations",reg.id),{certificateIssued:true});
      });
      await batch.commit();
      alert(`CERTIFICATES_ISSUED: ${eventRegs.length} operatives`);
      closeModal();
    }catch(err){alert("CERT_ISSUE_FAILED: "+err);}
    setLoading(false);
  };

  const updateAttendance=async(id:string,s:"PRESENT"|"ABSENT"|"REGISTERED")=>updateDoc(doc(db,"registrations",id),{attendanceStatus:s});
  const toggleSel=(id:string)=>setSelectedRegIds(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const markAllPresent=async()=>{ if(!confirm(`MARK ALL ${filteredRegs.length} AS PRESENT?`)) return; const b=writeBatch(db); filteredRegs.forEach(r=>{if(r.id)b.update(doc(db,"registrations",r.id),{attendanceStatus:"PRESENT"});}); await b.commit(); };
  const bulkMark=async(s:"PRESENT"|"ABSENT"|"REGISTERED")=>{ if(!selectedRegIds.size) return; const b=writeBatch(db); selectedRegIds.forEach(id=>b.update(doc(db,"registrations",id),{attendanceStatus:s})); await b.commit(); setSelectedRegIds(new Set()); };
  const toggleSelAll=()=>{ if(selectedRegIds.size===filteredRegs.length) setSelectedRegIds(new Set()); else setSelectedRegIds(new Set(filteredRegs.map(r=>r.id!).filter(Boolean))); };
  const delReg=async(id:string)=>{ if(confirm("REMOVE_REGISTRATION?")) await deleteDoc(doc(db,"registrations",id)); };
  const filteredRegs=attendanceEventId?registrations.filter(r=>r.eventId===attendanceEventId):registrations;
  const openEditModal=(item:any,type:"EVENT"|"MEMBER")=>{
    setEditingId(item.id);setActiveModal(type);
    if(type==="EVENT"){setNewEvent({title:item.title,date:item.date,startTime:item.startTime||"",endDate:item.endDate||"",endTime:item.endTime||"",venue:item.venue,category:item.category,description:item.description});setPreviewUrl(item.posterUrl);}
    else{setNewMember({name:item.name,role:item.role,section:item.section,linkedin:item.linkedin,hierarchy:item.hierarchy,collegeId:item.collegeId||""});setPreviewUrl(item.image);}
  };
  const closeModal=()=>{
    setActiveModal(null);setFile(null);setPreviewUrl(null);setEditingId(null);
    setEditingFormId(null);setCertFile(null);setCertPreview(null);setFormError(null);
    setNewEvent({title:"",date:"",startTime:"",endDate:"",endTime:"",venue:"",category:"Workshop",description:""});
    setNewMember({name:"",role:"",section:"Student",linkedin:"",hierarchy:1,collegeId:""});
    setFormSchema({title:"",description:"",eventId:"",questions:[]});
    setCertDesign({eventId:"",templateUrl:"",nameX:50,nameY:45,fontSize:48,fontColor:"#ffffff",fontFamily:"Playfair Display"});
    setAttendanceEventId("");setSelectedRegIds(new Set());
  };
  const presentCount=filteredRegs.filter(r=>r.attendanceStatus==="PRESENT").length;
  const absentCount=filteredRegs.filter(r=>r.attendanceStatus==="ABSENT").length;

  return (
    <div style={{position:"relative",zIndex:10005,backgroundColor:"#05060a",minHeight:"100vh",pointerEvents:"auto",overflowX:"hidden",width:"100%"}}>
      <style>{cyberStyles}</style>

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 w-full h-14 bg-[#0f111a] border-b border-[#2a2e3f] flex items-center justify-between px-4 md:px-6 z-[10006]">
        <div className="flex items-center gap-2 min-w-0">
          <Image src="/CFC.png" alt="CFC" width={26} height={26} className="shrink-0"/>
          <div style={{color:"#fff",fontWeight:900,fontSize:"13px",letterSpacing:"0.5px"}} className="truncate">
            <span className="hidden sm:inline">CODE_FOR_CAUSE </span><span className="sm:hidden">CFC </span>
            <span style={{color:"#00d2ff",opacity:0.6}}>$root</span>
          </div>
        </div>
        <div ref={adminDropdownRef} style={{position:"relative"}} className="shrink-0">
          <button onClick={()=>setAdminDropdownOpen(o=>!o)} className="flex items-center gap-2 bg-black/50 pr-3 p-1 rounded-full border border-white/10 hover:border-[#00d2ff]/40 transition-all">
            <img src={avatarSrc} alt="Admin" referrerPolicy="no-referrer" onError={()=>setAvatarError(true)} className="w-7 h-7 rounded-full border border-[#00d2ff] object-cover shrink-0"/>
            <span className="hidden sm:inline text-[10px] text-gray-400 font-bold uppercase tracking-widest">{emailPrefix}</span>
            <span className="text-[#00d2ff] text-[10px]">{adminDropdownOpen?"▴":"▾"}</span>
          </button>
          {adminDropdownOpen&&(
            <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,backgroundColor:"#0f111a",border:"1px solid rgba(0,210,255,0.2)",borderRadius:"12px",minWidth:"180px",boxShadow:"0 16px 40px rgba(0,0,0,0.8)",overflow:"hidden",zIndex:20010}}>
              <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                <p style={{fontSize:"11px",fontWeight:900,color:"#fff",margin:0,textTransform:"uppercase"}}>{emailPrefix}</p>
                <p style={{fontSize:"9px",color:"#ffb86c",margin:"2px 0 0",textTransform:"uppercase"}}>SUPER_ADMIN</p>
              </div>
              <Link href="/" onClick={()=>setAdminDropdownOpen(false)} style={{textDecoration:"none"}}><div style={ddi("#00d2ff")}><span>🏠</span><span>Home</span></div></Link>
              <Link href="/dashboard" onClick={()=>setAdminDropdownOpen(false)} style={{textDecoration:"none"}}><div style={ddi("#50fa7b")}><span>⌘</span><span>Dashboard</span></div></Link>
              <div style={{height:"1px",backgroundColor:"rgba(255,255,255,0.06)",margin:"4px 0"}}/>
              <button onClick={()=>{setAdminDropdownOpen(false);handleAdminLogout();}} style={{width:"100%",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}><div style={ddi("#ff5555")}><span>⏻</span><span>Root Exit</span></div></button>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="min-h-screen pt-20 md:pt-24 px-4 md:px-8 font-mono text-white selection:bg-[#50fa7b] selection:text-black" style={{overflowX:"hidden",width:"100%"}}>
        <div className="max-w-7xl mx-auto w-full">

          {/* Title */}
          <div className="mb-8 md:mb-10 border-l-4 border-[#50fa7b] pl-4">
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">Command <span className="text-[#50fa7b]">Center</span></h1>
            <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-widest truncate">{session?.user?.email||"ID: SUPER_ADMIN"}</p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-16">
            <AC label="Deploy Event" sub="Mission Registry" color="#00d2ff" onClick={()=>setActiveModal("EVENT")}/>
            <AC label="Recruit Member" sub="Personnel Registry" color="#50fa7b" onClick={()=>setActiveModal("MEMBER")}/>
            <AC label="Form Builder" sub="Registration Forms" color="#bd93f9" onClick={()=>{setFormError(null);setActiveModal("FORM_BUILDER");}}/>
            <AC label="Cert Designer" sub="Certificate Distribution" color="#ffb86c" onClick={()=>setActiveModal("CERT_DESIGN")}/>
          </div>

          {/* ATTENDANCE */}
          <div className="mb-10">
            <div className="bg-[#0a0c10] border border-[#bd93f9]/20 rounded-2xl md:rounded-3xl p-4 md:p-6 font-mono overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-2 text-[#bd93f9]">
                  <span className="w-2 h-2 rounded-full animate-pulse bg-[#bd93f9] shrink-0"/>Attendance_Registry
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] text-[#50fa7b] uppercase font-bold">{presentCount} PRESENT</span>
                  <span className="text-[9px] text-[#ff5555] uppercase font-bold">{absentCount} ABSENT</span>
                  <select className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none min-w-0 max-w-[160px] truncate" value={attendanceEventId} onChange={e=>{setAttendanceEventId(e.target.value);setSelectedRegIds(new Set());}}>
                    <option value="">ALL_EVENTS</option>
                    {events.map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                  <button onClick={markAllPresent} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg bg-[#50fa7b]/10 border border-[#50fa7b]/30 text-[#50fa7b] hover:bg-[#50fa7b] hover:text-black transition-all whitespace-nowrap">✓ ALL PRESENT</button>
                </div>
              </div>

              {selectedRegIds.size>0&&(
                <div className="flex flex-wrap items-center gap-2 mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 fade-in">
                  <span className="text-[9px] text-[#bd93f9] font-black uppercase mr-2">{selectedRegIds.size} SELECTED</span>
                  {(["PRESENT","ABSENT","REGISTERED"] as const).map(s=>(
                    <button key={s} onClick={()=>bulkMark(s)} className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${s==="PRESENT"?"bg-[#50fa7b]/20 text-[#50fa7b] hover:bg-[#50fa7b] hover:text-black":s==="ABSENT"?"bg-[#ff5555]/20 text-[#ff5555] hover:bg-[#ff5555] hover:text-black":"bg-white/10 text-white hover:bg-white/20"}`}>→ {s}</button>
                  ))}
                  <button onClick={()=>setSelectedRegIds(new Set())} className="ml-auto text-[8px] text-gray-500 hover:text-white uppercase font-bold">Clear</button>
                </div>
              )}

              {filteredRegs.length===0?(
                <div className="text-center py-10 text-gray-600 text-[10px] uppercase tracking-widest">NO_REGISTRATIONS_FOUND</div>
              ):(
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <div onClick={toggleSelAll} className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${selectedRegIds.size===filteredRegs.length&&filteredRegs.length>0?"bg-[#bd93f9] border-[#bd93f9]":"border-white/20 hover:border-[#bd93f9]"}`}>
                      {selectedRegIds.size===filteredRegs.length&&filteredRegs.length>0&&<span className="text-black text-[8px] font-black">✓</span>}
                    </div>
                    <span className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Select All</span>
                  </div>
                  {filteredRegs.map(reg=>{
                    const ev=events.find(e=>e.id===reg.eventId);
                    const name=extractName(reg);
                    const isSel=reg.id?selectedRegIds.has(reg.id):false;
                    return (
                      <div key={reg.id} className={`grid gap-2 items-center p-3 rounded-xl border transition-all fade-in ${isSel?"bg-[#bd93f9]/10 border-[#bd93f9]/30":"bg-white/5 border-white/5 hover:border-white/15"}`}
                        style={{gridTemplateColumns:"auto 1fr auto",gridTemplateRows:"auto"}}>
                        {/* checkbox */}
                        <div onClick={()=>reg.id&&toggleSel(reg.id)} className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${isSel?"bg-[#bd93f9] border-[#bd93f9]":"border-white/20 hover:border-[#bd93f9]"}`}>{isSel&&<span className="text-black text-[8px] font-black">✓</span>}</div>
                        {/* name + email */}
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase text-white truncate">{name}</p>
                          <p className="text-[9px] text-gray-500 truncate">{reg.userEmail}</p>
                          {/* event title — visible on mobile too */}
                          <p className="text-[9px] text-[#bd93f9] truncate uppercase mt-0.5 md:hidden">{ev?.title||reg.eventId}</p>
                        </div>
                        {/* del btn */}
                        <button onClick={()=>reg.id&&delReg(reg.id)} className="text-[#ff5555] text-[10px] font-bold uppercase opacity-30 hover:opacity-100 transition-opacity shrink-0">Del</button>

                        {/* event title desktop */}
                        <div className="hidden md:block col-start-2 min-w-0">
                          <p className="text-[9px] text-[#bd93f9] truncate uppercase">{ev?.title||reg.eventId}</p>
                        </div>

                        {/* attendance buttons — full width row below on mobile, inline on desktop */}
                        <div className="col-span-3 flex gap-1 mt-1">
                          {(["REGISTERED","PRESENT","ABSENT"] as const).map(s=>(
                            <button key={s} onClick={()=>reg.id&&updateAttendance(reg.id,s)}
                              className={`text-[8px] font-black uppercase px-2 py-1.5 rounded-lg transition-all flex-1 ${reg.attendanceStatus===s?s==="PRESENT"?"bg-[#50fa7b] text-black":s==="ABSENT"?"bg-[#ff5555] text-black":"bg-white/20 text-white":"bg-white/5 text-gray-500 hover:text-white"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* REGISTRY LISTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-12">
            <RL title="Mission_Registry" items={events} onEdit={(i:any)=>openEditModal(i,"EVENT")} onDel={(id:string)=>deleteDoc(doc(db,"events",id))} color="#00d2ff" type="event"/>
            <RL title="Personnel_Registry" items={teamMembers} onEdit={(i:any)=>openEditModal(i,"MEMBER")} onDel={(id:string)=>deleteDoc(doc(db,"team",id))} color="#50fa7b" type="member"/>
            <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 font-mono">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4 md:mb-6 flex items-center gap-2 text-[#bd93f9]">
                <span className="w-2 h-2 rounded-full animate-pulse bg-[#bd93f9] shrink-0"/>Form_Registry
              </h3>
              <div className="space-y-3 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                {forms.length===0&&<p className="text-[10px] text-gray-600 uppercase tracking-widest text-center py-6">No forms yet</p>}
                {forms.map(form=>{
                  const ev=events.find(e=>e.id===form.eventId);
                  return (
                    <div key={form.id} className="flex justify-between items-center bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 group hover:border-white/20 transition-all gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider truncate text-white">{form.title}</h4>
                        <p className="text-[9px] text-[#bd93f9] uppercase truncate">{ev?.title||"⚠ Event not found"}</p>
                        <p className="text-[8px] text-gray-500">{form.questions.length} questions</p>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <button onClick={()=>{setEditingFormId(form.id||null);setFormSchema({title:form.title,description:form.description,eventId:form.eventId,questions:form.questions});setFormError(null);setActiveModal("FORM_BUILDER");}} className="text-[#bd93f9] text-[10px] font-bold uppercase opacity-50 hover:opacity-100 transition-opacity">Edit</button>
                        <button onClick={()=>confirm("DELETE_FORM?")&&form.id&&deleteDoc(doc(db,"forms",form.id))} className="text-[#ff5555] text-[10px] font-bold uppercase opacity-30 hover:opacity-100 transition-opacity">Del</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            FORM BUILDER MODAL
        ══════════════════════════════════════════════ */}
        {activeModal==="FORM_BUILDER"&&(
          <div className="fixed inset-0 z-[20000] flex items-start justify-center bg-black/95 backdrop-blur-md overflow-y-auto overflow-x-hidden p-4 md:p-6">
            <div className="bg-[#0B111A] border border-[#bd93f9]/40 w-full max-w-3xl rounded-2xl md:rounded-3xl p-5 md:p-10 shadow-2xl my-4 overflow-hidden">
              <div className="flex justify-between items-center mb-6 gap-2">
                <h2 className="font-black tracking-[0.2em] text-[10px] md:text-xs uppercase text-[#bd93f9] truncate">[ {editingFormId?"UPDATE_FORM":"INIT_FORM_BUILDER"} ]</h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg shrink-0">✕</button>
              </div>
              <div className="space-y-4">
                <input placeholder="FORM_TITLE *" value={formSchema.title} onChange={e=>setFormSchema(f=>({...f,title:e.target.value}))} className={ai}/>
                <input placeholder="Description (optional)" value={formSchema.description} onChange={e=>setFormSchema(f=>({...f,description:e.target.value}))} className={ai}/>
                <div>
                  <select required className={`${ai} ${formSchema.eventId?"border-[#bd93f9]/50":""}`} value={formSchema.eventId} onChange={e=>setFormSchema(f=>({...f,eventId:e.target.value}))}>
                    <option value="">LINK_TO_EVENT *</option>
                    {events.map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                  {formSchema.eventId&&<p className="text-[9px] text-[#bd93f9] mt-1 ml-1">✓ Linked to: {events.find(e=>e.id===formSchema.eventId)?.title}</p>}
                </div>
                <div className="h-px bg-white/5 my-2"/>
                <div className="space-y-3">
                  {formSchema.questions.map((q,qi)=>(
                    <div key={q.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 fade-in overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-[#bd93f9] font-black uppercase tracking-widest">Q{qi+1} · {q.type}</span>
                        <button onClick={()=>delQ(q.id)} className="text-[#ff5555] text-[10px] font-bold opacity-50 hover:opacity-100 shrink-0">✕ Remove</button>
                      </div>
                      {/* Question label + type + required — stack on mobile, row on md+ */}
                      <div className="flex flex-col md:flex-row gap-2">
                        <input placeholder="Question label *" value={q.label} onChange={e=>updQ(q.id,{label:e.target.value})} className={`${ai} flex-1`}/>
                        <select value={q.type} onChange={e=>updQ(q.id,{type:e.target.value as QuestionType})} className="bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none focus:border-[#bd93f9] font-mono min-w-0 w-full md:w-auto">
                          {Q_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap self-center">
                          <div onClick={()=>updQ(q.id,{required:!q.required})} className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${q.required?"bg-[#bd93f9]":"bg-white/10"}`}>
                            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${q.required?"left-[18px]":"left-1"}`}/>
                          </div>
                          <span className="text-[9px] text-gray-400 uppercase font-bold">Required</span>
                        </label>
                      </div>
                      {(q.type==="MCQ"||q.type==="CHECKBOX"||q.type==="DROPDOWN")&&(
                        <div className="space-y-2 pl-2">
                          {q.options?.map((opt,oi)=>(
                            <div key={oi} className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-600 w-4 shrink-0">{q.type==="MCQ"?"○":q.type==="CHECKBOX"?"☐":`${oi+1}.`}</span>
                              <input value={opt} onChange={e=>updOpt(q.id,oi,e.target.value)} className="bg-transparent border-b border-white/10 focus:border-[#bd93f9] outline-none text-[10px] text-white py-1 flex-1 font-mono min-w-0" placeholder={`Option ${oi+1}`}/>
                              <button onClick={()=>delOpt(q.id,oi)} className="text-[#ff5555] text-[10px] opacity-40 hover:opacity-100 shrink-0">✕</button>
                            </div>
                          ))}
                          <button onClick={()=>addOpt(q.id)} className="text-[9px] text-[#bd93f9] uppercase font-bold mt-1 hover:underline">+ Add Option</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border border-dashed border-white/10 rounded-2xl p-4">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-3">Add Question</p>
                  <div className="flex flex-wrap gap-2">
                    {Q_TYPES.map(t=>(
                      <button key={t.value} onClick={()=>addQ(t.value)} className="flex items-center gap-1.5 bg-white/5 hover:bg-[#bd93f9]/20 border border-white/10 hover:border-[#bd93f9]/40 text-[9px] text-gray-300 uppercase font-bold px-3 py-2 rounded-xl transition-all">
                        <span>{t.icon}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {formError&&<div className="bg-[#ff5555]/10 border border-[#ff5555]/30 rounded-xl px-4 py-3 text-[10px] text-[#ff5555] font-bold uppercase tracking-wider">⚠ {formError}</div>}
                <button onClick={handleFormSave} disabled={loading} className="w-full bg-[#bd93f9] text-black font-black p-4 rounded-2xl uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs shadow-lg shadow-[#bd93f9]/20">
                  {loading?"DEPLOYING_FORM...":(editingFormId?"UPDATE_FORM →":"DEPLOY_FORM →")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            CERT DESIGN MODAL
        ══════════════════════════════════════════════ */}
        {activeModal==="CERT_DESIGN"&&(
          <div className="fixed inset-0 z-[20000] flex items-start justify-center bg-black/95 backdrop-blur-md overflow-y-auto overflow-x-hidden p-4 md:p-6">
            <div className="bg-[#0B111A] border border-[#ffb86c]/40 w-full max-w-2xl rounded-2xl md:rounded-3xl p-5 md:p-10 shadow-2xl my-4 overflow-hidden">
              <div className="flex justify-between items-center mb-6 gap-2">
                <h2 className="font-black tracking-[0.2em] text-[10px] md:text-xs uppercase text-[#ffb86c] truncate">[ CERT_DESIGN_STUDIO ]</h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg shrink-0">✕</button>
              </div>
              <div className="space-y-4">
                <select required className={ai} value={certDesign.eventId} onChange={e=>setCertDesign(c=>({...c,eventId:e.target.value}))}>
                  <option value="">SELECT_TARGET_EVENT *</option>
                  {events.map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
                {certDesign.eventId&&(
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] text-gray-500 uppercase">Eligible (PRESENT):</p>
                    <p className="text-sm font-bold text-[#ffb86c]">{registrations.filter(r=>r.eventId===certDesign.eventId&&r.attendanceStatus==="PRESENT").length} operatives</p>
                  </div>
                )}
                <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[100px] transition-all hover:border-[#ffb86c]/30 group overflow-hidden">
                  {certPreview?<img src={certPreview} className="max-h-28 object-contain rounded-xl w-full" alt="cert"/>:(
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest group-hover:text-gray-300">Upload Certificate Template</p>
                      <p className="text-[8px] text-gray-600 mt-1">PNG / JPG</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>{const f=e.target.files?.[0];if(f){setCertFile(f);setCertPreview(URL.createObjectURL(f));}}}/>
                </div>

                {certPreview&&(
                  <CertPlacementPicker
                    previewUrl={certPreview}
                    nameX={certDesign.nameX} nameY={certDesign.nameY}
                    fontSize={certDesign.fontSize} fontColor={certDesign.fontColor}
                    fontFamily={certDesign.fontFamily}
                    onChangeX={v=>setCertDesign(c=>({...c,nameX:v}))}
                    onChangeY={v=>setCertDesign(c=>({...c,nameY:v}))}
                    onChangeFontSize={v=>setCertDesign(c=>({...c,fontSize:v}))}
                    onChangeColor={v=>setCertDesign(c=>({...c,fontColor:v}))}
                    onChangeFont={v=>setCertDesign(c=>({...c,fontFamily:v}))}
                  />
                )}

                <button onClick={handleCertDesignSave} disabled={loading} className="w-full bg-[#ffb86c] text-black font-black p-4 rounded-2xl uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs shadow-lg shadow-[#ffb86c]/20">
                  {loading?"ISSUING_CERTIFICATES...":"ISSUE_CERTIFICATES →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            EVENT & MEMBER MODALS
        ══════════════════════════════════════════════ */}
        {activeModal&&(activeModal==="EVENT"||activeModal==="MEMBER")&&(
          <div className="fixed inset-0 z-[20000] flex items-start justify-center bg-black/95 backdrop-blur-md overflow-y-auto overflow-x-hidden p-4 md:p-6">
            <div className={`bg-[#0B111A] border w-full max-w-2xl rounded-2xl md:rounded-3xl p-5 md:p-10 shadow-2xl my-4 overflow-hidden ${activeModal==="EVENT"?"border-[#00d2ff]/40":"border-[#50fa7b]/40"}`}>
              <div className="flex justify-between items-center mb-8 gap-2">
                <h2 className="font-black tracking-[0.2em] text-[10px] md:text-xs uppercase truncate" style={{color:activeModal==="EVENT"?"#00d2ff":"#50fa7b"}}>
                  [ {editingId?"UPDATE_REGISTRY":activeModal==="EVENT"?"INIT_DEPLOYMENT":"RECRUIT_MEMBER"} ]
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg shrink-0">✕</button>
              </div>

              <form onSubmit={activeModal==="EVENT"?handleEventDeploy:handleMemberDeploy} className="space-y-4">
                {/* Image upload */}
                <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-6 bg-black/40 flex flex-col items-center justify-center min-h-[140px] hover:border-white/20 group overflow-hidden">
                  {previewUrl
                    ?<img src={previewUrl} className={`w-full max-h-40 object-contain rounded-xl ${activeModal==="MEMBER"?"h-24 w-24 mx-auto rounded-full object-cover":""}`} alt="preview"/>
                    :<p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest group-hover:text-gray-300 underline underline-offset-4">Upload_Visual_Asset</p>
                  }
                  <input type="file" required={!editingId} accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){setFile(f);setPreviewUrl(URL.createObjectURL(f));}}} className="absolute inset-0 opacity-0 cursor-pointer"/>
                </div>

                {activeModal==="EVENT"&&(
                  <div className="space-y-3 font-mono">
                    <input required placeholder="TITLE" value={newEvent.title} className={ai} onChange={e=>setNewEvent({...newEvent,title:e.target.value})}/>
                    <input placeholder="CATEGORY" value={newEvent.category} className={ai} onChange={e=>setNewEvent({...newEvent,category:e.target.value})}/>

                    {/* START DATE + TIME — 2 cols on sm+, stack on xs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 min-w-0">
                        <label className="text-[9px] text-[#00d2ff] uppercase ml-2 font-bold tracking-widest block">Start Date</label>
                        <input type="date" required value={newEvent.date} className={ai} onChange={e=>setNewEvent({...newEvent,date:e.target.value})}/>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <label className="text-[9px] text-gray-500 uppercase ml-2 tracking-widest block">Start Time</label>
                        <input type="time" value={newEvent.startTime} className={ai} onChange={e=>setNewEvent({...newEvent,startTime:e.target.value})}/>
                      </div>
                    </div>

                    {/* END DATE + TIME */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 min-w-0">
                        <label className="text-[9px] text-[#ffb86c] uppercase ml-2 font-bold tracking-widest block">End Date</label>
                        <input type="date" value={newEvent.endDate} className={ai} onChange={e=>setNewEvent({...newEvent,endDate:e.target.value})}/>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <label className="text-[9px] text-gray-500 uppercase ml-2 tracking-widest block">End Time</label>
                        <input type="time" value={newEvent.endTime} className={ai} onChange={e=>setNewEvent({...newEvent,endTime:e.target.value})}/>
                      </div>
                    </div>

                    <div className="relative min-w-0">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00d2ff] text-[10px] font-black pointer-events-none z-10">LOC:</span>
                      <input required placeholder="VENUE_LOCATION" value={newEvent.venue} style={{paddingLeft:"52px"}} className={ai} onChange={e=>setNewEvent({...newEvent,venue:e.target.value})}/>
                    </div>
                    <textarea required rows={3} placeholder="MISSION_DESCRIPTION..." value={newEvent.description} className={`${ai} resize-none`} onChange={e=>setNewEvent({...newEvent,description:e.target.value})}/>
                  </div>
                )}

                {activeModal==="MEMBER"&&(
                  <div className="space-y-3 font-mono">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input required placeholder="FULL_NAME" value={newMember.name} className={`${ai} sm:col-span-2`} onChange={e=>setNewMember({...newMember,name:e.target.value})}/>
                      <input required placeholder="College ID" value={newMember.collegeId} className={ai} onChange={e=>setNewMember({...newMember,collegeId:e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input required placeholder="ROLE" value={newMember.role} className={ai} onChange={e=>setNewMember({...newMember,role:e.target.value})}/>
                      <select className={`${ai} font-bold`} value={newMember.section} onChange={e=>setNewMember({...newMember,section:e.target.value})}>
                        <option value="Student">Student</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Leadership">Leadership</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="number" placeholder="RANK" value={newMember.hierarchy} className={ai} onChange={e=>setNewMember({...newMember,hierarchy:parseInt(e.target.value)})}/>
                      <div className="relative sm:col-span-2 min-w-0">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#50fa7b] text-[10px] font-black tracking-widest pointer-events-none z-10">LI:</span>
                        <input required placeholder="LINKEDIN_URL" value={newMember.linkedin} style={{paddingLeft:"44px"}} className={ai} onChange={e=>setNewMember({...newMember,linkedin:e.target.value})}/>
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className={`w-full text-black font-black p-4 rounded-2xl uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs mt-4 shadow-lg ${activeModal==="EVENT"?"bg-[#00d2ff] shadow-[#00d2ff]/20":"bg-[#50fa7b] shadow-[#50fa7b]/20"}`}>
                  {loading?"COMMITTING...":(editingId?"EXECUTE_UPDATE →":"EXECUTE_DEPLOYMENT →")}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────
const ddi=(color:string):React.CSSProperties=>({display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",fontSize:"11px",fontWeight:700,fontFamily:"monospace",color,textTransform:"uppercase",letterSpacing:"0.08em",cursor:"pointer",transition:"background 0.15s",backgroundColor:"transparent"});

const AC=({label,sub,color,onClick}:{label:string;sub:string;color:string;onClick:()=>void})=>(
  <button onClick={onClick}
    className="p-4 md:p-8 bg-[#0B111A] rounded-2xl md:rounded-3xl text-left group transition-all hover:scale-[1.02] active:scale-[0.99] w-full overflow-hidden"
    style={{border:`1px solid ${color}30`}}
    onMouseEnter={e=>(e.currentTarget.style.borderColor=color)}
    onMouseLeave={e=>(e.currentTarget.style.borderColor=`${color}30`)}>
    <div className="text-base md:text-2xl font-bold uppercase group-hover:tracking-widest transition-all truncate" style={{color}}>{label}</div>
    <p className="text-gray-500 text-[9px] uppercase tracking-widest mt-1">{sub}</p>
  </button>
);

const RL=({title,items,onDel,onEdit,color,type}:any)=>(
  <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 font-mono overflow-hidden">
    <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4 md:mb-6 flex items-center gap-2" style={{color}}>
      <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{backgroundColor:color}}/>{title}
    </h3>
    <div className="space-y-3 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
      {items.map((item:any)=>(
        <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 group hover:border-white/20 transition-all gap-2 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <img src={type==="event"?item.posterUrl:item.image} className={`w-8 h-8 object-cover shrink-0 ${type==="member"?"rounded-full":"rounded-md"}`} alt=""/>
            <div className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider truncate">{type==="event"?item.title:item.name}</h4>
              <p className="text-[9px] text-gray-500 uppercase truncate">{type==="event"?item.category:(item.collegeId||item.section)}</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={()=>onEdit(item)} style={{color}} className="text-[10px] font-bold uppercase opacity-50 hover:opacity-100 transition-opacity">Edit</button>
            <button onClick={()=>confirm("TERMINATE_NODE?")&&onDel(item.id)} className="text-[#ff5555] text-[10px] font-bold uppercase opacity-30 hover:opacity-100 transition-opacity">Del</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);