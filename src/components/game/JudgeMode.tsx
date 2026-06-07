'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RLHFPrompt, RLHFChoice } from '@/lib/types';
import { Scale, Clock, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface JudgeModeProps {
  prompt: RLHFPrompt;
  onSubmit: (choice: RLHFChoice, reasoning: string, timeMs: number) => void;
}

export default function JudgeMode({ prompt, onSubmit }: JudgeModeProps) {
  const [selected, setSelected] = useState<RLHFChoice>(null);
  const [reasoning, setReasoning] = useState('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer runs on mount and resets when component is remounted via key prop
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current > 0) {
        setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSubmit = () => {
    if (!selected) return;
    setIsSubmitted(true);
    const totalTime = Date.now() - startTimeRef.current;
    if (timerRef.current) clearInterval(timerRef.current);
    onSubmit(selected, reasoning, totalTime);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'reasoning': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'creativity': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'factual': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'coding': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'safety': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'hard': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
            <Scale className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">THE JUDGE</h3>
            <p className="text-[10px] text-zinc-500">Which AI response is better? Your vote trains the next generation.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getCategoryColor(prompt.category)}`}>
            {prompt.category}
          </span>
          <span className={`text-[10px] font-bold ${getDifficultyColor(prompt.difficulty)}`}>
            {prompt.difficulty.toUpperCase()}
          </span>
          <div className="flex items-center gap-1 text-zinc-500">
            <Clock size={12} />
            <span className="text-xs font-mono">{timeElapsed}s</span>
          </div>
        </div>
      </div>

      {/* The Prompt */}
      <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-xl">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">USER PROMPT</span>
        <p className="text-sm text-zinc-100 leading-relaxed font-medium">{prompt.prompt}</p>
      </div>

      {/* Side-by-Side Responses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Response A */}
        <button
          onClick={() => !isSubmitted && setSelected('A')}
          disabled={isSubmitted}
          className={`text-left p-5 rounded-xl border-2 transition-all duration-300 flex flex-col gap-3 ${
            selected === 'A'
              ? 'border-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-500/5'
              : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
          } ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                selected === 'A' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}>A</span>
              {prompt.modelA}
            </span>
            {selected === 'A' && <CheckCircle2 size={16} className="text-amber-400" />}
          </div>
          <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto font-mono bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
            {prompt.responseA}
          </div>
        </button>

        {/* Response B */}
        <button
          onClick={() => !isSubmitted && setSelected('B')}
          disabled={isSubmitted}
          className={`text-left p-5 rounded-xl border-2 transition-all duration-300 flex flex-col gap-3 ${
            selected === 'B'
              ? 'border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-500/5'
              : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
          } ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                selected === 'B' ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}>B</span>
              {prompt.modelB}
            </span>
            {selected === 'B' && <CheckCircle2 size={16} className="text-indigo-400" />}
          </div>
          <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto font-mono bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
            {prompt.responseB}
          </div>
        </button>
      </div>

      {/* Tie Option */}
      <button
        onClick={() => !isSubmitted && setSelected('tie')}
        disabled={isSubmitted}
        className={`w-full p-3 rounded-xl border transition-all duration-300 text-xs font-bold uppercase tracking-wider ${
          selected === 'tie'
            ? 'border-zinc-500/60 bg-zinc-800/50 text-zinc-200'
            : 'border-zinc-800 bg-zinc-900/20 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
        } ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
      >
        Both are equally good (Tie)
      </button>

      {/* Reasoning Input */}
      {selected && !isSubmitted && (
        <div className="flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Why? (Optional — earns 2x tokens)
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="e.g., Response B is more accurate and better structured..."
            className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 placeholder:text-zinc-600 resize-none h-20 focus:outline-none focus:border-amber-500/40 transition-colors"
          />
        </div>
      )}

      {/* Submit */}
      {selected && !isSubmitted && (
        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-700/20 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Sparkles size={16} />
          SUBMIT JUDGMENT
          <ChevronRight size={16} />
        </button>
      )}

      {/* Submitted State */}
      {isSubmitted && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-300 font-bold justify-center animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle2 size={16} className="text-emerald-400" />
          Judgment recorded! You chose Response {selected === 'tie' ? 'Tie' : selected} in {timeElapsed}s.
          {reasoning && ' (2x bonus applied for reasoning!)'}
        </div>
      )}
    </div>
  );
}
