import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { Calendar, Clock, User, Phone, MapPin, CheckCircle2, ChevronRight, LogOut, Camera } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('form'); // 'form' or 'schedule'
  const [formData, setFormData] = useState({
    name: '', contact: '',
    choice1Event: '', choice1Date: '', choice1Time: '',
    choice2Event: '', choice2Date: '', choice2Time: ''
  });
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchUserRecord(u.uid);
      setLoading(false);
    });
    const q = collection(db, "appointments");
    const unsubSnap = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(doc => doc.data()));
    });
    return () => { unsub(); unsubSnap(); };
  }, []);

  const fetchUserRecord = async (uid) => {
    const docRef = doc(db, "appointments", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) setFormData(docSnap.data());
  };

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, "appointments", user.uid), { ...formData, userId: user.uid });
    alert("✨ Schedule Updated!");
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-maroon-700 font-bold">LANCER LENS LOADING...</div>;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pb-24 shadow-2xl shadow-black/20">
      
      {/* HEADER */}
      <header className="bg-[#800000] text-white pt-12 pb-8 px-6 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-10 rounded-full -mr-10 -mt-10"></div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-tight">SENIOR<br/>LENS SIGNING</h1>
            <p className="text-maroon-100 text-sm mt-2 opacity-80 italic">Capture the moment, Class of '25</p>
          </div>
          {user && (
            <button onClick={logout} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {/* TABS */}
      <div className="flex px-6 -mt-6 relative z-20 gap-4">
        <button 
          onClick={() => setView('form')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm shadow-md transition-all ${view === 'form' ? 'bg-yellow-400 text-maroon-900 scale-105' : 'bg-white text-slate-400'}`}
        >
          My Booking
        </button>
        <button 
          onClick={() => setView('schedule')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm shadow-md transition-all ${view === 'schedule' ? 'bg-yellow-400 text-maroon-900 scale-105' : 'bg-white text-slate-400'}`}
        >
          Who's Signed Up?
        </button>
      </div>

      <main className="px-6 py-8 flex-1">
        {!user ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-maroon-100 rounded-full flex items-center justify-center mx-auto mb-6 text-[#800000]">
              <Camera size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Ready for your signing?</h2>
            <p className="text-slate-500 mb-8 px-4">Log in with your school email to pick your event and date.</p>
            <button onClick={login} className="w-full bg-[#800000] text-white py-4 rounded-2xl font-bold shadow-xl shadow-maroon-900/20 active:scale-95 transition">
              Sign in with Google
            </button>
          </div>
        ) : view === 'form' ? (
          /* FORM VIEW */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><User size={14}/> Essentials</h3>
              <input type="text" placeholder="Full Name" className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-400 transition" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="text" placeholder="Email or Phone" className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-yellow-400 transition" 
                value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4 border-l-[6px] border-green-500">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Primary Event</h3>
              <input type="text" placeholder="Event (ex: Varsity Soccer)" className="w-full bg-slate-50 p-4 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-green-500" 
                value={formData.choice1Event} onChange={e => setFormData({...formData, choice1Event: e.target.value})} />
              <div className="flex gap-2">
                <input type="date" className="flex-1 bg-slate-50 p-4 rounded-xl ring-1 ring-slate-200" 
                  value={formData.choice1Date} onChange={e => setFormData({...formData, choice1Date: e.target.value})} />
                <input type="time" className="flex-1 bg-slate-50 p-4 rounded-xl ring-1 ring-slate-200" 
                  value={formData.choice1Time} onChange={e => setFormData({...formData, choice1Time: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="w-full bg-[#800000] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-maroon-900/30 flex items-center justify-center gap-3 active:scale-[0.98] transition">
              SAVE APPOINTMENT <ChevronRight size={20}/>
            </button>
          </form>
        ) : (
          /* SCHEDULE VIEW */
          <div className="space-y-4">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1">Confirmed Sessions</p>
            {appointments.map((app, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold">{app.name.charAt(0)}</div>
                  <div>
                    <h4 className="font-bold text-slate-800">{app.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10}/> {app.choice1Event}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-maroon-700">{app.choice1Date}</p>
                  <p className="text-[10px] text-slate-400 uppercase">{app.choice1Time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER MESSAGE */}
      <footer className="px-8 py-4 bg-slate-100/50 text-center">
        <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tighter italic">
          Appointments can be any day this year. See your sports or theater schedule before booking.
        </p>
      </footer>
    </div>
  );
}