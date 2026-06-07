'use client';

import React, { useState } from 'react';
import { Trophy, Medal, Eye, Scale, Bug, Coins, Sparkles } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  wallet: string;
  metricLabel: string;
  metricValue: string;
  tokens: number;
}

const TOP_HUNTERS: LeaderboardEntry[] = [
  { rank: 1, username: 'pixel_tracker', wallet: 'Fh9A...xP2q', metricLabel: 'IOU Alignment', metricValue: '96.8%', tokens: 1450.50 },
  { rank: 2, username: 'sol_labeler', wallet: '8xKy...mN1t', metricLabel: 'IOU Alignment', metricValue: '94.2%', tokens: 1120.20 },
  { rank: 3, username: 'vision_beast', wallet: 'G7uD...4Zks', metricLabel: 'IOU Alignment', metricValue: '93.5%', tokens: 980.00 },
  { rank: 4, username: 'hunter_x', wallet: '3pQr...T8vW', metricLabel: 'IOU Alignment', metricValue: '91.0%', tokens: 750.40 },
  { rank: 5, username: 'cuda_flow', wallet: 'HjKs...B2nM', metricLabel: 'IOU Alignment', metricValue: '89.7%', tokens: 620.10 },
];

const TOP_JUDGES: LeaderboardEntry[] = [
  { rank: 1, username: 'ai_whisperer', wallet: 'Dp7w...zL4v', metricLabel: 'Max RLHF Streak', metricValue: '42x', tokens: 1820.00 },
  { rank: 2, username: 'rlhf_guru', wallet: 'Kq8y...aM9p', metricLabel: 'Max RLHF Streak', metricValue: '35x', tokens: 1540.30 },
  { rank: 3, username: 'oracle_net', wallet: 'Jn2v...fX5t', metricLabel: 'Max RLHF Streak', metricValue: '28x', tokens: 1200.50 },
  { rank: 4, username: 'prompt_squire', wallet: 'L3kM...P7sT', metricLabel: 'Max RLHF Streak', metricValue: '22x', tokens: 890.00 },
  { rank: 5, username: 'bias_buster', wallet: 'R9xW...V2kB', metricLabel: 'Max RLHF Streak', metricValue: '19x', tokens: 710.20 },
];

const TOP_HACKERS: LeaderboardEntry[] = [
  { rank: 1, username: 'cyber_pawn', wallet: 'Wq9s...8XmP', metricLabel: 'CTFs Solved', metricValue: '58', tokens: 2450.80 },
  { rank: 2, username: 'null_pointer', wallet: 'Bv7n...2ZsK', metricLabel: 'CTFs Solved', metricValue: '51', tokens: 2100.40 },
  { rank: 3, username: 'solana_sec', wallet: 'T5xZ...9YqR', metricLabel: 'CTFs Solved', metricValue: '46', tokens: 1750.00 },
  { rank: 4, username: 'sudo_su', wallet: 'P2mL...5KfD', metricLabel: 'CTFs Solved', metricValue: '39', tokens: 1420.30 },
  { rank: 5, username: 'exploit_dev', wallet: 'Z9pB...3RtW', metricLabel: 'CTFs Solved', metricValue: '33', tokens: 1190.50 },
];

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'hunters' | 'judges' | 'hackers'>('hunters');

  const getEntries = () => {
    switch (activeTab) {
      case 'hunters': return TOP_HUNTERS;
      case 'judges': return TOP_JUDGES;
      case 'hackers': return TOP_HACKERS;
    }
  };

  const getTabStyles = (tab: 'hunters' | 'judges' | 'hackers') => {
    if (activeTab !== tab) {
      return 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300';
    }
    switch (tab) {
      case 'hunters': return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.07)]';
      case 'judges': return 'border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.07)]';
      case 'hackers': return 'border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.07)]';
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy size={10} className="fill-amber-400/20" />
          </div>
        );
      case 2:
        return (
          <div className="w-5 h-5 rounded-full bg-zinc-300/20 border border-zinc-300/30 flex items-center justify-center text-zinc-300">
            <Medal size={10} />
          </div>
        );
      case 3:
        return (
          <div className="w-5 h-5 rounded-full bg-amber-700/20 border border-amber-700/30 flex items-center justify-center text-amber-600">
            <Medal size={10} />
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 text-[9px] font-bold">
            {rank}
          </div>
        );
    }
  };

  return (
    <div className="w-full p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl backdrop-blur shadow-2xl relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute w-64 h-64 rounded-full bg-indigo-500/5 blur-[80px] -top-12 -left-12 z-0" />
      <div className="absolute w-64 h-64 rounded-full bg-rose-500/5 blur-[80px] -bottom-12 -right-12 z-0" />

      {/* Header */}
      <div className="z-10 relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
              Arena Leaderboard
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-zinc-500">Global training consensus rankings and token bounty distribution.</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('hunters')}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all duration-300 flex items-center gap-1.5 ${getTabStyles('hunters')}`}
          >
            <Eye size={12} />
            Hunters
          </button>
          <button
            onClick={() => setActiveTab('judges')}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all duration-300 flex items-center gap-1.5 ${getTabStyles('judges')}`}
          >
            <Scale size={12} />
            Judges
          </button>
          <button
            onClick={() => setActiveTab('hackers')}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all duration-300 flex items-center gap-1.5 ${getTabStyles('hackers')}`}
          >
            <Bug size={12} />
            Hackers
          </button>
        </div>
      </div>

      {/* Leaderboard Table List */}
      <div className="z-10 relative flex flex-col gap-2">
        {/* Table Headings */}
        <div className="flex items-center px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-900 font-mono">
          <span className="w-10">Rank</span>
          <span className="flex-1">Annotator</span>
          <span className="w-28 text-right">Specialization</span>
          <span className="w-24 text-right">Bounties</span>
        </div>

        {/* Table Rows */}
        <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
          {getEntries().map((entry) => (
            <div
              key={entry.rank}
              className="flex items-center px-4 py-3 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 transition-all duration-300 hover:bg-zinc-900/10 group"
            >
              {/* Rank Badge */}
              <div className="w-10 flex items-center">
                {getRankBadge(entry.rank)}
              </div>

              {/* User Identity */}
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">{entry.username}</span>
                <span className="text-[9px] text-zinc-500 font-mono select-all uppercase">{entry.wallet}</span>
              </div>

              {/* Specialization / Metric */}
              <div className="w-28 flex flex-col items-end gap-0.5">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">{entry.metricLabel}</span>
                <span className="text-xs font-mono font-bold text-zinc-300">{entry.metricValue}</span>
              </div>

              {/* Tokens Earned */}
              <div className="w-24 flex items-center justify-end gap-1.5">
                <Coins size={12} className="text-zinc-500 group-hover:text-amber-400 transition-colors" />
                <span className="text-xs font-mono font-extrabold text-zinc-200 group-hover:text-amber-400 transition-colors">
                  {entry.tokens.toFixed(2)}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 font-sans">BLND</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
