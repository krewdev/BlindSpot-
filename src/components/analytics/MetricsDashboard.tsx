'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts';
import { useGameStore } from '@/store/gameStore';
import { TrendingUp, Brain, Shield, Eye, MessageSquare, Coins, Target, Award, Zap } from 'lucide-react';

// ─── Mock history data seeded from current modelStats ────────────────────────

function generateHistory(current: number, label: string) {
  const history = [];
  const start = Math.max(50, current - 12);
  for (let i = 12; i >= 0; i--) {
    const pct = (12 - i) / 12;
    const noise = (Math.sin(i * 3.7) * 0.8);
    history.push({
      round: `R${13 - i}`,
      [label]: parseFloat((start + (current - start) * pct + noise).toFixed(2)),
    });
  }
  return history;
}

export function mergeHistory(visionMap: number, rlhfPref: number, captionAlign: number, securityDefense: number) {
  const v = generateHistory(visionMap, 'vision');
  const r = generateHistory(rlhfPref, 'rlhf');
  const c = generateHistory(captionAlign, 'caption');
  const s = generateHistory(securityDefense, 'security');
  return v.map((d, i) => ({
    round: d.round,
    vision: d.vision,
    rlhf: r[i].rlhf,
    caption: c[i].caption,
    security: s[i].security,
  }));
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {color: string; name: string; value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl text-xs font-mono">
      <p className="text-zinc-400 mb-2 font-bold">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-bold">{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl backdrop-blur hover:border-zinc-700 transition-colors group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{label}</span>
        <span className="text-lg font-black text-white tracking-tight truncate">{value}</span>
        {sub && <span className="text-[10px] text-zinc-600">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</h3>
      </div>
      {badge && (
        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Player Leaderboard ────────────────────────────────────────────────────

const MOCK_LEADERBOARD = [
  { rank: 1, handle: 'n3ur0_h4x', tokens: 14.22, accuracy: 97, mode: 'Vision', badge: '👁️', streak: 12 },
  { rank: 2, handle: 'phantom_x', tokens: 11.88, accuracy: 94, mode: 'Cyber Siege', badge: '🛡️', streak: 9 },
  { rank: 3, handle: 'blindspot_k', tokens: 9.45, accuracy: 91, mode: 'The Judge', badge: '⚖️', streak: 7 },
  { rank: 4, handle: 'caption_queen', tokens: 7.30, accuracy: 88, mode: 'Caption Clash', badge: '💬', streak: 5 },
  { rank: 5, handle: 'byte_ghost', tokens: 5.10, accuracy: 85, mode: 'Vision', badge: '👁️', streak: 3 },
  { rank: 6, handle: 'r3d_team_21', tokens: 4.88, accuracy: 82, mode: 'Cyber Siege', badge: '🛡️', streak: 2 },
  { rank: 7, handle: 'align_bot', tokens: 3.22, accuracy: 79, mode: 'Caption Clash', badge: '💬', streak: 1 },
];

function LeaderboardTable({ currentUsername }: { currentUsername?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      {/* Header */}
      <div className="grid grid-cols-[28px_1fr_80px_64px_60px] text-[9px] font-bold uppercase tracking-widest text-zinc-600 px-3 mb-1">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Tokens</span>
        <span className="text-right">Accuracy</span>
        <span className="text-right">Streak</span>
      </div>
      {MOCK_LEADERBOARD.map((p) => {
        const isMe = p.handle === currentUsername;
        return (
          <div
            key={p.rank}
            className={`grid grid-cols-[28px_1fr_80px_64px_60px] items-center px-3 py-2.5 rounded-xl text-xs transition-all
              ${isMe
                ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-200'
                : 'bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50'}
            `}
          >
            <span className={`font-black text-[11px] ${p.rank <= 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : p.rank}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{p.badge}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-zinc-200 font-mono truncate">{p.handle}{isMe ? ' (you)' : ''}</span>
                <span className="text-[9px] text-zinc-600 uppercase">{p.mode}</span>
              </div>
            </div>
            <span className="text-right font-bold text-amber-400 font-mono">{p.tokens.toFixed(2)}</span>
            <span className="text-right font-bold text-emerald-400">{p.accuracy}%</span>
            <span className="text-right font-bold text-zinc-400 text-[11px]">🔥{p.streak}x</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Consensus Gauge ───────────────────────────────────────────────────────

function ConsensusGaugeChart({ data }: { data: { name: string; value: number; fill: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadialBarChart
        cx="50%"
        cy="80%"
        innerRadius="40%"
        outerRadius="100%"
        startAngle={180}
        endAngle={0}
        data={data}
      >
        <RadialBar dataKey="value" background={{ fill: '#1c1c1f' }} cornerRadius={4} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-[10px] text-zinc-400 font-mono">{value}</span>
          )}
          wrapperStyle={{ fontSize: '10px' }}
        />
        <Tooltip
          formatter={(val) => [`${typeof val === 'number' ? val.toFixed(2) : val}%`]}
          contentStyle={{
            background: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#e4e4e7',
          }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────

export default function MetricsDashboard() {
  const { modelStats, earnedTokens, totalJudgments, judgeStreak, profile, modelStatsHistory } = useGameStore();

  const historyData = modelStatsHistory;

  const uav = Math.min(99.4, 45 + totalJudgments * 1.5 + judgeStreak * 2);
  const bdr = Math.min(99.1, 20 + totalJudgments * 0.8);
  const cdi = Math.min(98.7, 60 + judgeStreak * 4);
  const zsAdapt = Math.min(99.9, 30 + totalJudgments * 1.1);

  const cognitiveData = [
    { name: 'Alignment Velocity', value: uav, fill: '#818cf8' },
    { name: 'Blindspot Discovery', value: bdr, fill: '#34d399' },
    { name: 'Cognitive Divergence', value: cdi, fill: '#fbbf24' },
    { name: 'Zero-Shot Adapt', value: zsAdapt, fill: '#fb7185' },
  ];

  const throughput = totalJudgments > 0 ? (earnedTokens / (totalJudgments || 1)).toFixed(3) : '0.000';

  return (
    <div className="w-full flex flex-col gap-8 pb-12">

      {/* ─── Header Banner ───────────────────────────────────────────── */}
      <div className="relative p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-zinc-900/80 to-zinc-950 border border-indigo-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute w-64 h-64 rounded-full bg-indigo-500/10 blur-[80px] -top-20 -right-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-300">AI Training Analytics</h2>
            </div>
            <p className="text-xs text-zinc-500 max-w-sm">
              Tracking real-time cognitive transfer. Watch the AI learn from your human nuance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full animate-pulse">
              ● LIVE FINE-TUNING ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* ─── Top Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="Tokens Earned"
          value={`${earnedTokens.toFixed(2)} BLND`}
          sub="This session"
          color="bg-amber-500/10 text-amber-400 border border-amber-500/20"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Total Annotations"
          value={String(totalJudgments)}
          sub="Verified data points"
          color="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Tokens / Annotation"
          value={`${throughput} BLND`}
          sub="Cost efficiency"
          color="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Best Streak"
          value={`${judgeStreak}x 🔥`}
          sub="Consecutive consensus wins"
          color="bg-rose-500/10 text-rose-400 border border-rose-500/20"
        />
      </div>

      {/* ─── Model Accuracy Chart ──────────────────────────────────────── */}
      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur">
        <SectionHeader
          icon={<TrendingUp className="w-4 h-4" />}
          title="Model Fine-Tuning Accuracy Over Rounds"
          badge="LIVE"
        />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={historyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gVision" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRlhf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCaption" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gSecurity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="round" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[50, 100]} tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="vision" name="Vision mAP" stroke="#818cf8" strokeWidth={2} fill="url(#gVision)" dot={false} />
            <Area type="monotone" dataKey="rlhf" name="RLHF Pref" stroke="#fbbf24" strokeWidth={2} fill="url(#gRlhf)" dot={false} />
            <Area type="monotone" dataKey="caption" name="Caption Align" stroke="#34d399" strokeWidth={2} fill="url(#gCaption)" dot={false} />
            <Area type="monotone" dataKey="security" name="Sec. Defense" stroke="#fb7185" strokeWidth={2} fill="url(#gSecurity)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
          {[
            { label: 'Vision mAP', color: '#818cf8', val: modelStats.visionMap, icon: <Eye className="w-3 h-3" /> },
            { label: 'RLHF Pref', color: '#fbbf24', val: modelStats.rlhfPref, icon: <Brain className="w-3 h-3" /> },
            { label: 'Caption Align', color: '#34d399', val: modelStats.captionAlign, icon: <MessageSquare className="w-3 h-3" /> },
            { label: 'Sec. Defense', color: '#fb7185', val: modelStats.securityDefense, icon: <Shield className="w-3 h-3" /> },
          ].map(({ label, color, val, icon }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5" style={{ color }}>
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
              </div>
              <span className="text-[11px] font-black text-white">{val.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Two columns: Consensus Radar + Throughput Chart ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Cognitive Intelligence Gauge */}
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur">
          <SectionHeader
            icon={<Brain className="w-4 h-4" />}
            title="Cognitive Transfer Footprint"
          />
          <ConsensusGaugeChart data={cognitiveData} />
          <p className="text-[10px] text-zinc-600 text-center mt-2">
            Your multidimensional impact on the model&apos;s core intelligence.
          </p>
        </div>

        {/* Intelligence Evolution Metrics */}
        <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur flex flex-col gap-4">
          <SectionHeader
            icon={<Zap className="w-4 h-4" />}
            title="Intelligence Evolution Metrics"
          />
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              { label: 'Alignment Velocity', value: `${uav.toFixed(1)}%`, sub: 'Adoption of user nuance', color: 'text-indigo-400', bar: 'bg-indigo-500', pct: uav },
              { label: 'Blindspot Discovery', value: `${bdr.toFixed(1)}%`, sub: 'Novel edge-case rate', color: 'text-emerald-400', bar: 'bg-emerald-500', pct: bdr },
              { label: 'Cognitive Divergence', value: `${cdi.toFixed(1)}%`, sub: 'Human vs rigid logic', color: 'text-amber-400', bar: 'bg-amber-500', pct: cdi },
              { label: 'Zero-Shot Adapt', value: `${zsAdapt.toFixed(1)}%`, sub: 'Untrained task impact', color: 'text-rose-400', bar: 'bg-rose-500', pct: zsAdapt },
            ].map(({ label, value, sub, color, bar, pct }) => (
              <div key={label} className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">{label}</span>
                <span className={`text-xl font-black ${color}`}>{value}</span>
                <span className="text-[9px] text-zinc-600 leading-tight">{sub}</span>
                <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden mt-auto">
                  <div className={`${bar} h-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Leaderboard ─────────────────────────────────────────────── */}
      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur">
        <SectionHeader
          icon={<Award className="w-4 h-4" />}
          title="Global Annotator Leaderboard"
          badge="LIVE"
        />
        <LeaderboardTable currentUsername={profile?.username} />
        <p className="text-[10px] text-zinc-600 mt-4 text-center">
          Rankings update after every verified match. Earn more by achieving consensus.
        </p>
      </div>

      {/* ─── Dataset Export Hub ─────────────────────────────────────── */}
      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur">
        <SectionHeader
          icon={<Brain className="w-4 h-4" />}
          title="Dataset Export Hub"
        />
        <div className="flex flex-col gap-2">
          {[
            { id: 'VH-2024-001', type: 'Vision Hunt Labels', records: 1248, hash: 'SHA256:B9A3...E21F', status: 'VERIFIED', color: 'indigo' },
            { id: 'JD-2024-015', type: 'RLHF Preference Pairs', records: 892, hash: 'SHA256:F41C...9D02', status: 'VERIFIED', color: 'amber' },
            { id: 'CC-2024-007', type: 'Caption Alignment Pairs', records: 344, hash: 'SHA256:7E2B...A18C', status: 'PENDING', color: 'emerald' },
            { id: 'CS-2024-033', type: 'Cyber Siege Exploit Logs', records: 156, hash: 'SHA256:C99D...2F4A', status: 'VERIFIED', color: 'rose' },
          ].map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'VERIFIED' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200 font-mono">{item.id}</span>
                    <span className="text-[10px] text-zinc-500">{item.type}</span>
                  </div>
                  <span className="text-[9px] text-zinc-600 font-mono">{item.hash}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] text-zinc-500 font-mono">{item.records.toLocaleString()} records</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.status === 'VERIFIED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {item.status}
                </span>
                <a
                  href="https://solscan.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  View on-chain →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
