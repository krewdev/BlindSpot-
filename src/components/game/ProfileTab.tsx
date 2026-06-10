'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AchievementBadgeId, Profile } from '@/lib/types';
import { useWallet } from '@solana/wallet-adapter-react';import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  User, 
  Wallet, 
  Award, 
  FileText, 
  Edit3, 
  Check, 
  X, 
  LogOut, 
  ExternalLink,
 
  Calendar,
  Layers,
  Sparkles,
  Search
} from 'lucide-react';

const BADGE_DEFS = [
  {
    id: 'SHARP_EYE' as AchievementBadgeId,
    name: 'SHARP EYE',
    desc: 'Verify a blindspot or complete 2 Vision Hunt duels.',
    icon: '👁️',
    color: 'from-indigo-500 to-cyan-500',
    glow: 'shadow-indigo-500/20'
  },
  {
    id: 'CONSENSUS_KING' as AchievementBadgeId,
    name: 'CONSENSUS KING',
    desc: 'Reach a consensus judgment streak of 3 in The Judge.',
    icon: '⚖️',
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20'
  },
  {
    id: 'HACKER_PRO' as AchievementBadgeId,
    name: '1337 H4X0R',
    desc: 'Compromise target database and retrieve flag.txt in Cyber Siege.',
    icon: '🛡️',
    color: 'from-rose-500 to-pink-500',
    glow: 'shadow-rose-500/20'
  },
  {
    id: 'DATA_TYCOON' as AchievementBadgeId,
    name: 'DATA MACHINE',
    desc: 'Complete 5 verified annotations across any training mode.',
    icon: '🤖',
    color: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/20'
  },
  {
    id: 'SOL_VALIDATOR' as AchievementBadgeId,
    name: 'SOLANA VALIDATOR',
    desc: 'Accumulate 2.00 BLND tokens in your training wallet.',
    icon: '💎',
    color: 'from-violet-500 to-fuchsia-500',
    glow: 'shadow-violet-500/20'
  }
];

export default function ProfileTab() {
  const { profile, earnedTokens, matchHistory, updateUsername, connectWallet, logout } = useGameStore();
  const { publicKey, connected } = useWallet();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username || '');

  // Auto-sync wallet address on connection
  useEffect(() => {
    if (connected && publicKey) {
      const addr = publicKey.toBase58();
      if (profile && profile.wallet_address !== addr) {
        connectWallet(addr);
      }
    }
  }, [connected, publicKey, profile, connectWallet]);

  if (!profile) return null;

  const handleSaveUsername = () => {
    if (newUsername.trim()) {
      updateUsername(newUsername.trim());
      setIsEditingUsername(false);
    }
  };

  const unlockedBadges = profile.badges || [];

  return (
    <div className="w-full flex flex-col gap-8 pb-12">
      
      {/* ─── Profile Header Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-2 p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -top-10 -right-10 pointer-events-none" />
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">PLAYER IDENTIFICATION</h3>
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition-all uppercase tracking-wider"
              >
                <LogOut className="w-3 h-3" />
                SIGN OUT
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 border border-indigo-500/20 flex items-center justify-center text-white text-3xl font-black relative shrink-0 shadow-lg shadow-indigo-500/10">
                {profile.username ? profile.username.substring(0, 2).toUpperCase() : 'GS'}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border border-zinc-900 animate-pulse" />
              </div>

              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  {isEditingUsername ? (
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 text-sm font-bold text-white px-2.5 py-1 rounded-xl outline-none focus:border-indigo-500"
                        maxLength={18}
                        autoFocus
                      />
                      <button 
                        onClick={handleSaveUsername}
                        className="p-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setNewUsername(profile.username || '');
                          setIsEditingUsername(false);
                        }}
                        className="p-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/name">
                      <span className="text-xl font-black text-white font-mono tracking-tight truncate">
                        {profile.username || 'Anonymous Hunter'}
                      </span>
                      <button 
                        onClick={() => setIsEditingUsername(true)}
                        className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined: {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    Annotations completed: {profile.matches_played}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">SOLANA WALLET CONNECTION</span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wallet className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-zinc-500 uppercase font-black">WALLET STATUS</span>
                    <span className="text-xs text-zinc-300 font-mono truncate">
                      {connected && publicKey ? publicKey.toBase58() : 'No external wallet connected'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <WalletMultiButton className="!bg-gradient-to-r !from-indigo-600 !to-violet-600 hover:!from-indigo-500 hover:!to-violet-500 hover:!scale-[1.02] !transition-all !h-10 !rounded-xl !text-xs !font-bold !font-sans !shadow-lg !shadow-indigo-500/15" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reputation and Token Summary */}
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur flex flex-col justify-between relative overflow-hidden">
          <div className="absolute w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full -bottom-10 -left-10 pointer-events-none" />
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">CREDENTIAL REPUTATION</h3>
            </div>

            <div className="flex flex-col items-center justify-center py-4 relative">
              <div className="w-28 h-28 rounded-full border-4 border-zinc-800 flex items-center justify-center relative">
                {/* SVG Ring representation of reputation score */}
                <svg className="w-full h-full transform -rotate-90 absolute">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    strokeWidth="4"
                    stroke="#10b981"
                    fill="transparent"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * profile.reputation_score) / 100}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black text-white leading-none">{profile.reputation_score}%</span>
                  <span className="text-[9px] text-zinc-500 uppercase font-black tracking-wider mt-1">Rep Score</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-6 pt-6 border-t border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">Wallet balance:</span>
              <span className="font-mono font-black text-amber-400">{earnedTokens.toFixed(4)} BLND</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500">Verification Rank:</span>
              <span className="font-bold text-zinc-200">
                {profile.reputation_score >= 80 ? '👑 Elite Labeler' : profile.reputation_score >= 60 ? '⚡ Core Annotator' : '🌱 Rookie Agent'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Achievements Badges Grid ─────────────────────────────────── */}
      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">ACHIEVEMENT BADGES</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {BADGE_DEFS.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            return (
              <div 
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all duration-300 relative group/badge flex flex-col items-center text-center gap-2.5 overflow-hidden
                  ${isUnlocked 
                    ? `bg-zinc-900/70 border-zinc-700/60 shadow-xl ${badge.glow} scale-[1.01]` 
                    : 'bg-zinc-950/20 border-zinc-800/40 opacity-40 hover:opacity-60'}
                `}
              >
                {/* Glowing gradient background for unlocked badges */}
                {isUnlocked && (
                  <div className={`absolute inset-0 bg-gradient-to-tr ${badge.color} opacity-[0.03] group-hover/badge:opacity-[0.06] transition-opacity`} />
                )}

                <span className={`text-4xl transition-transform duration-300 ${isUnlocked ? 'scale-100 group-hover/badge:scale-110' : 'scale-90 grayscale'}`}>
                  {badge.icon}
                </span>

                <div className="flex flex-col gap-0.5">
                  <span className={`text-[10px] font-black tracking-wider uppercase font-mono ${isUnlocked ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    {badge.name}
                  </span>
                  <span className="text-[9px] text-zinc-500 leading-tight max-w-[120px] mx-auto mt-0.5">
                    {badge.desc}
                  </span>
                </div>

                {/* Status indicator */}
                <div className="mt-auto pt-2 w-full flex items-center justify-center">
                  {isUnlocked ? (
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r ${badge.color} text-white`}>
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-zinc-600 uppercase px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-950">
                      LOCKED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Match History Terminal Log ─────────────────────────────── */}
      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">VERIFIED DATA ANNOTATION MATCH LOGS</h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
            {matchHistory.length} ENTRIES
          </span>
        </div>

        {matchHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-950/40 border border-zinc-900/80 rounded-2xl">
            <Search className="w-8 h-8 text-zinc-700 mb-3 animate-pulse" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">No matching duels recorded yet</p>
            <p className="text-[10px] text-zinc-500 max-w-xs mt-1.5 leading-relaxed">
              Complete any labeling queue (Vision Hunt, The Judge, Caption Clash, Cyber Siege) to commit verified data to the ledger and log transaction details.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 font-mono">
            {/* Header */}
            <div className="grid grid-cols-[80px_1fr_90px_60px_80px_110px] gap-2 px-4 py-2 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-wider">
              <span>Timestamp</span>
              <span>Game Mode</span>
              <span>Role / Spec</span>
              <span className="text-right">Score</span>
              <span className="text-right">Earnings</span>
              <span className="text-right">Proof Signature</span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1">
              {[...matchHistory].reverse().map((entry) => {
                let badgeColor = 'bg-zinc-800 text-zinc-400';
                if (entry.gameMode === 'vision_hunt') badgeColor = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
                if (entry.gameMode === 'the_judge') badgeColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                if (entry.gameMode === 'caption_clash') badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                if (entry.gameMode === 'bug_bounty') badgeColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

                return (
                  <div 
                    key={entry.id}
                    className="grid grid-cols-[80px_1fr_90px_60px_80px_110px] gap-2 px-4 py-3 bg-zinc-950/70 border border-zinc-900 rounded-xl items-center text-xs hover:border-zinc-800 hover:bg-zinc-900/30 transition-all group"
                  >
                    <span className="text-[10px] text-zinc-500">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {entry.gameMode.replace('_', ' ')}
                      </span>
                    </div>

                    <span className="text-zinc-300 truncate font-semibold text-[11px]">{entry.role}</span>

                    <span className={`text-right font-bold text-[11px] ${entry.score === 100 ? 'text-emerald-400' : entry.score >= 50 ? 'text-zinc-300' : 'text-rose-400'}`}>
                      {entry.score}/100
                    </span>

                    <span className="text-right font-black text-amber-400 text-[11px]">
                      {entry.tokensEarned > 0 ? `+${entry.tokensEarned.toFixed(4)}` : '0.0000'} BLND
                    </span>

                    <div className="flex justify-end items-center gap-1">
                      <span className="text-[10px] text-zinc-500 truncate select-all">{entry.txSig}</span>
                      <a 
                        href={`https://solscan.io/tx/${entry.txSig}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-600 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Inspect on Solscan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
