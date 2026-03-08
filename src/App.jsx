import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, addDoc 
} from 'firebase/firestore';
import { 
  GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  Calendar, Clock, User, CheckCircle2, LogOut, Camera, 
  AlertTriangle, Users, Sparkles, ChevronDown, 
  Smartphone, ShieldCheck, Mail, Trash2, PlusCircle, SmartphoneIcon, CameraIcon, Info, Plus, X, UploadCloud, ListPlus
} from 'lucide-react';

// --- CONFIGURATION ---
const ADMIN_EMAILS = ['26mpost@salpointe.org', 'erivers@salpointe.org'];
const CLASS_YEAR = "2026";
const PROJECT_LEAD = "Michaela Post '26";
const LEAD_EMAIL = "26mpost@salpointe.org";
const LEAD_TITLE = "Head Photographer";
const GOLD = "#FFCC00"; 
const MAROON = "#800000";

// --- UTILITIES ---
const formatToStandardTime = (militaryTime) => {
  if (!militaryTime || typeof militaryTime !== 'string' || !militaryTime.includes(':')) return "TBD";
  const [hours, minutes] = militaryTime.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = ((h + 11) % 12 + 1);
  return `${displayHours}:${minutes} ${ampm}`;
};

const convertToMilitary = (timeStr) => {
  if (!timeStr) return "12:00";
  const normalized = timeStr.trim().toUpperCase();
  const [time, modifier] = normalized.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

const convertToISODate = (dateStr) => {
  if (!dateStr) return "2026-01-01";
  const parts = dateStr.trim().split('/');
  if (parts.length < 2) return "2026-01-01";
  const month = parts[0].padStart(2, '0');
  const day = parts[1].padStart(2, '0');
  const year = parts[2] ? (parts[2].length === 2 ? `20${parts[2]}` : parts[2]) : "2026";
  return `${year}-${month}-${day}`;
};

const generateCalLink = (app, choiceNum) => {
  if (!app) return "#";
  const event = choiceNum === 1 ? app.choice1Event : app.choice2Event;
  const date = choiceNum === 1 ? app.choice1Date : app.choice2Date;
  const time = choiceNum === 1 ? app.choice1Time : app.choice2Time;
  if (!date || !time) return "#";
  const startStr = `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
  const endHour = (parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0');
  const endStr = `${date.replace(/-/g, '')}T${endHour}${time.split(':')[1]}00`;
  const fullName = app.firstName ? `${app.firstName} ${app.lastName}` : (app.name || "Senior");
  const title = encodeURIComponent(`SENIOR SIGN OUT: ${fullName}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=Senior Sign Out project with Michaela Post.&location=${encodeURIComponent(event || "")}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('form'); 
  const [adminTab, setAdminTab] = useState('registrations'); 
  const [isMsgExpanded, setIsMsgExpanded] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false); 
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', contact: '', choice1Event: '', choice1Date: '', choice1Time: '', choice2Event: '', choice2Date: '', choice2Time: '' });
  const [appointments, setAppointments] = useState([]);
  const [presetEvents, setPresetEvents] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Modals
  const [deleteRegId, setDeleteRegId] = useState(null);
  const [deleteEventId, setDeleteEventId] = useState(null);
  const [fullEventWarning, setFullEventWarning] = useState(null);

  // Admin states
  const [singleEvent, setSingleEvent] = useState({ name: '', date: '', time: '' });
  const [bulkInput, setBulkInput] = useState('');

  const isAdmin = user && ADMIN_EMAILS.includes(user?.email);

  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth).catch(() => setError("Login failed."));
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (isMounted) { setUser(u); if (u) fetchUserRecord(u.uid); setLoading(false); }
    });
    const unsubSnap = onSnapshot(collection(db, "appointments"), (snap) => {
      if (isMounted) {
        const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setAppointments(data.sort((a, b) => new Date(a?.choice1Date || 0) - new Date(b?.choice1Date || 0)));
      }
    });
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      if (isMounted) {
        const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setPresetEvents(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
      }
    });
    return () => { isMounted = false; unsubAuth(); unsubSnap(); unsubEvents(); };
  }, []);

  const fetchUserRecord = async (uid) => {
    const docSnap = await getDoc(doc(db, "appointments", uid));
    if (docSnap.exists()) { setFormData(docSnap.data()); setIsSubmitted(true); }
  };

  const handlePresetSelect = (selection, choiceKey) => {
    if (selection === "Other" || selection === "") {
      setFormData(prev => ({ ...prev, [choiceKey + "Event"]: selection }));
    } else {
      const eventObj = presetEvents.find(e => e.name === selection);
      if (eventObj) {
        setFormData(prev => ({ ...prev, [choiceKey + "Event"]: eventObj.name, [choiceKey + "Date"]: eventObj.date, [choiceKey + "Time"]: eventObj.time }));
      }
    }
  };

  // --- ADMIN LOGIC ---
  const handleAddSingleEvent = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "events"), singleEvent);
    setSingleEvent({ name: '', date: '', time: '' });
  };

const handleBulkAdd = async () => {
    // This splits the big block of text into individual lines
    const lines = bulkInput.split('\n');
    let count = 0;

    for (const line of lines) {
      // SMART SPLIT: This looks for a TAB (from Sheets) OR a COMMA
      const parts = line.split(/[\t,]/); 
      
      // We need at least 3 columns: Name, Date, Time
      if (parts.length >= 3) {
        try {
          const name = parts[0].trim();
          const rawDate = parts[1].trim();
          const rawTime = parts[2].trim();

          await addDoc(collection(db, "events"), { 
            name: name, 
            date: convertToISODate(rawDate), 
            time: convertToMilitary(rawTime) 
          });
          count++;
        } catch (err) {
          console.error("Skipping line due to error: ", line);
        }
      }
    }
    setBulkInput('');
    alert(`Success! Smarts-Import added ${count} events from your list.`);
  };

  const confirmDeleteRegistration = async () => {
    await deleteDoc(doc(db, "appointments", deleteRegId));
    setDeleteRegId(null);
  };

  const confirmDeleteEvent = async () => {
    await deleteDoc(doc(db, "events", deleteEventId));
    setDeleteEventId(null);
  };

  // --- AUTH & FORM ---
  const handleLogin = () => signInWithRedirect(auth, new GoogleAuthProvider());
  const handleLogout = () => signOut(auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setIsSaving(true);
    const q = query(collection(db, "appointments"), where("choice1Event", "==", formData.choice1Event), where("choice1Date", "==", formData.choice1Date));
    const snap = await getDocs(q);
    if (snap.docs.filter(d => d.id !== user.uid).length >= 6) {
      setFullEventWarning(formData.choice1Event);
      setIsSaving(false); return;
    }
    await setDoc(doc(db, "appointments", user.uid), { ...formData, userId: user.uid, updatedAt: new Date().toISOString() });
    setIsSubmitted(true); setShowSuccessModal(true);
    setIsSaving(false);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#800000]">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }} className="text-[#FFCC00]"><Camera size={64} /></motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 overflow-x-hidden selection:bg-[#FFCC00] selection:text-[#800000]">
      
      {/* HERO SECTION */}
      <section className={`relative transition-all duration-1000 flex flex-col items-center justify-center px-4 md:px-6 ${user ? 'min-h-[35vh] md:min-h-[45vh]' : 'h-screen'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#800000]/60 to-transparent z-0" />
        <div className="relative z-30 flex flex-col items-center text-center max-w-4xl w-full">
          <img src="/sc-logo.png" alt="Salpointe Logo" className="w-20 h-20 md:w-28 md:h-28 object-contain mb-4 drop-shadow-2xl" />
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.85]">Sign The <br/><span className="text-[#FFCC00] not-italic font-bold">Lens.</span></h1>
          <div className="mt-4 bg-[#FFCC00] text-[#800000] px-4 py-1.5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border border-[#800000]/20">
            <CameraIcon size={12} /> {PROJECT_LEAD} | {LEAD_TITLE}
          </div>
          {!user && (
            <button onClick={handleLogin} className="mt-12 bg-[#FFCC00] text-[#800000] px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm active:scale-95 transition-all shadow-xl">Sign in with Google</button>
          )}
          {isAdmin && (
            <button onClick={() => setView(view === 'admin' ? 'form' : 'admin')} className="mt-6 flex items-center gap-2 bg-[#FFCC00] text-[#800000] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-[#800000] shadow-lg">
              <ShieldCheck size={16} /> {view === 'admin' ? 'Exit Admin' : 'Admin Dashboard'}
            </button>
          )}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {user && (
          <motion.main initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-6 mt-8 max-w-6xl mx-auto space-y-12 relative z-20">
            
            {view === 'admin' ? (
              /* --- ADMIN DASHBOARD --- */
              <div className="space-y-8">
                <div className="flex gap-4 border-b border-white/10 pb-4">
                  <button onClick={() => setAdminTab('registrations')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${adminTab === 'registrations' ? 'bg-[#FFCC00] text-[#800000]' : 'bg-white/5 text-slate-500'}`}>Registrations</button>
                  <button onClick={() => setAdminTab('events')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${adminTab === 'events' ? 'bg-[#FFCC00] text-[#800000]' : 'bg-white/5 text-slate-500'}`}>Manage Events</button>
                </div>

                {adminTab === 'registrations' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {appointments.map((app) => (
                      <div key={app.id} className="bg-slate-900 border-2 border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl relative">
                        <div className="flex justify-between items-start">
                          <div className="truncate pr-4">
                            <h3 className="font-black text-xl uppercase text-[#FFCC00] truncate">{(app?.firstName || "Senior")} {app?.lastName}</h3>
                            <p className="text-white text-[10px] font-black uppercase tracking-widest truncate mt-2"><Mail size={12} className="inline mr-2 text-[#FFCC00]"/> {app?.contact}</p>
                          </div>
                          <button onClick={() => setDeleteRegId(app.id)} className="p-3 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                        </div>
                        <div className="bg-green-600/10 p-3 rounded-2xl border border-green-500/30 flex justify-between items-center text-white">
                           <div className="truncate">
                              <p className="font-black text-xs truncate uppercase">{app?.choice1Event}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{app?.choice1Date} @ {formatToStandardTime(app?.choice1Time)}</p>
                           </div>
                           <a href={generateCalLink(app, 1)} target="_blank" className="bg-green-600 p-2.5 rounded-xl ml-2 shadow-lg"><PlusCircle size={18}/></a>
                           <a href={getIcsLink(formData)} download="signing.ics" className="w-full bg-white text-[#800000] py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest active:scale-95 transition-all border-2 border-[#800000] shadow-xl">
                              <SmartphoneIcon size={18}/> Apple Calendar
                            </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* --- MANAGE PRESET EVENTS --- */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-10">
                      <div className="bg-[#800000]/20 border-2 border-[#800000] p-6 rounded-3xl space-y-6">
                        <h3 className="text-xl font-black uppercase text-[#FFCC00] italic flex items-center gap-2"><ListPlus /> Single Add</h3>
                        <form onSubmit={handleAddSingleEvent} className="space-y-4">
                           <input type="text" placeholder="Event Name" required className="w-full bg-slate-900 border border-white/10 p-4 rounded-xl font-bold text-white outline-none" value={singleEvent.name} onChange={e => setSingleEvent({...singleEvent, name: e.target.value})} />
                           <div className="flex gap-4">
                              <input type="date" required style={{ colorScheme: 'dark' }} className="w-1/2 bg-slate-900 border border-white/10 p-4 rounded-xl text-xs font-black text-white" value={singleEvent.date} onChange={e => setSingleEvent({...singleEvent, date: e.target.value})} />
                              <input type="time" required style={{ colorScheme: 'dark' }} className="w-1/2 bg-slate-900 border border-white/10 p-4 rounded-xl text-xs font-black text-white" value={singleEvent.time} onChange={e => setSingleEvent({...singleEvent, time: e.target.value})} />
                           </div>
                           <button type="submit" className="w-full bg-[#FFCC00] text-[#800000] py-4 rounded-xl font-black uppercase tracking-widest text-xs">Add Event</button>
                        </form>
                      </div>
                      <div className="bg-slate-900 p-6 rounded-3xl border border-white/10 space-y-6">
                        <h3 className="text-xl font-black uppercase text-[#FFCC00] italic flex items-center gap-2"><UploadCloud /> Bulk Import</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Format: Name, M/D/YY, h:mm AM/PM</p>
                        <textarea className="w-full bg-slate-950 border border-white/10 p-4 rounded-2xl text-xs font-mono text-white h-40 outline-none" placeholder="Baseball v CDO, 3/13/26, 6:00 PM" value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} />
                        <button onClick={handleBulkAdd} className="w-full bg-white text-slate-950 py-4 rounded-xl font-black uppercase tracking-widest text-xs">Process List</button>
                      </div>
                    </div>
                    <div className="space-y-6">
                       <h3 className="text-3xl font-black uppercase italic text-[#FFCC00]">Live List.</h3>
                       <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                          {presetEvents.map(ev => (
                            <div key={ev.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex justify-between items-center hover:border-red-600/50 transition-all group">
                               <div>
                                  <p className="font-black text-white text-sm uppercase leading-tight">{ev.name}</p>
                                  <p className="text-[10px] text-[#FFCC00] font-black uppercase mt-1 tracking-widest">{ev.date} • {formatToStandardTime(ev.time)}</p>
                               </div>
                               <button onClick={() => setDeleteEventId(ev.id)} className="p-2.5 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18}/></button>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* --- SENIOR VIEW --- */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-7 space-y-10 order-2 lg:order-1">
                  <motion.div className="bg-[#800000]/30 border-4 border-[#800000] rounded-[2.5rem] shadow-2xl overflow-hidden">
                    <button onClick={() => setIsMsgExpanded(!isMsgExpanded)} className="w-full p-6 md:p-8 flex items-center justify-between text-[#FFCC00] active:bg-[#800000]/20 transition-colors text-left">
                      <div className="flex items-center gap-4">
                        <Sparkles size={28} />
                        <h3 className="font-black uppercase tracking-widest text-lg md:text-xl leading-tight text-white">Project Hub</h3>
                      </div>
                      <motion.div animate={{ rotate: isMsgExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronDown size={28} className="text-[#FFCC00]" /></motion.div>
                    </button>
                    <AnimatePresence>
                      {isMsgExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }} className="px-8 md:px-10 pb-10 text-slate-100 text-sm md:text-base leading-relaxed font-bold italic border-t border-[#800000]/30 pt-6 space-y-5">
                          <p>"Hey Seniors! I’m Michaela Post '26, and I’m so excited to be the head photographer for this year’s Senior Sign-Out project. The goal is to capture that iconic moment when you sign the camera lens."</p>
                          <p>"Suggest two possible events where I can meet you—sports, theater, or lunch! List them in order of preference."</p>
                          <p>"If you have questions, email me at <span className="text-[#FFCC00] underline">{LEAD_EMAIL}</span>."</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <form onSubmit={handleSubmit} className="space-y-8 bg-slate-900/50 p-6 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFCC00] ml-2 opacity-80">First Name *</label>
                        <input id="firstName" name="given-name" autoComplete="given-name" type="text" placeholder="First Name" required className="w-full bg-slate-900 border-2 border-white/10 p-5 rounded-2xl focus:border-[#FFCC00] transition-all font-black text-white outline-none shadow-xl" value={formData.firstName || ""} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFCC00] ml-2 opacity-80">Last Name *</label>
                        <input id="lastName" name="family-name" autoComplete="family-name" type="text" placeholder="Last Name" required className="w-full bg-slate-900 border-2 border-white/10 p-5 rounded-2xl focus:border-[#FFCC00] transition-all font-black text-white outline-none shadow-xl" value={formData.lastName || ""} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="contact" className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFCC00] ml-2 opacity-80">Phone Number / Email *</label>
                      <input id="contact" name="email" autoComplete="email" type="text" placeholder="Contact Info" required className="w-full bg-slate-900 border-2 border-white/10 p-5 rounded-2xl focus:border-[#FFCC00] transition-all font-black text-white outline-none shadow-xl" value={formData.contact || ""} onChange={e => setFormData({...formData, contact: e.target.value})} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-3 text-[10px] font-black uppercase tracking-[0.3em]">
                        <label htmlFor="choice1Event" className="text-green-500">Choice #1 (Primary) *</label>
                        <span className="bg-green-500 text-black px-2 py-0.5 rounded font-black">6 people per event</span>
                      </div>
                      <div className="bg-slate-950 border-2 border-white/10 p-6 md:p-8 rounded-[2.5rem] space-y-4 shadow-2xl">
                        <select id="choice1Event" name="choice1-event" autoComplete="off" required className="w-full bg-slate-900 border-2 border-white/10 p-4 rounded-xl focus:border-green-400 font-bold text-white outline-none appearance-none" 
                          value={presetEvents.some(e => e.name === formData.choice1Event) ? formData.choice1Event : (formData.choice1Event === "" ? "" : "Other")} 
                          onChange={e => handlePresetSelect(e.target.value, "choice1")}>
                          <option value="">Select an Event...</option>
                          {presetEvents.map(ev => <option key={ev.id} value={ev.name}>{ev.name} ({ev.date})</option>)}
                          <option value="Other">Other (Type below)</option>
                        </select>
                        {(formData.choice1Event === "Other" || (!presetEvents.some(e => e.name === formData.choice1Event) && formData.choice1Event !== "")) && (
                          <input type="text" placeholder="Type custom event..." required className="w-full bg-slate-900 border-2 border-[#FFCC00] p-4 rounded-xl font-bold text-white shadow-inner" 
                          value={formData.choice1Event === "Other" ? "" : formData.choice1Event}
                          onChange={e => setFormData(prev => ({...prev, choice1Event: e.target.value}))} />
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input id="choice1Date" name="choice1-date" type="date" required style={{ colorScheme: 'dark' }} className="w-full sm:w-1/2 bg-slate-900 border-2 border-white/10 p-3.5 rounded-xl text-xs font-black text-white outline-none min-w-0" value={formData.choice1Date || ""} onChange={e => setFormData({...formData, choice1Date: e.target.value})} />
                          <input id="choice1Time" name="choice1-time" type="time" required style={{ colorScheme: 'dark' }} className="w-full sm:w-1/2 bg-slate-900 border-2 border-white/10 p-3.5 rounded-xl text-xs font-black text-white outline-none min-w-0" value={formData.choice1Time || ""} onChange={e => setFormData({...formData, choice1Time: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 opacity-70">
                      <label htmlFor="choice2Event" className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 ml-3">Choice #2 (Backup) *</label>
                      <div className="bg-slate-950 border-2 border-white/10 p-6 md:p-8 rounded-[2.5rem] space-y-4 shadow-2xl italic text-white">
                        <select id="choice2Event" name="choice2-event" autoComplete="off" required className="w-full bg-slate-900 border-2 border-white/10 p-4 rounded-xl focus:border-orange-400 font-bold text-white outline-none appearance-none" 
                          value={presetEvents.some(e => e.name === formData.choice2Event) ? formData.choice2Event : (formData.choice2Event === "" ? "" : "Other")} 
                          onChange={e => handlePresetSelect(e.target.value, "choice2")}>
                          <option value="">Select Backup Event...</option>
                          {presetEvents.map(ev => <option key={ev.id} value={ev.name}>{ev.name} ({ev.date})</option>)}
                          <option value="Other">Other (Type below)</option>
                        </select>
                        {(formData.choice2Event === "Other" || (!presetEvents.some(e => e.name === formData.choice2Event) && formData.choice2Event !== "")) && (
                          <input type="text" placeholder="Type backup event..." required className="w-full bg-slate-900 border-2 border-[#FFCC00] p-4 rounded-xl font-bold text-white shadow-inner" 
                          value={formData.choice2Event === "Other" ? "" : formData.choice2Event}
                          onChange={e => setFormData(prev => ({...prev, choice2Event: e.target.value}))} />
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input id="choice2Date" name="choice2-date" type="date" required style={{ colorScheme: 'dark' }} className="w-full sm:w-1/2 bg-slate-900 border-2 border-white/10 p-3.5 rounded-xl text-xs font-black text-white outline-none min-w-0" value={formData.choice2Date || ""} onChange={e => setFormData({...formData, choice2Date: e.target.value})} />
                          <input id="choice2Time" name="choice2-time" type="time" required style={{ colorScheme: 'dark' }} className="w-full sm:w-1/2 bg-slate-900 border-2 border-white/10 p-3.5 rounded-xl text-xs font-black text-white outline-none min-w-0" value={formData.choice2Time || ""} onChange={e => setFormData({...formData, choice2Time: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={isSaving} className="w-full bg-[#FFCC00] text-[#800000] py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(255,204,0,0.5)] disabled:opacity-50 text-sm active:scale-95 transition-all">
                      {isSaving ? 'Processing...' : 'Reserve My Spot'}
                    </button>
                  </form>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-5 space-y-10 order-1 lg:order-2 lg:sticky lg:top-8">
                   {isSubmitted && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#FFCC00] p-6 md:p-8 rounded-[3rem] text-[#800000] shadow-2xl border-4 border-[#800000] z-30">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="bg-[#800000] text-[#FFCC00] p-3 rounded-full shadow-lg"><CheckCircle2 size={24} /></div>
                        <h3 className="font-black uppercase tracking-tighter text-2xl leading-none italic">You're Set!</h3>
                      </div>
                      <div className="space-y-3">
                        <a href={generateCalLink(formData, 1)} target="_blank" rel="noreferrer" className="w-full bg-[#800000] text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl"><Calendar size={18}/> Google Calendar</a>
                      </div>
                    </motion.div>
                  )}

                  <section className="space-y-8">
                    <div className="flex justify-between items-end border-b border-white/10 pb-4 px-2">
                      <h3 className="text-4xl font-black italic uppercase text-[#FFCC00] tracking-tighter leading-none">The Squad.</h3>
                      <div className="bg-[#FFCC00] text-[#800000] px-3 py-1 rounded-full font-black text-[10px]">{appointments.length} Seniors</div>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-hide">
                      {appointments.map((app) => (
                        <div key={app.id} className="bg-slate-900 p-4 md:p-5 rounded-[2rem] border-2 border-white/10 flex items-center justify-between shadow-xl overflow-hidden">
                          <div className="flex items-center gap-4 truncate">
                            <div className="w-12 h-12 bg-[#FFCC00] text-[#800000] rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0">{(app?.firstName || "S").charAt(0)}</div>
                            <div className="truncate pr-4">
                              <h4 className="font-black text-sm uppercase text-white tracking-tight leading-none truncate">{app?.firstName} {app?.lastName}</h4>
                              <p className="text-[10px] text-[#FFCC00] font-black uppercase mt-1 opacity-70 italic truncate">{app?.choice1Event || "No Event"}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-[#FFCC00] leading-none">{app?.choice1Date?.split('-').slice(1).join('/') || "TBD"}</p>
                            <p className="text-[10px] text-white font-black mt-1 opacity-40 italic">{formatToStandardTime(app?.choice1Time)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}

            <footer className="pt-20 pb-10 text-center space-y-6 border-t border-white/5">
              <div className="space-y-1 text-white text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFCC00]">Produced & Photographed By</p>
                <p className="text-sm font-black italic uppercase tracking-tighter">{PROJECT_LEAD} • Salpointe Catholic High School</p>
              </div>
              <div className="flex flex-col items-center gap-4">
                <button onClick={handleLogout} className="bg-white/10 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 mx-auto border border-white/10 hover:bg-red-600 transition-all shadow-xl">
                  <LogOut size={16}/> Sign Out
                </button>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-700">built by Jet Noir Systems, LLC</p>
              </div>
            </footer>

          </motion.main>
        )}
      </AnimatePresence>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {/* Delete Registration Modal */}
        {deleteRegId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteRegId(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative bg-slate-900 border-4 border-red-600 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center text-white">
              <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
              <h2 className="text-2xl font-black italic uppercase mb-2">Delete Registration?</h2>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button onClick={() => setDeleteRegId(null)} className="py-4 rounded-2xl bg-white/10 text-white text-xs font-black">Cancel</button>
                <button onClick={confirmDeleteRegistration} className="py-4 rounded-2xl bg-red-600 text-white text-xs font-black shadow-lg">Delete</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Event Modal */}
        {deleteEventId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteEventId(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative bg-slate-900 border-4 border-red-600 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center text-white">
              <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
              <h2 className="text-2xl font-black italic uppercase mb-2">Delete Preset Event?</h2>
              <p className="text-xs text-slate-400 mb-6 uppercase">This will remove it from the senior dropdown list.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setDeleteEventId(null)} className="py-4 rounded-2xl bg-white/10 text-white text-xs font-black">Cancel</button>
                <button onClick={confirmDeleteEvent} className="py-4 rounded-2xl bg-red-600 text-white text-xs font-black shadow-lg">Delete</button>
              </div>
            </motion.div>
          </div>
        )}

        {showSuccessModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSuccessModal(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative bg-[#FFCC00] p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center text-[#800000]">
              <div className="w-20 h-20 bg-[#800000] text-[#FFCC00] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"><CheckCircle2 size={48} /></div>
              <h2 className="text-3xl font-black italic uppercase mb-2 leading-tight">Confirmed!</h2>
              <p className="text-[#800000] text-sm font-black mb-8 uppercase tracking-widest text-center">Spot reserved. Scroll down to add it to your calendar!</p>
              <button onClick={() => setShowSuccessModal(false)} className="w-full py-5 rounded-2xl bg-[#800000] text-white text-sm font-black shadow-2xl active:scale-95 transition-transform">Close</button>
            </motion.div>
          </div>
        )}

        {fullEventWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFullEventWarning(null)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative bg-slate-900 border-4 border-yellow-500 p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center text-white">
              <div className="w-20 h-20 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6"><Users size={40} /></div>
              <h2 className="text-3xl font-black italic uppercase mb-2 text-yellow-500">Event Full!</h2>
              <p className="text-slate-200 text-sm font-bold leading-relaxed mb-8 uppercase tracking-widest text-center">Sorry! "{fullEventWarning}" already has 6 seniors. Please pick a different choice.</p>
              <button onClick={() => setFullEventWarning(null)} className="w-full py-5 rounded-2xl bg-yellow-500 text-[#800000] text-sm font-black shadow-xl">Go Back</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}