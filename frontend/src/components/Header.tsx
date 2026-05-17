'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="logo" onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
          SKILLNEST
        </div>
        <nav>
          <ul className="nav-links">
            <li><a href="#courses">Explore</a></li>
            <li><a href="#">My Learning</a></li>
            <li><a href="#">Instructor</a></li>
          </ul>
        </nav>
        <div className="auth-btns">
          {user ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
                Hi, {user.user_metadata.full_name || user.email}
              </span>
              <button onClick={handleLogout} className="btn" style={{ color: 'white', background: 'transparent', padding: '0.5rem 1rem' }}>
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => window.location.href = '/auth/login'} className="btn" style={{ color: 'white', background: 'transparent' }}>Log In</button>
              <button onClick={() => window.location.href = '/auth/signup'} className="btn btn-primary">Join Now</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
