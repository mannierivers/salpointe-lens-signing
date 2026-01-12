import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  ChevronRight, 
  LogOut, 
  Camera, 
  AlertTriangle,
  Users,
  Info,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('form'); // 'form' or 'schedule'
  const [formData, setFormData] = useState({
    name: '', 
    contact: '',
    choice1Event: '', 
    choice1Date: '', 
    choice1Time: '',
    choice2Event: '', 
    choice2Date: '', 
    choice2Time: ''
  });
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Handle Redirect Result (Fixes mobile refreshing issue)
    const initAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user && isMounted) {
          fetchUserRecord(result.user.uid);
        }
      } catch (err) {
        console.error("Redirect Error:", err);
        setError("Sign-in failed. Try opening this page in Safari or Chrome directly.");
      }
    };
    initAuth();

    // 2. Auth State Listener
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (isMounted) {
        setUser(u);
        if (u) fetchUserRecord(u.uid);
        setLoading(false);
      }
    });

    // 3. Live Schedule Listener
    const q = collection(db, "appointments");
    const unsubSnap = onSnapshot(q, (snap) => {
      if (isMounted) {
        const data = snap.docs.map(doc => doc.data());
        // Sort schedule by Date
        setAppointments(data.sort((a, b) => new Date(a.choice1Date) - new Date(b.choice1Date)));
      }
    });

    return () => { isMounted = false; unsubAuth(); unsubSnap(); };
  }, []);

  const fetchUserRecord = async (uid) => {
    const docRef = doc(db, "appointments", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data()) {
      setFormData(docSnap.data());
    }
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signInWithRedirect(auth, provider);
  };

  const handleLogout = () => signOut(auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      // Logic: Check if Choice #1 is already full (Limit 6)
      const q = query(
        collection(db, "appointments"), 
        where("choice1Event", "==", formData.choice1Event),
        where("choice1Date", "==", formData.choice1Date)
      );
      
      const snapshot = await getDocs(q);
      
      // Filter out the current user's own record if they are just editing
      const others = snapshot.docs.filter(d => d.id !== user.uid);
      
      if (others.length >= 6) {
        setError(`Choice #1 is full! ${formData.choice1Event} on ${formData.choice1Date} already has 6 seniors. Please pick another event or date.`);
        setIsSaving(false);
        return;
      }

      // Save to Firestore (doc ID is user.uid so they only have one record)
      await setDoc(doc(db, "appointments", user.uid), {
        ...formData,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
      
      alert("✨ Your appointment has been saved!");
      setView('schedule');
    } catch (err) {
      console.error(err);
      setError("Something went wrong saving your info.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <Camera size={48} className="text-[#800000] mx-auto mb-2" />
        <p className="text-[#800000] font-black tracking-tighter uppercase text-sm">Lancer Lens</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pb-12 shadow-2xl overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <header className="bg-[#800000] text-white pt-12 pb-12 px-6 rounded-b-[3rem] shadow-xl relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400 opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Senior<br/>Lens Signing</h1>
            <p className="text-yellow-400 text-[10px] mt-2 font-bold uppercase tracking-widest bg-maroon-900/50 inline-block px-2 py-1 rounded">Class of 2025</p>
          </div>
          {user && (
            <button onClick={handleLogout} className="p-2 bg-white/10 rounded-full border border-white/20 active:scale-90 transition">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="flex px-6 -mt-7 relative z-20 gap-3">
        <button 
          onClick={() => setView('form')}
          className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all duration-300 ${view === 'form' ? 'bg-yellow-400 text-maroon-900 scale-105' : 'bg-white text-slate-400'}`}
        >
          {user ? 'My Booking' : 'Get Started'}
        </button>
        <button 
          onClick={() => setView('schedule')}
          className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all duration-300 ${view === 'schedule' ? 'bg-yellow-400 text-maroon-900 scale-105' : 'bg-white text-slate-400'}`}
        >
          View Schedule
        </button>
      </nav>

      <main className="px-6 py-8 flex-1">
        {!user ? (
          /* PRE-LOGIN VIEW */
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-8">
              <div className="flex items-center gap-2 text-maroon-700 mb-4 font-bold">
                <Info size={18} />
                <h2 className="text-sm uppercase tracking-tight">Project Info</h2>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed italic">
                "Hey Seniors! Below is a list of questions that will help me schedule your lens signing appointment. You will have to put two possible events (including sports events, plays, shows, assemblies, or even just at lunch!) that you would want me to attend, as I might not be able to attend the first one, so put them in order as to which you want me to attend more. Please make sure that you look at your schedule, whether that be your sports schedule, your theater performance schedule, etc., before you fill out the form. If you need to change your appointment, you can come back to the form to make changes. And this appointment can be scheduled any day of this year, including in the spring semester. I hope you guys enjoy this project! Let me know if you have any questions."
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                <ExternalLink size={24} className="text-blue-500 shrink-0" />
                <p className="text-[10px] text-blue-700 font-medium leading-tight">
                  <b>Browser Notice:</b> If you are in Instagram/Snapchat, tap the three dots <b>(...)</b> and choose <b>"Open in Safari"</b> to sign in successfully.
                </p>
              </div>
              <button 
                onClick={handleLogin} 
                className="w-full bg-[#800000] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-maroon-900/30 flex items-center justify-center gap-3 active:scale-95 transition"
              >
                SIGN IN WITH SCHOOL EMAIL
              </button>
            </div>
          </div>
        ) : view === 'form' ? (
          /* FORM VIEW */
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-500">
            
            {/* NAME & CONTACT */}
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                <User size={14} className="text-maroon-700"/> Lancer Identity
              </h3>
              <input 
                type="text" placeholder="First and Last Name" required
                className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-yellow-400 transition" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input 
                type="text" placeholder="Email or Phone Number" required
                className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-yellow-400 transition" 
                value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>

            {/* CHOICE 1 */}
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 border-l-[8px] border-green-500 relative">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Choice #1 (Primary)</h3>
                <span className="text-green-600 font-black text-[9px] uppercase tracking-tighter">Capacity: 6 per date</span>
              </div>
              <input 
                type="text" placeholder="Event (ex: Soccer vs Foothills)" required
                className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-green-500 transition" 
                value={formData.choice1Event} onChange={e => setFormData({...formData, choice1Event: e.target.value})} />
              <div className="flex gap-2">
                <input type="date" required className="flex-1 bg-slate-50 p-4 rounded-xl ring-1 ring-slate-100 text-xs font-bold" 
                  value={formData.choice1Date} onChange={e => setFormData({...formData, choice1Date: e.target.value})} />
                <input type="time" required className="flex-1 bg-slate-50 p-4 rounded-xl ring-1 ring-slate-100 text-xs font-bold" 
                  value={formData.choice1Time} onChange={e => setFormData({...formData, choice1Time: e.target.value})} />
              </div>
            </div>

            {/* CHOICE 2 */}
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 border-l-[8px] border-orange-400 opacity-90">
              <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] px-1">Choice #2 (Backup)</h3>
              <input 
                type="text" placeholder="Backup Event Name" required
                className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-orange-400 transition" 
                value={formData.choice2Event} onChange={e => setFormData({...formData, choice2Event: e.target.value})} />
              <div className="flex gap-2">
                <input type="date" required className="flex-1 bg-slate-50 p-4 rounded-xl ring-1 ring-slate-100 text-xs font-bold" 
                  value={formData.choice2Date} onChange={e => setFormData({...formData, choice2Date: e.target.value})} />
                <input type="time" required className="flex-1 bg-slate-50 p-4 rounded-xl ring-1 ring-slate-100 text-xs font-bold" 
                  value={formData.choice2Time} onChange={e => setFormData({...formData, choice2Time: e.target.value})} />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-100 text-xs font-bold animate-pulse">
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-[#800000] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-maroon-900/30 flex items-center justify-center gap-3 active:scale-[0.98] transition disabled:opacity-50"
            >
              {isSaving ? 'UPDATING...' : 'Save Appointment'} <CheckCircle2 size={18}/>
            </button>
          </form>
        ) : (
          /* SCHEDULE VIEW */
          <div className="space-y-4 animate-in fade-in slide-in-from-left-6 duration-500">
            <div className="flex justify-between items-end mb-4 px-2">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Public Live</p>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Schedule</h2>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-black text-maroon-700 bg-white px-3 py-1.5 rounded-full shadow-sm border border-maroon-50">
                <Users size={12}/> {appointments.length} Seniors Joined
              </div>
            </div>

            {appointments.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center text-slate-400">
                <p className="text-sm font-bold uppercase tracking-widest">No lens signings yet</p>
              </div>
            ) : (
              appointments.map((app, i) => (
                <div key={i} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group active:scale-95 transition-transform">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#800000] text-yellow-400 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border-2 border-yellow-400/20">
                      {app.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 tracking-tight leading-none text-sm">{app.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{app.choice1Event}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-[#800000] flex items-center justify-end gap-1">
                      <Calendar size={12}/> {app.choice1Date.split('-').slice(1).join('/')}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 flex items-center justify-end gap-1">
                      <Clock size={10}/> {app.choice1Time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <footer className="px-10 py-4 text-center">
        <p className="text-[9px] text-slate-400 leading-tight uppercase tracking-tighter font-medium opacity-60">
          This project is exclusively for the Salpointe Catholic Class of 2025.
        </p>
      </footer>
    </div>
  );
}