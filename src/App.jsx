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
  Users
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
    // 1. Handle Redirect Result (Mobile Login)
    getRedirectResult(auth).catch((err) => {
      console.error(err);
      setError("Mobile login failed. Try again.");
    });

    // 2. Auth State Listener
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchUserRecord(u.uid);
      setLoading(false);
    });

    // 3. Live Data Listener (The Public Schedule)
    const q = collection(db, "appointments");
    const unsubSnap = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => doc.data());
      // Sort by date
      setAppointments(data.sort((a, b) => new Date(a.choice1Date) - new Date(b.choice1Date)));
    });

    return () => { unsubAuth(); unsubSnap(); };
  }, []);

  const fetchUserRecord = async (uid) => {
    const docRef = doc(db, "appointments", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setFormData(docSnap.data());
    }
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
  };

  const handleLogout = () => signOut(auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      // Logic: Check if Choice 1 is already full (Limit 6)
      const q = query(
        collection(db, "appointments"), 
        where("choice1Event", "==", formData.choice1Event),
        where("choice1Date", "==", formData.choice1Date)
      );
      
      const snapshot = await getDocs(q);
      
      // If 6+ people are there, and the current user isn't one of them yet
      const existingEntries = snapshot.docs.filter(d => d.id !== user.uid);
      if (existingEntries.length >= 6) {
        setError(`Choice #1 is full! That event/date already has 6 seniors signed up. Please try a different time or date.`);
        setIsSaving(false);
        return;
      }

      // Save/Update the record
      await setDoc(doc(db, "appointments", user.uid), {
        ...formData,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
      
      alert("Success! Your lens signing is scheduled.");
      setView('schedule'); // Switch to view the list
    } catch (err) {
      setError("Failed to save. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-bounce mb-4 text-[#800000]"><Camera size={48} /></div>
        <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Lancer Lens Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pb-12 shadow-2xl">
      
      {/* BRANDED HEADER */}
      <header className="bg-[#800000] text-white pt-12 pb-10 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-10 rounded-full -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-tight uppercase">Senior<br/>Lens Signing</h1>
            <p className="text-maroon-100 text-xs mt-2 opacity-90 font-medium">Lancer Project • Class of 2025</p>
          </div>
          {user && (
            <button onClick={handleLogout} className="p-2 bg-white/10 rounded-full border border-white/20">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="flex px-6 -mt-6 relative z-20 gap-3">
        <button 
          onClick={() => setView('form')}
          className={`flex-1 py-4 rounded-2xl font-bold text-sm shadow-xl transition-all duration-300 ${view === 'form' ? 'bg-yellow-400 text-maroon-900 scale-105' : 'bg-white text-slate-400'}`}
        >
          {user ? 'My Booking' : 'Sign In'}
        </button>
        <button 
          onClick={() => setView('schedule')}
          className={`flex-1 py-4 rounded-2xl font-bold text-sm shadow-xl transition-all duration-300 ${view === 'schedule' ? 'bg-yellow-400 text-maroon-900 scale-105' : 'bg-white text-slate-400'}`}
        >
          Schedule
        </button>
      </div>

      <main className="px-6 py-8 flex-1">
        {!user ? (
          /* LOGIN SCREEN */
          <div className="text-center py-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 text-left">
               <p className="text-slate-600 text-sm leading-relaxed mb-4">
                "Hey Seniors! Below is a list of questions that will help me schedule your lens signing appointment. You will have to put two possible events (including sports events, plays, shows, assemblies, or even just at lunch!) that you would want me to attend, as I might not be able to attend the first one. Please look at your schedule before you fill out the form. You can come back to change this anytime!"
              </p>
            </div>
            <button 
              onClick={handleLogin} 
              className="w-full bg-[#800000] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-maroon-900/20 flex items-center justify-center gap-3 active:scale-95 transition"
            >
              SIGN IN WITH GOOGLE
            </button>
          </div>
        ) : view === 'form' ? (
          /* THE BOOKING FORM */
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4">
            
            {/* NAME & CONTACT */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-maroon-700"/> Personal Info
              </h3>
              <input 
                type="text" placeholder="First and Last Name" required
                className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-400 transition" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input 
                type="text" placeholder="Email or Phone Number" required
                className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-400 transition" 
                value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>

            {/* CHOICE 1 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4 border-l-[6px] border-green-500">
              <div className="flex justify-between items-center">
                <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Choice #1 (Preferred)</h3>
                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase">Max 6 per date</span>
              </div>
              <input 
                type="text" placeholder="Event Name (ex: Soccer Game)" required
                className="w-full bg-slate-100 p-4 rounded-xl border-none focus:ring-2 focus:ring-green-500" 
                value={formData.choice1Event} onChange={e => setFormData({...formData, choice1Event: e.target.value})} />
              <div className="flex gap-2">
                <input type="date" required className="flex-1 bg-slate-100 p-4 rounded-xl text-sm" 
                  value={formData.choice1Date} onChange={e => setFormData({...formData, choice1Date: e.target.value})} />
                <input type="time" required className="flex-1 bg-slate-100 p-4 rounded-xl text-sm" 
                  value={formData.choice1Time} onChange={e => setFormData({...formData, choice1Time: e.target.value})} />
              </div>
            </div>

            {/* CHOICE 2 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4 border-l-[6px] border-orange-400 opacity-90">
              <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-orange-600">Choice #2 (Backup)</h3>
              <input 
                type="text" placeholder="Backup Event Name" required
                className="w-full bg-slate-100 p-4 rounded-xl border-none focus:ring-2 focus:ring-orange-400" 
                value={formData.choice2Event} onChange={e => setFormData({...formData, choice2Event: e.target.value})} />
              <div className="flex gap-2">
                <input type="date" required className="flex-1 bg-slate-100 p-4 rounded-xl text-sm" 
                  value={formData.choice2Date} onChange={e => setFormData({...formData, choice2Date: e.target.value})} />
                <input type="time" required className="flex-1 bg-slate-100 p-4 rounded-xl text-sm" 
                  value={formData.choice2Time} onChange={e => setFormData({...formData, choice2Time: e.target.value})} />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-100 text-sm font-medium animate-shake">
                <AlertTriangle size={20} /> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-[#800000] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-maroon-900/30 flex items-center justify-center gap-3 active:scale-[0.98] transition disabled:opacity-50"
            >
              {isSaving ? 'SAVING...' : 'UPDATE APPOINTMENT'} <CheckCircle2 size={20}/>
            </button>
          </form>
        ) : (
          /* THE PUBLIC SCHEDULE VIEW */
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex justify-between items-end mb-2 px-1">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Public Schedule</p>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Lens Calendar</h2>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border">
                <Users size={12}/> {appointments.length} Seniors
              </div>
            </div>

            {appointments.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center text-slate-400">
                <p>No appointments yet.</p>
              </div>
            ) : (
              appointments.map((app, i) => (
                <div key={i} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-maroon-50 text-[#800000] rounded-2xl flex items-center justify-center font-black text-lg border border-maroon-100">
                      {app.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-maroon-700 transition-colors">{app.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{app.choice1Event}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-black text-maroon-700 justify-end">
                      <Calendar size={12}/> {app.choice1Date.split('-').slice(1).join('/')}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase justify-end mt-1">
                      <Clock size={10}/> {app.choice1Time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* FIXED FOOTER MESSAGE */}
      <footer className="px-8 py-6 text-center">
        <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tighter italic max-w-[250px] mx-auto">
          Appointments can be scheduled any day this year. Check your theater/sports schedule before booking.
        </p>
      </footer>
    </div>
  );
}