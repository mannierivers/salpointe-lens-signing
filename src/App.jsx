import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, onSnapshot 
} from 'firebase/firestore';
import { 
  GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  Calendar, Clock, User, CheckCircle2, LogOut, Camera, 
  AlertTriangle, Users, Sparkles, ChevronDown, 
  Smartphone, ShieldCheck, Mail, Trash2, PlusCircle, SmartphoneIcon, CameraIcon, Info
} from 'lucide-react';

// --- CONFIGURATION ---
const ADMIN_EMAILS = ['26mpost@salpointe.org', 'erivers@salpointe.org'];
const CLASS_YEAR = "2026";
const PROJECT_LEAD = "Michaela Post '26";
const LEAD_PHONE = "(520) XXX-XXXX"; // <--- MICHAELA: PUT YOUR PHONE NUMBER HERE
const LEAD_TITLE = "Head Photographer";

const PRESET_EVENTS = [
  { name: "Varsity Boys Soccer v Rincon", date: "2026-01-16", time: "18:00" },
  { name: "Varsity Girls Basketball v Ironwood Ridge", date: "2026-01-16", time: "19:00" },
  { name: "Varsity Girls Basketball v Desert Vista", date: "2026-01-19", time: "19:00" },
  { name: "Varsity Girls Soccer v Poston Butte", date: "2026-01-20", time: "18:00" },
  { name: "Boys and Girls Wrestling - Diego Gadea", date: "2026-01-23", time: "09:00" },
  { name: "Varsity Boys Soccer v Brophy", date: "2026-01-23", time: "18:00" },
  { name: "Varsity Boys Soccer v Walden Grove", date: "2026-01-26", time: "18:00" },
  { name: "Varsity Boys Basketball v Walden Grove", date: "2026-01-26", time: "19:00" },
  { name: "Varsity Boys Soccer v Sahuaro", date: "2026-01-28", time: "18:00" },
  { name: "Varsity Girls Soccer v Nogales", date: "2026-01-30", time: "18:00" },
  { name: "Varsity Girls Basketball v Notre Dame", date: "2026-01-31", time: "17:00" },
  { name: "Varsity Girls Soccer v Mica Mountain", date: "2026-02-03", time: "18:00" },
  { name: "Varsity Boys Basketball v Ironwood Ridge", date: "2026-02-03", time: "19:00" },
  { name: "Varsity Girls Soccer v Ironwood Ridge", date: "2026-02-05", time: "18:00" },
  { name: "Varsity Boys Basketball v Tucson", date: "2026-02-05", time: "19:00" },
  { name: "Varsity Girls Basketball v Sahuaro", date: "2026-02-06", time: "19:00" },
  { name: "Varsity Girls Basketball v Walden Grove", date: "2026-02-10", time: "19:00" },
  { name: "Varsity Boys Basketball v Sahuaro", date: "2026-02-12", time: "19:00" },
  { name: "Hoopcoming Assembly", date: "2026-02-13", time: "13:30" },
];

const formatToStandardTime = (militaryTime) => {
  if (!militaryTime || typeof militaryTime !== 'string' || !militaryTime.includes(':')) return "TBD";
  const [hours, minutes] = militaryTime.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = ((h + 11) % 12 + 1);
  return `${displayHours}:${minutes} ${ampm}`;
};

const generateCalLink = (app, choiceNum) => {
  const event = choiceNum === 1 ? app.choice1Event : app.choice2Event;
  const date = choiceNum === 1 ? app.choice1Date : app.choice2Date;
  const time = choiceNum === 1 ? app.choice1Time : app.choice2Time;
  if (!date || !time) return "#";
  const startStr = `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
  const endHour = (parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0');
  const endStr = `${date.replace(/-/g, '')}T${endHour}${time.split(':')[1]}00`;
  const name = app.firstName ? `${app.firstName} ${app.lastName}` : (app.name || "Senior");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("[LENS] " + name)}&dates=${startStr}/${endStr}&location=${encodeURIComponent(event || "")}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('form'); 
  const [isMsgExpanded, setIsMsgExpanded] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', contact: '',
    choice1Event: '', choice1Date: '', choice1Time: '',
    choice2Event: '', choice2Date: '', choice2Time: ''
  });
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth).catch(() => setError("Login failed. Use Safari/Chrome."));
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (isMounted) {
        setUser(u);
        if (u) fetchUserRecord(u.uid);
        setLoading(false);
      }
    });
    const unsubSnap = onSnapshot(collection(db, "appointments"), (snap) => {
      if (isMounted) {
        const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setAppointments(data.sort((a, b) => new Date(a.choice1Date) - new Date(b.choice1Date)));
      }
    });
    return () => { isMounted = false; unsubAuth(); unsubSnap(); };
  }, []);

  const fetchUserRecord = async (uid) => {
    const docRef = doc(db, "appointments", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Handle legacy "name" field if firstName doesn't exist
      if (data.name && !data.firstName) {
        const parts = data.name.split(' ');
        data.firstName = parts[0];
        data.lastName = parts.slice(1).join(' ');
      }
      setFormData(prev => ({ ...prev, ...data }));
    }
  };

  const handlePresetSelect = (selection, choiceKey) => {
    if (selection === "Other" || selection === "") {
      setFormData(prev => ({ ...prev, [choiceKey + "Event"]: selection }));
    } else {
      const eventObj = PRESET_EVENTS.find(e => e.name === selection);
      if (eventObj) {
        setFormData(prev => ({
          ...prev,
          [choiceKey + "Event"]: eventObj.name,
          [choiceKey + "Date"]: eventObj.date,
          [choiceKey + "Time"]: eventObj.time
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setIsSaving(true);
    try {
      const q = query(collection(db, "appointments"), where("choice1Event", "==", formData.choice1Event), where("choice1Date", "==", formData.choice1Date));
      const snap = await getDocs(q);
      if (snap.docs.filter(d => d.id !== user.uid).length >= 6) {
        setError(`Choice #1 is full! (6 seniors max)`);
        setIsSaving(false); return;
      }
      await setDoc(doc(db, "appointments", user.uid), { ...formData, userId: user.uid, updatedAt: new Date().toISOString() });
      alert("📸 Spot Reserved!");
    } catch (err) { setError("Save failed."); } finally { setIsSaving(false); }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#800000]">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="text-[#FFCC00]"><Camera size={64} /></motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 overflow-x-hidden selection:bg-[#FFCC00] selection:text-[#800000]">
      
      {/* HERO */}
      <section className={`relative transition-all duration-1000 flex flex-col items-center justify-center px-4 ${user ? 'min-h-[35vh] md:min-h-[45vh]' : 'h-screen'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#800000]/60 to-transparent z-0" />
        <div className="relative z-30 flex flex-col items-center text-center max-w-4xl w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4">
             <img src="/sc-logo.png" alt="SC Logo" className="w-16 h-16 md:w-24 md:h-24 object-contain" />
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.85]">Sign The <br/><span className="text-[#FFCC00] not-italic font-bold">Lens.</span></h1>
          <div className="mt-4 bg-[#FFCC00] text-[#800000] px-4 py-1.5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border border-[#800000]/20">
            <CameraIcon size={12} /> {PROJECT_LEAD} | {LEAD_TITLE}
          </div>
          {!user && (
            <button onClick={() => signInWithRedirect(auth, new GoogleAuthProvider())} className="mt-12 bg-[#FFCC00] text-[#800000] px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">
              Sign in with Google
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setView(view === 'admin' ? 'form' : 'admin')} className="mt-6 flex items-center gap-2 bg-[#FFCC00] text-[#800000] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-[#800000] shadow-lg active:scale-95 transition-transform">
              <ShieldCheck size={16} /> {view === 'admin' ? 'Exit Admin' : 'Admin Dashboard'}
            </button>
          )}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {user && (
          <motion.main initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-6 mt-8 max-w-6xl mx-auto space-y-12 relative z-20">
            
            {view === 'admin' ? (
              /* --- ADMIN MASTER LIST --- */
              <div className="space-y-8">
                <div className="flex justify-between items-end border-b-2 border-[#FFCC00] pb-4">
                  <h2 className="text-3xl md:text-5xl font-black italic uppercase text-[#FFCC00]">Master List</h2>
                  <div className="bg-[#FFCC00] text-[#800000] px-3 py-1 rounded-lg text-xs font-black">{appointments.length} Total</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appointments.map((app, i) => (
                    <div key={i} className="bg-slate-900 border-2 border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
                      <div className="flex justify-between items-start">
                        <div className="max-w-[75%]">
                          <h3 className="font-black text-xl uppercase text-[#FFCC00] truncate leading-none">{(app.firstName || app.name || "Senior")} {app.lastName || ""}</h3>
                          <p className="text-white text-[10px] font-black uppercase tracking-widest bg-white/5 p-2 rounded-lg mt-3 truncate border border-white/5"><Mail size={12} className="text-[#FFCC00]"/> {app.contact}</p>
                        </div>
                        <button onClick={() => setDeleteId(app.id)} className="p-3 bg-red-600/20 text-red-500 rounded-xl active:bg-red-600 transition-all"><Trash2 size={18} /></button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-green-600/10 p-3 rounded-2xl border border-green-500/30 flex justify-between items-center text-white overflow-hidden">
                          <div className="truncate">
                            <p className="text-green-500 font-black text-[9px] uppercase tracking-widest leading-none mb-1">Choice 1</p>
                            <p className="font-black text-sm truncate">{app.choice1Event}</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">{app.choice1Date} @ {formatToStandardTime(app.choice1Time)}</p>
                          </div>
                          <a href={generateCalLink(app, 1)} target="_blank" rel="noreferrer" className="bg-green-600 p-2.5 rounded-xl text-white shrink-0 ml-2 shadow-lg active:scale-90 transition-transform"><PlusCircle size={20} /></a>
                        </div>
                        <div className="bg-orange-600/10 p-3 rounded-2xl border border-orange-500/30 flex justify-between items-center opacity-80 text-white overflow-hidden">
                          <div className="truncate">
                            <p className="text-orange-500 font-black text-[9px] uppercase tracking-widest leading-none mb-1">Choice 2</p>
                            <p className="font-black text-sm truncate">{app.choice2Event}</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">{app.choice2Date} @ {formatToStandardTime(app.choice2Time)}</p>
                          </div>
                          <a href={generateCalLink(app, 2)} target="_blank" rel="noreferrer" className="bg-orange-600 p-2.5 rounded-xl text-white shrink-0 ml-2 shadow-lg active:scale-90 transition-transform"><PlusCircle size={20} /></a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* --- SENIOR VIEW --- */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                
                {/* Form Side */}
                <div className="lg:col-span-7 space-y-10 order-2 lg:order-1">
                  <motion.div className="bg-[#800000]/30 border-4 border-[#800000] rounded-[2rem] shadow-2xl overflow-hidden">
                    <button onClick={() => setIsMsgExpanded(!isMsgExpanded)} className="w-full p-6 md:p-8 flex items-center justify-between text-[#FFCC00] active:bg-[#800000]/20 transition-colors text-left">
                      <div className="flex items-center gap-4">
                        <Sparkles size={24} />
                        <h3 className="font-black uppercase tracking-widest text-lg leading-tight">Project Mission</h3>
                      </div>
                      <motion.div animate={{ rotate: isMsgExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronDown size={24} /></motion.div>
                    </button>
                    <AnimatePresence>
                      {isMsgExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }} className="px-6 md:px-8 pb-8 text-slate-100 text-sm leading-relaxed font-bold italic border-t border-[#800000]/30 pt-6 space-y-4">
                          <p>"Hey Seniors! I'm Michaela Post '26, the head photographer. Put two possible events that you would want me to attend."</p>
                          <p>"Make sure to check your schedules first. You can come back anytime to change your dates. I hope you guys enjoy this project! Questions? Text me at <span className="text-[#FFCC00]">{LEAD_PHONE}</span>."</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <form onSubmit={handleSubmit} className="space-y-8 bg-slate-900/50 p-5 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFCC00] ml-2">First Name *</label>
                        <input type="text" placeholder="Michaela" required className="w-full bg-slate-900 border-2 border-white/10 p-4 rounded-xl focus:border-[#FFCC00] transition-all font-black text-white outline-none" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFCC00] ml-2">Last Name *</label>
                        <input type="text" placeholder="Post" required className="w-full bg-slate-900 border-2 border-white/10 p-4 rounded-xl focus:border-[#FFCC00] transition-all font-black text-white outline-none" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFCC00] ml-2">Phone Number/Email *</label>
                      <input type="text" placeholder="How can Michaela reach you?" required className="w-full bg-slate-900 border-2 border-white/10 p-4 rounded-xl focus:border-[#FFCC00] transition-all font-black text-white outline-none" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-3 text-[10px] font-black uppercase tracking-[0.3em]">
                        <label className="text-green-500">Choice #1 (Primary) *</label>
                        <span className="bg-green-500 text-black px-2 py-0.5 rounded">Limit: 6</span>
                      </div>
                      <div className="bg-slate-950 border-2 border-white/10 p-5 md:p-8 rounded-[2.5rem] space-y-4 shadow-2xl">
                        <select required className="w-full bg-slate-900 border-2 border-white/10 p-4 rounded-xl focus:border-green-400 font-bold text-white outline-none appearance-none" 
                          value={PRESET_EVENTS.some(e => e.name === formData.choice1Event) ? formData.choice1Event : (formData.choice1Event === "" ? "" : "Other")} 
                          onChange={e => handlePresetSelect(e.target.value, "choice1")}>
                          <option value="">Select an Event...</option>
                          {PRESET_EVENTS.map(ev => <option key={ev.name} value={ev.name}>{ev.name}</option>)}
                          <option value="Other">Other (Type below)</option>
                        </select>
                        {(formData.choice1Event === "Other" || !PRESET_EVENTS.some(e => e.name === formData.choice1Event) && formData.choice1Event !== "") && (
                          <input type="text" placeholder="Type your custom event..." required className="w-full bg-slate-900 border-2 border-[#FFCC00] p-4 rounded-xl font-bold text-white" 
                          value={formData.choice1Event === "Other" ? "" : formData.choice1Event}
                          onChange={e => setFormData(prev => ({...prev, choice1Event: e.target.value}))} />
                        )}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input type="date" required style={{ colorScheme: 'dark' }} className="w-full sm:w-1/2 bg-slate-900 border-2 border-white/10 p-3.5 rounded-xl text-xs font-black text-white outline-none min-w-0" value={formData.choice1Date} onChange={e => setFormData({...formData, choice1Date: e.target.value})} />
                          <input type="time" required style={{ colorScheme: 'dark' }} className="w-full sm:w-1/2 bg-slate-900 border-2 border-white/10 p-3.5 rounded-xl text-xs font-black text-white outline-none min-w-0" value={formData.choice1Time} onChange={e => setFormData({...formData, choice1Time: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 opacity-70">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 ml-3 uppercase">Choice #2 (Backup) *</label>
                      <div className="bg-slate-950 border-2 border-white/10 p-5 md:p-8 rounded-[2.5rem] space-y-4 shadow-2xl">
                        <select required className="w-full bg-slate-900 border-2 border-white/10 p-4 rounded-xl focus:border-orange-400 font-bold text-white outline-none appearance-none" 
                          value={PRESET_EVENTS.some(e => e.name === formData.choice2Event) ? formData.choice2Event : (formData.choice2Event === "" ? "" : "Other")} 
                          onChange={e => handlePresetSelect(e.target.value, "choice2")}>
                          <option value="">Select Backup Event...</option>
                          {PRESET_EVENTS.map(ev => <option key={ev.name} value={ev.name}>{ev.name}</option>)}
                          <option value="Other">Other (Type below)</option>
                        </select>
                        {(formData.choice2Event === "Other" || !PRESET_EVENTS.some(e => e.name === formData.choice2Event) && formData.choice2Event !== "") && (
                          <input type="text" placeholder="Type backup custom event..." required className="w-full bg-slate-900 border-2 border-[#FFCC00] p-4 rounded-xl font-bold text-white" 
                          value={formData.choice2Event === "Other" ? "" : formData.choice2Event}
                          onChange={e => setFormData(prev => ({...prev, choice2Event: e.target.value}))} />
                        )}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input type="date" required style={{ colorScheme: 'dark' }} className="w-full sm:w-1/2 bg-slate-900 border-2 border-white/10 p-3.5 rounded-xl text-xs font-black text-white outline-none min-w-0" value={formData.choice2Date} onChange={e => setFormData({...formData, choice2Date: e.target.value})} />
                          <input type="time" required style={{ colorScheme: 'dark' }} className="w-full sm:w-1/2 bg-slate-900 border-2 border-white/10 p-3.5 rounded-xl text-xs font-black text-white outline-none min-w-0" value={formData.choice2Time} onChange={e => setFormData({...formData, choice2Time: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    {error && <div className="bg-red-600 text-white p-4 rounded-2xl flex items-center gap-3 font-black text-xs uppercase animate-bounce shadow-xl"><AlertTriangle size={18} /> {error}</div>}

                    <button type="submit" disabled={isSaving} className="w-full bg-[#FFCC00] text-[#800000] py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(255,204,0,0.5)] disabled:opacity-50 text-sm active:scale-95 transition-all">
                      {isSaving ? 'Processing...' : 'Reserve My Spot'}
                    </button>
                  </form>
                </div>

                {/* Right Column: Squad List */}
                <div className="lg:col-span-5 space-y-10 order-1 lg:order-2 sticky top-8">
                   {formData.choice1Event && (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#FFCC00] p-6 md:p-8 rounded-[3rem] text-[#800000] shadow-2xl border-4 border-[#800000]">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="bg-[#800000] text-[#FFCC00] p-3 rounded-full shadow-lg"><CheckCircle2 size={24} /></div>
                        <h3 className="font-black uppercase tracking-tighter text-2xl leading-none italic">You're Set!</h3>
                      </div>
                      <div className="space-y-3">
                        <a href={generateCalLink(formData, 1)} target="_blank" rel="noreferrer" className="w-full bg-[#800000] text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl"><Calendar size={18}/> Google Cal</a>
                      </div>
                    </motion.div>
                  )}
                  <section className="space-y-8">
                    <div className="flex justify-between items-end border-b border-white/10 pb-4 px-2">
                      <h3 className="text-4xl font-black italic uppercase text-[#FFCC00] tracking-tighter leading-none">The Squad.</h3>
                      <div className="bg-[#FFCC00] text-[#800000] px-3 py-1 rounded-full font-black text-[10px]">
                         {appointments.length} Seniors
                      </div>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-hide">
                      {appointments.map((app, i) => (
                        <div key={i} className="bg-slate-900 p-5 rounded-[2rem] border-2 border-white/10 flex items-center justify-between shadow-xl overflow-hidden">
                          <div className="flex items-center gap-4 truncate">
                            <div className="w-12 h-12 bg-[#FFCC00] text-[#800000] rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border border-[#800000]/10 shrink-0">{(app.firstName || app.name || "S").charAt(0)}</div>
                            <div className="truncate">
                              <h4 className="font-black text-sm uppercase text-white tracking-tight leading-none truncate">{(app.firstName || app.name || "Senior")} {app.lastName || ""}</h4>
                              <p className="text-[10px] text-[#FFCC00] font-black uppercase tracking-widest mt-1 opacity-70 italic truncate">{app.choice1Event}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-sm font-black text-[#FFCC00] uppercase leading-none">{app.choice1Date?.split('-').slice(1).join('/') || "TBD"}</p>
                            <p className="text-[10px] text-white font-black mt-1 opacity-40 italic tracking-tighter">{formatToStandardTime(app.choice1Time)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}

            <footer className="pt-20 pb-10 text-center space-y-6 border-t border-white/5 pt-10">
              <div className="space-y-1 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFCC00]">Produced & Photographed By</p>
                <p className="text-sm font-black italic uppercase tracking-tighter">{PROJECT_LEAD} • Salpointe Catholic</p>
              </div>
              <button onClick={() => signOut(auth)} className="bg-white/10 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 mx-auto border border-white/10 hover:bg-red-600 transition-all shadow-xl">
                <LogOut size={16}/> Sign Out
              </button>
            </footer>

          </motion.main>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 20 }} className="relative bg-slate-900 border-4 border-red-600 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center text-white">
              <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
              <h2 className="text-2xl font-black italic uppercase mb-2">Delete?</h2>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setDeleteId(null)} className="py-4 rounded-2xl bg-white/10 text-white text-xs font-black uppercase tracking-widest">Cancel</button>
                <button onClick={handleDelete} className="py-4 rounded-2xl bg-red-600 text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}