'use client';

import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useGameStore } from '@/store/gameStore';
import { Target, Mail, Lock, Loader2 } from 'lucide-react';

export default function AuthModal({ onLogin }: { onLogin: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setProfile = useGameStore((state) => state.setProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        // In a real app we'd wait for email confirmation.
        // For prototype, we assume auto-confirm or test accounts.
      }
      onLogin();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const randomHex = Math.random().toString(36).substring(2, 9);
    const guestProfile = {
      id: `guest-${randomHex}`,
      username: `Guest#${randomHex.substring(0, 4).toUpperCase()}`,
      wallet_address: `GuestWallet_${randomHex}`,
      reputation_score: 50,
      matches_played: 0,
      created_at: new Date().toISOString()
    };
    setProfile(guestProfile);
    onLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full -top-10 -right-10 pointer-events-none" />
        
        <div className="flex flex-col items-center mb-6 relative z-10">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-4">
            <Target className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black tracking-widest text-white uppercase">
            BLINDSPOT
          </h2>
          <p className="text-sm text-zinc-400 mt-2 text-center">
            {isLogin ? 'Welcome back, Hunter.' : 'Join the Universal AI Training Arena.'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed relative z-10">
            ⚠️ <strong>Sandbox Mode:</strong> Database connection is offline. Please use the Guest login below to play locally.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="email" 
                value={email}
                disabled={!isSupabaseConfigured}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 disabled:opacity-40 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="player@example.com"
                required={isSupabaseConfigured}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="password" 
                value={password}
                disabled={!isSupabaseConfigured}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 disabled:opacity-40 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="••••••••"
                required={isSupabaseConfigured}
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !isSupabaseConfigured}
            className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'ENTER ARENA' : 'CREATE ACCOUNT')}
          </button>

          <div className="flex items-center gap-3 my-1 justify-center">
            <span className="h-[1px] flex-1 bg-zinc-800" />
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">or</span>
            <span className="h-[1px] flex-1 bg-zinc-800" />
          </div>

          <button 
            type="button" 
            onClick={handleGuestLogin}
            className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            PLAY AS GUEST (SANDBOX)
          </button>
        </form>

        <div className="mt-4 text-center relative z-10">
          <button 
            onClick={() => isSupabaseConfigured && setIsLogin(!isLogin)}
            disabled={!isSupabaseConfigured}
            className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
