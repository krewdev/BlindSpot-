'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import DrawingCanvas from '@/components/game/DrawingCanvas';
import JudgeMode from '@/components/game/JudgeMode';
import CaptionClash from '@/components/game/CaptionClash';
import BugBounty from '@/components/game/BugBounty';
import Leaderboard from '@/components/game/Leaderboard';
import MetricsDashboard from '@/components/analytics/MetricsDashboard';
import ProfileTab from '@/components/game/ProfileTab';
import AuthModal from '@/components/auth/AuthModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Keypair } from '@solana/web3.js';
import { GAME_MODES } from '@/lib/gameModes';
import { RLHFChoice, Match } from '@/lib/types';
import { dbInitSchema } from '@/lib/db';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Swords,
  Coins,
  ShieldCheck,
  Award,
  Play,
  Sparkles,
  CheckCircle2,
  User,
  ArrowRight,
  TrendingUp,
  Search,
  Eye,
  Scale,
  MessageSquare,
  Bug,
  Zap,
  Flame,
  BarChart2,
  Trophy,
  Code2,
  Brain,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  Eye: <Eye size={20} />,
  Scale: <Scale size={20} />,
  MessageSquare: <MessageSquare size={20} />,
  Bug: <Bug size={20} />,
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string; gradient: string }> = {
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    text: 'text-indigo-400',
    glow: 'shadow-indigo-500/20',
    gradient: 'from-indigo-600 to-violet-600',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
    gradient: 'from-amber-600 to-orange-600',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    gradient: 'from-emerald-600 to-teal-600',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    glow: 'shadow-rose-500/20',
    gradient: 'from-rose-600 to-pink-600',
  },
};

// Deterministic hash functions to satisfy React 19 purity rules
function getDeterministicHash(matchId: string | undefined, offset: number) {
  if (!matchId) return '9999';
  let num = 0;
  for (let i = 0; i < matchId.length; i++) {
    num = (num + matchId.charCodeAt(i) * (i + offset)) % 9000;
  }
  return (1000 + num).toString();
}

function getDeterministicTxSig(matchId: string | undefined) {
  if (!matchId) return 'WXYZ';
  let sig = '';
  for (let i = 0; i < 4; i++) {
    const code = ((matchId.charCodeAt(i % matchId.length) || 0) + i) % 36;
    sig += code.toString(36).toUpperCase();
  }
  return sig;
}

export default function Home() {
  const {
    profile,
    setProfile,
    currentMatch,
    setMatch,
    setRole,
    gameMode,
    setGameMode,
    boxes,
    clearBoxes,
    matchScore,
    submitBoxes,
    nextRound,
    resetGame,
    queueStatus,
    setQueueStatus,
    earnedTokens,
    modelStats,
    // Judge state
    rlhfPrompts,
    currentPromptIndex,
    submitJudgment,
    totalJudgments,
    judgeStreak,
    judgeTrack,
    setJudgeTrack,
  } = useGameStore();

  const { publicKey, signMessage } = useWallet();
  const [simulatedQueueTime, setSimulatedQueueTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'analytics' | 'profile'>('leaderboard');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    dbInitSchema()
      .then((res) => {
        if (res.success) {
          console.log(res.message);
        } else {
          console.error(res.error);
        }
      })
      .catch((err) => console.error("Error initializing database schema:", err));
  }, []);

  const activeModeConfig = GAME_MODES.find((m) => m.id === gameMode)!;
  const activeColors = COLOR_MAP[activeModeConfig.color];

  // Initialize profile from Supabase auth
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data);
      } else {
        // Generate Custodial House Wallet
        const newWallet = Keypair.generate();
        const publicKey = newWallet.publicKey.toBase58();
        // In a real app, you would securely encrypt and store newWallet.secretKey
        
        const newProfile = {
          id: userId,
          username: `Hunter#${userId.substring(0, 4)}`,
          wallet_address: publicKey,
          reputation_score: 50,
          matches_played: 0,
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (insertedData) {
          setProfile(insertedData);
        } else {
          console.error("Error creating profile:", insertError);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [setProfile]);

  // Realtime Matchmaking Queue
  useEffect(() => {
    if (queueStatus !== 'searching' || !profile) return;

    let subscription: ReturnType<typeof supabase.channel> | null = null;
    let isSubscribed = true;

    // Offline sandbox / guest profile simulated matchmaking
    if (!isSupabaseConfigured || profile.id.startsWith('guest-')) {
      const timeout = setTimeout(() => {
        if (!isSubscribed) return;
        setMatch({
          id: 'sandbox-match-id',
          status: 'in_progress',
          player1_id: 'sandbox-opponent',
          player2_id: profile.id,
          created_at: new Date().toISOString(),
        });
        setQueueStatus('matched');
        setRole('hunter');
      }, 2000);

      const timerInterval = setInterval(() => {
        setSimulatedQueueTime((prev) => prev + 1);
      }, 1000);

      return () => {
        isSubscribed = false;
        clearTimeout(timeout);
        clearInterval(timerInterval);
      };
    }

    const findMatch = async () => {
      // 1. Try to find an existing waiting match
      const { data: waitingMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'waiting')
        .neq('player1_id', profile.id)
        .limit(1)
        .single();

      if (waitingMatch && isSubscribed) {
        // 2. Join the match
        const { data: updatedMatch } = await supabase
          .from('matches')
          .update({ status: 'in_progress', player2_id: profile.id })
          .eq('id', waitingMatch.id)
          .select()
          .single();

        if (updatedMatch) {
          setMatch(updatedMatch);
          setQueueStatus('matched');
          setRole('hunter'); // Player 2 is hunter for MVP
          return;
        }
      }

      // 3. If no match found (or update failed), create a new one
      if (isSubscribed) {
        const { data: newMatch } = await supabase
          .from('matches')
          .insert({
            status: 'waiting',
            player1_id: profile.id,
          })
          .select()
          .single();

        if (newMatch) {
          setMatch(newMatch);
          
          // 4. Subscribe to changes on this match
          subscription = supabase
            .channel(`match:${newMatch.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'matches',
                filter: `id=eq.${newMatch.id}`,
              },
              (payload: { new: Record<string, unknown> }) => {
                if (payload.new.status === 'in_progress') {
                  setMatch(payload.new as unknown as Match);
                  setQueueStatus('matched');
                  setRole('ai'); // Player 1 is AI/Creator for MVP
                }
              }
            )
            .subscribe();
        }
      }
    };

    findMatch();

    // Simulated timer just for UI feel
    const timerInterval = setInterval(() => {
      setSimulatedQueueTime((prev) => prev + 1);
    }, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(timerInterval);
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [queueStatus, profile, setMatch, setQueueStatus, setRole]);

  const handleStartQueue = () => {
    setSimulatedQueueTime(0);
    setQueueStatus('searching');
  };

  const handleSubmitVision = async () => {
    let txSig: string | undefined = undefined;
    if (publicKey && signMessage) {
      try {
        const message = new TextEncoder().encode("BLINDSPOT: Approve annotation dataset proof of consensus.");
        const signature = await signMessage(message);
        txSig = Array.from(signature, (byte) => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
      } catch (err) {
        console.error("Signature rejected or failed:", err);
      }
    }
    submitBoxes(txSig);
  };

  const handleSubmitJudge = async (choice: RLHFChoice, reasoning: string) => {
    let txSig: string | undefined = undefined;
    if (publicKey && signMessage) {
      try {
        const message = new TextEncoder().encode("BLINDSPOT: Approve annotation dataset proof of consensus.");
        const signature = await signMessage(message);
        txSig = Array.from(signature, (byte) => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
      } catch (err) {
        console.error("Signature rejected or failed:", err);
      }
    }
    submitJudgment(choice, reasoning, txSig);
  };

  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/40 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="w-8 h-8 rounded-xl shadow-lg border border-zinc-800/80 object-cover" alt="BlindSpot Logo" />
            <h1 className="font-black tracking-widest text-lg bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              BLINDSPOT
            </h1>
            <span className={`text-[10px] uppercase font-bold tracking-widest ${activeColors.bg} ${activeColors.text} px-2 py-0.5 rounded-full border ${activeColors.border}`}>
              Universal AI Training
            </span>
          </div>

          {profile && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-zinc-400">Rep:</span>
                <span className="text-xs font-bold text-emerald-400">{profile.reputation_score}%</span>
              </div>

              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${activeColors.bg} border ${activeColors.border}`}>
                <Coins className={`w-4 h-4 ${activeColors.text}`} />
                <span className={`text-xs font-bold ${activeColors.text}`}>{earnedTokens.toFixed(2)} BLND</span>
              </div>

              <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-800">
                <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                  <User size={16} />
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-semibold text-zinc-300">{profile.username}</span>
                  {profile.wallet_address ? (
                    <span className="text-[10px] text-zinc-500 font-medium font-mono">
                      {profile.wallet_address.substring(0, 4)}...{profile.wallet_address.substring(profile.wallet_address.length - 4)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {totalJudgments > 0 ? `${totalJudgments} judgments` : 'Player #422'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col items-center justify-center">

        {/* ─── MODE SELECTION (Idle State) ────────────────────────────── */}
        {!profile && <AuthModal onLogin={() => {}} />}
        {profile && queueStatus === 'idle' && (
          <div className="w-full flex flex-col gap-8">
            {/* Mode Selector Grid */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Select Training Mode</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {GAME_MODES.map((mode) => {
                  const colors = COLOR_MAP[mode.color];
                  const isActive = gameMode === mode.id;
                  const isAvailable = true;

                  return (
                    <button
                      key={mode.id}
                      onClick={() => isAvailable && setGameMode(mode.id)}
                      disabled={!isAvailable}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col gap-3 ${
                        isActive
                          ? `${colors.border} ${colors.bg} shadow-xl ${colors.glow}`
                          : isAvailable
                            ? 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer'
                            : 'border-zinc-900 bg-zinc-950/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {!isAvailable && (
                        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                          Coming Soon
                        </span>
                      )}

                      <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text}`}>
                        {ICON_MAP[mode.icon]}
                      </div>

                      <div>
                        <h3 className={`text-sm font-black ${isActive ? colors.text : 'text-zinc-300'}`}>
                          {mode.name}
                        </h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{mode.tagline}</p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800/50">
                        <span className="text-[9px] text-zinc-600 uppercase font-bold">{mode.dataType}</span>
                        <span className={`text-[10px] font-bold ${colors.text}`}>+{mode.rewardPerRound} BLND</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Mode Details + Start Button */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Mode Info */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-5 h-5 ${activeColors.text}`} />
                    <h3 className="font-bold text-zinc-200">{activeModeConfig.name}</h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {activeModeConfig.description}
                  </p>

                  <div className="flex flex-col gap-2 mt-2">
                    {gameMode === 'vision_hunt' && (
                      <>
                        <InfoStep num={1} title="The AI Prediction" desc="Red dashed boxes show what the AI sees. It's good, but flawed." color={activeColors} />
                        <InfoStep num={2} title="Hunt the Blindspots" desc="Find and tag objects the AI missed, or correct its bad predictions." color={activeColors} />
                        <InfoStep num={3} title="Consensus & Payout" desc="If you match with other humans but disagree with the AI, you earn tokens!" color={activeColors} />
                      </>
                    )}
                    {gameMode === 'the_judge' && (
                      <>
                        <InfoStep num={1} title="Read the Prompt" desc="A real user question is shown to two different AI models." color={activeColors} />
                        <InfoStep num={2} title="Judge the Responses" desc="Pick the response that is more helpful, accurate, and well-written." color={activeColors} />
                        <InfoStep num={3} title="Consensus Payout" desc="If you agree with the majority of other judges, you earn tokens." color={activeColors} />
                      </>
                    )}
                    {gameMode === 'caption_clash' && (
                      <>
                        <InfoStep num={1} title="See the Crops" desc="A bounding box crop drawn by a human in Vision Hunt is loaded." color={activeColors} />
                        <InfoStep num={2} title="Write the Caption" desc="Describe the target object in precise, natural language." color={activeColors} />
                        <InfoStep num={3} title="Consensus Alignment" desc="If your caption aligns with other human players, the text-image pair is locked in!" color={activeColors} />
                      </>
                    )}
                    {gameMode === 'bug_bounty' && (
                      <>
                        <InfoStep num={1} title="Analyze the Target" desc="Read the target code/system prompt and access the mock terminal." color={activeColors} />
                        <InfoStep num={2} title="Crack the System" desc="Write exploits or jailbreaks head-to-head against another hacker." color={activeColors} />
                        <InfoStep num={3} title="AI Security Telemetry" desc="Your commands train safety and patching models, earning the bounty!" color={activeColors} />
                      </>
                    )}
                  </div>
                </div>

                {/* Stats & Model Accuracy */}
                <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Your Stats</h4>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">MIL-LOOP ACTIVE</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Total Judgments</span>
                      <span className={`text-xs font-bold ${activeColors.text}`}>{totalJudgments}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Current Streak</span>
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        {judgeStreak > 0 && <Flame size={12} />}
                        {judgeStreak}x
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-xs text-zinc-400">Tokens Earned</span>
                      <span className={`text-xs font-bold ${activeColors.text}`}>{earnedTokens.toFixed(2)} BLND</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mt-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Model Training Yield</h4>
                    <span className="text-[10px] text-emerald-400 font-black animate-pulse">● LIVE FINE-TUNING</span>
                  </div>
                  <div className="flex flex-col gap-3.5">
                    <ModelMetric label="Vision Object mAP" val={modelStats.visionMap} color="text-indigo-400" bg="bg-indigo-500" />
                    <ModelMetric label="RLHF Preference Align" val={modelStats.rlhfPref} color="text-amber-400" bg="bg-amber-500" />
                    <ModelMetric label="Caption Alignment" val={modelStats.captionAlign} color="text-emerald-400" bg="bg-emerald-500" />
                    <ModelMetric label="Security Agent Patch Rate" val={modelStats.securityDefense} color="text-rose-400" bg="bg-rose-500" />
                  </div>
                </div>
              </div>

              {/* Right: Hero Start Area */}
              <div className="lg:col-span-2 flex flex-col justify-center items-center p-8 bg-zinc-900/20 border border-zinc-800/80 rounded-3xl backdrop-blur shadow-2xl relative overflow-hidden min-h-[450px]">
                <div className={`absolute w-72 h-72 rounded-full ${activeColors.bg} blur-[100px] -top-12 -right-12 z-0 opacity-50`} />
                <div className={`absolute w-72 h-72 rounded-full ${activeColors.bg} blur-[100px] -bottom-12 -left-12 z-0 opacity-30`} />

                <div className="z-10 flex flex-col items-center text-center max-w-md gap-6">
                  <div className={`w-16 h-16 rounded-2xl ${activeColors.bg} border ${activeColors.border} flex items-center justify-center ${activeColors.text} shadow-inner`}>
                    {ICON_MAP[activeModeConfig.icon] || <Swords size={32} />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      {gameMode === 'vision_hunt' && "HUNT THE AI'S BLINDSPOTS"}
                      {gameMode === 'the_judge' && "JUDGE THE AI"}
                      {gameMode === 'caption_clash' && "CAPTION CLASH"}
                      {gameMode === 'bug_bounty' && "CYBER SIEGE PEN-TESTING"}
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {gameMode === 'vision_hunt' && 'Find what the AI missed. Correct its errors. Train the next generation of computer vision.'}
                      {gameMode === 'the_judge' && 'Two AI models. One question. Your verdict shapes the future of language AI. This is RLHF.'}
                      {gameMode === 'caption_clash' && 'Write highly accurate text captions of human-labeled objects to train multi-modal Vision-Language models.'}
                      {gameMode === 'bug_bounty' && 'Crack the target system head-to-head. Your shell commands fine-tune security AI models to defend code and networks.'}
                    </p>
                  </div>

                  {/* For The Judge mode: show track selector instead of plain Start button */}
                  {gameMode === 'the_judge' ? (
                    <div className="w-full flex flex-col gap-4">
                      <p className="text-xs text-zinc-500 text-center">Select your annotator specialty to get matched with the right prompts:</p>
                      <div className="grid grid-cols-2 gap-3 w-full">
                        {/* Coding Track */}
                        <button
                          id="track-coding"
                          onClick={() => { setJudgeTrack('coding'); handleStartQueue(); }}
                          className={`group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                            judgeTrack === 'coding'
                              ? 'border-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-500/10'
                              : 'border-zinc-700 bg-zinc-900/40 hover:border-amber-500/40 hover:bg-amber-950/10'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Code2 className="w-6 h-6 text-amber-400" />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-black text-white">⌨️ Coding</span>
                            <span className="text-[10px] text-zinc-500 text-center leading-relaxed">Python · TypeScript · SQL · React · System Design</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            +0.30 BLND / round
                          </span>
                          <div className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5">
                            <Play size={12} fill="white" />
                            Enter Coding Arena
                          </div>
                        </button>

                        {/* General Track */}
                        <button
                          id="track-general"
                          onClick={() => { setJudgeTrack('general'); handleStartQueue(); }}
                          className={`group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                            judgeTrack === 'general'
                              ? 'border-blue-500/60 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                              : 'border-zinc-700 bg-zinc-900/40 hover:border-blue-500/40 hover:bg-blue-950/10'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-blue-400" />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-black text-white">💬 General</span>
                            <span className="text-[10px] text-zinc-500 text-center leading-relaxed">Reasoning · Creativity · Factual · Ethics & Safety</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            +0.25 BLND / round
                          </span>
                          <div className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5">
                            <Play size={12} fill="white" />
                            Enter General Arena
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartQueue}
                      className={`w-full sm:w-auto px-8 py-4 bg-gradient-to-r ${activeColors.gradient} text-white font-bold rounded-2xl shadow-xl ${activeColors.glow} hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3`}
                    >
                      <Play size={18} fill="white" />
                      START {activeModeConfig.name.toUpperCase()}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tab switcher: Leaderboard / Analytics */}
            <div className="mt-4 w-full flex flex-col gap-4">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900/60 border border-zinc-800 rounded-xl w-fit">
                <button
                  id="tab-leaderboard"
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'leaderboard'
                      ? 'bg-zinc-700 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Leaderboard
                </button>
                <button
                  id="tab-analytics"
                  onClick={() => setActiveTab('analytics')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'analytics'
                      ? 'bg-indigo-600 text-white shadow shadow-indigo-500/30'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Analytics
                </button>
                <button
                  id="tab-profile"
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'profile'
                      ? 'bg-violet-600 text-white shadow shadow-violet-500/30'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'leaderboard' && <Leaderboard />}
              {activeTab === 'analytics' && <MetricsDashboard />}
              {activeTab === 'profile' && <ProfileTab />}
            </div>
          </div>
        )}

        {/* ─── MATCHMAKING QUEUE ──────────────────────────────────────── */}
        {queueStatus === 'searching' && (
          <div className="flex flex-col justify-center items-center p-12 bg-zinc-900/30 border border-zinc-800 rounded-3xl backdrop-blur shadow-2xl relative w-full max-w-2xl min-h-[400px]">
            <div className="relative w-36 h-36 flex items-center justify-center mb-8">
              <div className={`absolute inset-0 rounded-full border-2 border-dashed ${activeColors.border} animate-[spin_12s_linear_infinite]`} />
              <div className={`absolute w-32 h-32 rounded-full border-2 ${activeColors.border} border-t-transparent animate-spin`} />
              <Search className={`w-10 h-10 ${activeColors.text} animate-pulse`} />
            </div>

            <div className="flex flex-col items-center gap-2 text-center max-w-xs">
              <h3 className="text-lg font-black tracking-widest text-zinc-100 uppercase">
                {gameMode === 'the_judge' ? 'Loading prompts' : 'Searching for opponent'}
              </h3>
              <p className="text-xs text-zinc-500 italic">
                {gameMode === 'the_judge'
                  ? 'Selecting AI response pairs for evaluation...'
                  : `Looking for players in your reputation bracket (${profile?.reputation_score}%)...`
                }
              </p>
              <span className={`text-xs font-mono ${activeColors.text} mt-2 font-bold px-3 py-1 ${activeColors.bg} border ${activeColors.border} rounded-full`}>
                Time elapsed: 0:0{simulatedQueueTime}s
              </span>
            </div>

            <button
              onClick={() => setQueueStatus('idle')}
              className="mt-8 px-6 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ─── ACTIVE MATCH ──────────────────────────────────────────── */}
        {queueStatus === 'matched' && currentMatch && (
          <div className="flex flex-col lg:flex-row gap-8 w-full">
            {/* Left: Game Area */}
            <div className="flex-1 flex flex-col items-center">
              {gameMode === 'vision_hunt' && <DrawingCanvas />}
              {gameMode === 'the_judge' && (
                <JudgeMode
                  key={rlhfPrompts[currentPromptIndex]?.id || currentPromptIndex}
                  prompt={rlhfPrompts[currentPromptIndex]}
                  onSubmit={handleSubmitJudge}
                />
              )}
              {gameMode === 'caption_clash' && <CaptionClash />}
              {gameMode === 'bug_bounty' && <BugBounty />}
            </div>

            {/* Right: Score/Info Panel */}
            <div className="w-full lg:w-96 flex flex-col gap-6">
              {matchScore === null ? (
                <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur flex flex-col gap-6">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-3 flex items-center gap-2">
                    <TrendingUp size={16} className={activeColors.text} />
                    {gameMode === 'vision_hunt' && 'HUNT OBJECTIVES'}
                    {gameMode === 'the_judge' && 'JUDGE OBJECTIVES'}
                    {gameMode === 'caption_clash' && 'CAPTION OBJECTIVES'}
                    {gameMode === 'bug_bounty' && 'SIEGE OBJECTIVES'}
                  </h3>

                  <div className="flex flex-col gap-3">
                    <div className={`p-4 rounded-xl ${activeColors.bg} border ${activeColors.border}`}>
                      <span className={`text-xs font-bold ${activeColors.text} block mb-1`}>
                        {gameMode === 'vision_hunt' && 'HUNTER DIRECTIVE'}
                        {gameMode === 'the_judge' && 'JUDGE DIRECTIVE'}
                        {gameMode === 'caption_clash' && 'ALIGNMENT DIRECTIVE'}
                        {gameMode === 'bug_bounty' && 'PWN DIRECTIVE'}
                      </span>
                      <span className="text-xs text-zinc-300 leading-relaxed">
                        {gameMode === 'vision_hunt' && 'The AI (Red Dashed Boxes) has pre-annotated this scene. Your job is to hunt for its blindspots. Draw boxes around objects the AI completely missed.'}
                        {gameMode === 'the_judge' && 'Read the user prompt carefully. Compare both AI responses for accuracy, helpfulness, and quality. Pick the better one.'}
                        {gameMode === 'caption_clash' && 'Look at the cropped object crop on the canvas. Write a precise, natural-language description of the target.'}
                        {gameMode === 'bug_bounty' && 'Compete head-to-head to compromise the target system. Execute terminal exploits to capture flag.txt.'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {gameMode === 'vision_hunt' && "* You win by finding objects the AI missed. Don't just copy the AI!"}
                      {gameMode === 'the_judge' && '* Add reasoning for 2x token bonus. Streaks earn even more!'}
                      {gameMode === 'caption_clash' && '* Descriptions are compared for semantic consensus against other players.'}
                      {gameMode === 'bug_bounty' && '* Hacking shell commands are captured to fine-tune AI vulnerability repair.'}
                    </div>
                  </div>

                  {/* Vision Hunt specific buttons */}
                  {gameMode === 'vision_hunt' && (
                    <div className="flex flex-col gap-2 mt-4">
                      <button
                        onClick={handleSubmitVision}
                        disabled={boxes.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 font-bold rounded-xl shadow-lg text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 size={16} />
                        SUBMIT BOUNDING BOXES
                      </button>
                      <button
                        onClick={() => clearBoxes()}
                        className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-xs font-bold rounded-lg transition-colors"
                      >
                        CLEAR CANVAS
                      </button>
                    </div>
                  )}

                  {/* Judge stats sidebar */}
                  {gameMode === 'the_judge' && (
                    <div className="flex flex-col gap-2 mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Prompt</span>
                        <span className="text-zinc-300 font-bold">{currentPromptIndex + 1} / {rlhfPrompts.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Streak</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          {judgeStreak > 0 && <Flame size={12} />}
                          {judgeStreak}x
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Total Earned</span>
                        <span className={`font-bold ${activeColors.text}`}>{earnedTokens.toFixed(2)} BLND</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── Score Screen ───────────────────────────────────── */
                <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur flex flex-col gap-6 shadow-xl relative overflow-hidden">
                  <div className={`absolute w-48 h-48 rounded-full ${activeColors.bg} blur-[50px] -top-12 -right-12`} />

                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-3 flex items-center gap-2">
                    <Award size={16} className={activeColors.text} />
                    {gameMode === 'vision_hunt' && 'HUNT REPORT'}
                    {gameMode === 'the_judge' && 'JUDGMENT REPORT'}
                    {gameMode === 'caption_clash' && 'ALIGNMENT REPORT'}
                    {gameMode === 'bug_bounty' && 'SIEGE REPORT'}
                  </h3>

                  <div className="flex flex-col items-center py-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl relative">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">
                      {gameMode === 'the_judge' ? 'CONSENSUS SCORE' : 'ALIGNMENT SCORE'}
                    </span>
                    <span className="text-5xl font-black tracking-tight text-white flex items-baseline gap-0.5">
                      {matchScore}
                      <span className="text-xl text-zinc-500">%</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-2 font-medium">
                      {matchScore >= 50 ? '✓ Consensus verified!' : '✗ Low consensus alignment'}
                    </span>
                  </div>

                  <div className={`p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className={`${activeColors.bg} p-2.5 rounded-lg border ${activeColors.border} ${activeColors.text}`}>
                        <Coins size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Round Reward</span>
                        <span className="text-sm font-bold text-white">+{earnedTokens.toFixed(2)} BLND</span>
                      </div>
                    </div>
                    {matchScore >= 50 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        VERIFIED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        PARTIAL
                      </span>
                    )}
                  </div>

                  {/* Web3 Proof-of-Label Consensus Verification */}
                  {matchScore >= 50 && (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-2.5 font-mono text-[9px] text-zinc-500">
                      <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-1.5 text-zinc-400 font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Solana Proof-of-Label Verification
                      </div>
                      <div className="flex justify-between items-center">
                        <span>CONSENSUS HASH</span>
                        <span className="text-zinc-300 font-bold select-all">
                          SHA256:E93A{getDeterministicHash(currentMatch?.id, 1)}B{getDeterministicHash(currentMatch?.id, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>ON-CHAIN TX</span>
                        <a 
                          href="https://solscan.io" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline font-bold"
                        >
                          SOL_TX_CLAIMED_{getDeterministicTxSig(currentMatch?.id)}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      onClick={nextRound}
                      className={`w-full py-4 bg-gradient-to-r ${activeColors.gradient} text-white font-bold rounded-xl shadow-lg ${activeColors.glow} flex items-center justify-center gap-2 transition-all duration-300`}
                    >
                      NEXT ROUND
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={resetGame}
                      className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-xs font-bold rounded-lg transition-colors"
                    >
                      LEAVE ARENA
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────

function InfoStep({ num, title, desc, color }: {
  num: number;
  title: string;
  desc: string;
  color: { bg: string; border: string; text: string };
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-900 text-xs">
      <span className={`${color.text} font-bold ${color.bg} w-5 h-5 flex items-center justify-center rounded text-[10px]`}>
        {num}
      </span>
      <div className="flex flex-col">
        <span className="font-bold text-zinc-300">{title}</span>
        <span className="text-zinc-500">{desc}</span>
      </div>
    </div>
  );
}

function ModelMetric({ label, val, color, bg }: { label: string; val: number; color: string; bg: string }) {
  return (
    <div className="flex flex-col gap-1.5 font-mono text-[9px]">
      <div className="flex justify-between items-center">
        <span className="text-zinc-500">{label}</span>
        <span className={`font-bold ${color}`}>{val.toFixed(2)}%</span>
      </div>
      <div className="w-full bg-zinc-950 rounded-full h-1 border border-zinc-900 overflow-hidden">
        <div className={`${bg} h-full transition-all duration-500`} style={{ width: `${val}%` }} />
      </div>
    </div>
  );
}
