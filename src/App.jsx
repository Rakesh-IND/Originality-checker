import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Compare from './pages/Compare';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="bg-glow bg-blue-500 w-[500px] h-[500px] top-[-100px] left-[-100px]"></div>
        <div className="bg-glow bg-purple-600 w-[600px] h-[600px] bottom-[-200px] right-[-100px]"></div>
        <div className="bg-glow bg-pink-500 w-[300px] h-[300px] top-[40%] left-[30%] opacity-20"></div>
      </div>
      
      <Toaster theme="dark" position="top-right" richColors />
      
      <Routes>
        <Route 
          path="/" 
          element={!session ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={session ? <Dashboard session={session} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/compare/:id" 
          element={session ? <Compare session={session} /> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
