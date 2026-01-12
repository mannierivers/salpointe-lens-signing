import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot 
} from 'firebase/firestore';
import { 
  GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  Calendar, Clock, User, CheckCircle2, LogOut, Camera, 
  AlertTriangle, Users, Sparkles, ChevronDown, CameraIcon, Smartphone
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '', contact: '',
    choice1Event: '', choice1Date: '', choice1Time: '',
    choice2Event: '', choice2Date: '', choice2Time: ''
  });
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Handle redirect result
    getRedirectResult(auth).then((result) => {
      if (result?.user && isMounted) fetchUserRecord(result.user.uid);
    }).catch(() => setError("Login failed. Open in Safari/Chrome."));

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (isMounted) {
        setUser(u);
        if (u) fetchUserRecord(u.uid);
        setLoading(false);
      }
    });

    const q = collection(db, "appointments");
    const unsubSnap = onSnapshot(q, (snap) => {
      if (isMounted) {
        const data = snap.docs.map(doc => doc.data());
        setAppointments(data.sort((a, b) => new Date(a.choice1Date) - new Date(b.choice1Date)));
      }
    });

    return () => { isMounted = false; unsubAuth(); unsubSnap(); };
  }, []);

  const fetchUserRecord = async (uid) => {
    const docRef = doc(db, "appointments", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) setFormData(docSnap.data());
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signInWithRedirect(auth, provider);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const q = query(collection(db, "appointments"), 
        where("choice1Event", "==", formData.choice1Event),
        where("choice1Date", "==", formData.choice1Date));
      const snapshot = await getDocs(q);
      const others = snapshot.docs.filter(d => d.id !== user.uid);
      if (others.length >= 6) {
        setError(`Choice #1 is full! Pick another date or event.`);
        setIsSaving(false); return;
      }
      await setDoc(doc(db, "appointments", user.uid), {
        ...formData, userId: user.uid, updatedAt: new Date().toISOString()
      });
      alert("📸 Captured! Your spot is reserved.");
    } catch (err) { 
      setError("Save failed. Try again."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#800000]">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-yellow-400"
      >
        <Camera size={64} />
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-white selection:bg-yellow-400 selection:text-maroon-900 overflow-x-hidden">
      
      {/* HERO / LANDING SECTION */}
      <section className={`relative transition-all duration-1000 flex flex-col items-center justify-center px-6 overflow-hidden ${user ? 'h-[40vh]' : 'h-screen'}`}>
        
        {/* Background Visuals */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#800000]/30 to-transparent z-0" />
        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ repeat: Infinity, duration: 5 }}
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-10"
        />
        <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-[#800000] rounded-full blur-[120px] opacity-40" />

        <div className="relative z-20 flex flex-col items-center text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="bg-yellow-400 p-5 rounded-[2.5rem] text-maroon-900 mb-6 shadow-2xl"
          >
            <CameraIcon size={42} strokeWidth={2.5} />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-black italic tracking-tighter leading-[0.85]"
          >
            SIGN THE <br/>
            <span className="text-yellow-400 not-italic">LENS.</span>
          </motion.h1>
          
          <motion.p className="mt-4 text-slate-500 font-bold tracking-[0.3em] text-[10px] uppercase">
            Salpointe Class of 2025
          </motion.p>

          <AnimatePresence>
            {!user && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-12 space-y-6 flex flex-col items-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogin}
                  className="relative z-30 bg-white text-slate-950 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:bg-yellow-400 transition-colors"
                >
                  Sign in with Google
                </motion.button>
                
                <p className="flex items-center gap-2 text-slate-500 text-[9px] uppercase font-bold tracking-widest">
                  <Smartphone size={12}/> Best in Safari or Chrome
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user && (
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-6 z-20"
          >
            <ChevronDown className="text-yellow-400/50" />
          </motion.div>
        )}
      </section>

      {/* CONTENT AREA (Only shows if logged in) */}
      <AnimatePresence>
        {user && (
          <motion.main 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 pb-20 space-y-12 relative z-20"
          >
            
            {/* INSTRUCTIONS */}
            <motion.div className="bg-white/5 border border-white/10 p-7 rounded-[2.5rem] backdrop-blur-xl">
              <h2 className="flex items-center gap-2 text-yellow-400 font-black uppercase text-[10px] tracking-widest mb-4">
                <Sparkles size={14}/> Instruction Manual
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                "Hey Seniors! Put two possible events you want me to attend. I'll be there to capture your lens signing forever. Make sure to check your schedules first!"
              </p>
            </motion.div>

            {/* FORM */}
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-8"
            >
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 ml-2">Contact Info</label>
                <input 
                  type="text" placeholder="First & Last Name" required
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:ring-2 focus:ring-yellow-400 transition-all font-bold text-white placeholder:text-slate-700 shadow-inner" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input 
                  type="text" placeholder="Phone or Email" required
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:ring-2 focus:ring-yellow-400 transition-all font-bold text-white placeholder:text-slate-700 shadow-inner" 
                  value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
              </div>

              {/* Choice 1 */}
              <div className="space-y-4">
                <div className="flex justify-between px-2 items-end">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500">Choice #1 (Primary)</label>
                  <span className="text-[8px] font-black uppercase bg-green-500/10 text-green-500 px-2 py-1 rounded">Limit 6</span>
                </div>
                <div className="bg-gradient-to-br from-white/10 to-transparent p-[1px] rounded-[2rem]">
                  <div className="bg-slate-950 p-6 rounded-[2rem] space-y-4">
                    <input 
                      type="text" placeholder="Event Name" required
                      className="w-full bg-white/5 border-none p-4 rounded-xl focus:ring-2 focus:ring-green-500 text-sm font-bold" 
                      value={formData.choice1Event} onChange={e => setFormData({...formData, choice1Event: e.target.value})} />
                    <div className="flex gap-2">
                      <input type="date" required className="flex-1 bg-white/5 border-none p-4 rounded-xl text-xs font-bold" 
                        value={formData.choice1Date} onChange={e => setFormData({...formData, choice1Date: e.target.value})} />
                      <input type="time" required className="flex-1 bg-white/5 border-none p-4 rounded-xl text-xs font-bold" 
                        value={formData.choice1Time} onChange={e => setFormData({...formData, choice1Time: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Choice 2 */}
              <div className="space-y-4 opacity-80">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 ml-2">Choice #2 (Backup)</label>
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                  <input 
                    type="text" placeholder="Backup Event Name" required
                    className="w-full bg-white/5 border-none p-4 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm font-bold" 
                    value={formData.choice2Event} onChange={e => setFormData({...formData, choice2Event: e.target.value})} />
                  <div className="flex gap-2">
                    <input type="date" required className="flex-1 bg-white/5 border-none p-4 rounded-xl text-xs font-bold" 
                      value={formData.choice2Date} onChange={e => setFormData({...formData, choice2Date: e.target.value})} />
                    <input type="time" required className="flex-1 bg-white/5 border-none p-4 rounded-xl text-xs font-bold" 
                      value={formData.choice2Time} onChange={e => setFormData({...formData, choice2Time: e.target.value})} />
                  </div>
                </div>
              </div>

              {error && (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-red-500/10 text-red-500 p-4 rounded-2xl flex items-center gap-3 border border-red-500/20 text-xs font-black uppercase tracking-tighter">
                  <AlertTriangle size={18} /> {error}
                </motion.div>
              )}

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSaving}
                className="w-full bg-yellow-400 text-maroon-900 py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(250,204,21,0.2)] disabled:opacity-50 text-xs"
              >
                {isSaving ? 'Processing...' : 'Reserve my Spot'}
              </motion.button>
            </motion.form>

            {/* SCHEDULE SECTION */}
            <section className="pt-20">
              <div className="flex justify-between items-end mb-10 px-2">
                <div>
                  <h3 className="text-4xl font-black tracking-tighter italic leading-none">THE <br/>SQUAD.</h3>
                  <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Live Calendar</p>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2 text-[10px] font-black">
                  <Users size={14} className="text-yellow-400" /> {appointments.length} SENIORS
                </div>
              </div>

              <div className="space-y-4">
                {appointments.map((app, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    viewport={{ once: true }}
                    className="bg-white/5 p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center font-black text-xl border border-white/10 shadow-xl group-hover:bg-yellow-400 group-hover:text-maroon-900 transition-colors">
                        {app.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight">{app.name}</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{app.choice1Event}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-yellow-400">{app.choice1Date.split('-').slice(1).join('/')}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">{app.choice1Time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            <footer className="pt-20 pb-10 text-center border-t border-white/5">
               <button onClick={() => signOut(auth)} className="text-slate-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto hover:text-white transition-colors">
                 <LogOut size={14}/> Sign Out
               </button>
            </footer>

          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}