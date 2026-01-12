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
  AlertTriangle, Users, Sparkles, ChevronDown, CameraIcon
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
    const initAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user && isMounted) fetchUserRecord(result.user.uid);
      } catch (err) { setError("Mobile login failed. Use Safari/Chrome."); }
    };
    initAuth();

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

  const handleLogin = () => signInWithRedirect(auth, new GoogleAuthProvider());
  
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
    } catch (err) { setError("Save failed."); } finally { setIsSaving(false); }
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
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
    <div className="max-w-md mx-auto min-h-screen bg-slate-900 text-white selection:bg-yellow-400 selection:text-maroon-900">
      
      {/* HERO SECTION */}
      <section className="relative h-[60vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated background elements */}
        <motion.div 
          animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 8 }}
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"
        />
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#800000] rounded-full blur-[100px]" />
        
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
          className="bg-yellow-400 p-4 rounded-3xl text-maroon-900 mb-6 shadow-[0_0_50px_rgba(250,204,21,0.3)]"
        >
          <CameraIcon size={48} strokeWidth={2.5} />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black italic tracking-tighter text-center leading-none"
        >
          SIGN THE <span className="text-yellow-400">LENS.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-slate-400 font-bold tracking-[0.2em] text-xs uppercase"
        >
          Salpointe Class of 2025
        </motion.p>

        {!user && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogin}
            className="mt-10 bg-white text-slate-900 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm shadow-2xl"
          >
            Sign in to Start
          </motion.button>
        )}

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10"
        >
          <ChevronDown className="text-slate-600" />
        </motion.div>
      </section>

      {user && (
        <main className="px-6 pb-20 space-y-12">
          
          {/* DESCRIPTION CARD */}
          <motion.div {...fadeInUp} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
            <h2 className="flex items-center gap-2 text-yellow-400 font-black uppercase text-xs tracking-widest mb-4">
              <Sparkles size={16}/> The Project
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed italic">
              "Hey Seniors! Put two possible events (sports, plays, shows, assemblies, or even lunch!) you want me to attend. I'll be there to capture your lens signing forever. Make sure to check your schedules first!"
            </p>
          </motion.div>

          {/* THE FORM */}
          <motion.form {...fadeInUp} onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Personal</label>
              <input 
                type="text" placeholder="Full Name" required
                className="w-full bg-white/10 border-none p-5 rounded-2xl focus:ring-2 focus:ring-yellow-400 transition-all placeholder:text-slate-600 font-bold" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input 
                type="text" placeholder="Contact Info" required
                className="w-full bg-white/10 border-none p-5 rounded-2xl focus:ring-2 focus:ring-yellow-400 transition-all placeholder:text-slate-600 font-bold" 
                value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>

            <div className="space-y-4 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#800000] to-yellow-400 rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition" />
              <div className="relative bg-slate-900 p-6 rounded-3xl border border-white/10 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500 flex justify-between">
                  <span>Choice #1</span>
                  <span>Max 6</span>
                </label>
                <input 
                  type="text" placeholder="Primary Event" required
                  className="w-full bg-white/5 border-none p-4 rounded-xl focus:ring-2 focus:ring-green-500" 
                  value={formData.choice1Event} onChange={e => setFormData({...formData, choice1Event: e.target.value})} />
                <div className="flex gap-2">
                  <input type="date" required className="flex-1 bg-white/5 border-none p-4 rounded-xl text-xs font-bold" 
                    value={formData.choice1Date} onChange={e => setFormData({...formData, choice1Date: e.target.value})} />
                  <input type="time" required className="flex-1 bg-white/5 border-none p-4 rounded-xl text-xs font-bold" 
                    value={formData.choice1Time} onChange={e => setFormData({...formData, choice1Time: e.target.value})} />
                </div>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSaving}
              className="w-full bg-yellow-400 text-maroon-900 py-5 rounded-2xl font-black uppercase tracking-widest shadow-[0_20px_40px_rgba(250,204,21,0.2)] disabled:opacity-50"
            >
              {isSaving ? 'Processing...' : 'Lock it In'}
            </motion.button>
          </motion.form>

          {/* THE SCHEDULE */}
          <motion.section {...fadeInUp} className="pt-10">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-3xl font-black tracking-tighter italic">THE SQUAD.</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Confirmed Signings</p>
              </div>
              <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs font-bold">
                <Users size={14} className="text-yellow-400" /> {appointments.length}
              </div>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {appointments.map((app, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-white/5 p-5 rounded-[2rem] border border-white/5 flex items-center justify-between hover:bg-white/10 transition group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-400 text-maroon-900 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                        {app.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight">{app.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{app.choice1Event}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-yellow-400">{app.choice1Date.split('-').slice(1).join('/')}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">{app.choice1Time}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>

          <footer className="py-10 text-center border-t border-white/5">
             <button onClick={() => signOut(auth)} className="text-slate-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mx-auto hover:text-white transition">
               <LogOut size={12}/> Sign Out
             </button>
          </footer>
        </main>
      )}
    </div>
  );
}