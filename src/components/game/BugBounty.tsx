'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Bug, Terminal, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';

export default function BugBounty() {
  const { terminalLogs, terminalChallengeSolved, submitHackingCommand, matchScore } = useGameStore();
  const [input, setInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal logs to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // Keep terminal input focused on click anywhere on terminal body
  const focusTerminalInput = () => {
    inputRef.current?.focus();
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    submitHackingCommand(input);
    setInput('');
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            <Bug className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">CYBER SIEGE (BUG BOUNTY)</h3>
            <p className="text-[10px] text-zinc-500">Compete head-to-head to exploit the target. Your command paths fine-tune security models.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            AI TELEMETRY ACTIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: CTF Mission Briefing */}
        <div className="lg:col-span-1 p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 text-zinc-300 font-bold border-b border-zinc-800 pb-3">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="text-xs uppercase tracking-wider">Mission Briefing</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 uppercase text-[9px] font-bold">Target IP</span>
              <span className="font-mono text-zinc-300 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">10.0.4.99</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 uppercase text-[9px] font-bold">Vulnerability</span>
              <span className="text-zinc-300 font-medium leading-relaxed">
                The node is running an unauthenticated API endpoint. Scan it, execute the exploit payload, and retrieve the flag in root directory.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 uppercase text-[9px] font-bold">Hacking Instructions</span>
              <ul className="list-disc pl-4 text-zinc-400 leading-relaxed space-y-1">
                <li>Type <code className="text-rose-400 bg-rose-500/5 px-1 rounded border border-rose-500/10 font-mono">help</code> in the shell to begin.</li>
                <li>Analyze ports using <code className="text-rose-400 bg-rose-500/5 px-1 rounded border border-rose-500/10 font-mono">scan</code>.</li>
                <li>Launch attack vectors with <code className="text-rose-400 bg-rose-500/5 px-1 rounded border border-rose-500/10 font-mono">exploit</code>.</li>
                <li>Read the root flag: <code className="text-rose-400 bg-rose-500/5 px-1 rounded border border-rose-500/10 font-mono">cat flag.txt</code>.</li>
              </ul>
            </div>
          </div>

          {/* AI Logger Status */}
          <div className="mt-auto p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3">
            <div className="bg-rose-500/10 p-2 rounded-lg text-rose-400 border border-rose-500/20">
              <Cpu size={14} className="animate-pulse" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase text-zinc-500">Fine-Tuning Yield</span>
              <span className="text-[10px] text-zinc-300 font-semibold">Security Agent Autopatch Logs</span>
            </div>
          </div>
        </div>

        {/* Right Side: Shell Console */}
        <div className="lg:col-span-2 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-inner overflow-hidden min-h-[400px]">
          {/* Console Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 font-mono uppercase">blindspot_shell_terminal v1.0.3</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            </div>
          </div>

          {/* Shell Output */}
          <div 
            onClick={focusTerminalInput}
            className="flex-1 p-4 font-mono text-xs text-rose-500 overflow-y-auto max-h-[300px] flex flex-col gap-1.5 cursor-text select-text"
          >
            {terminalLogs.map((log, idx) => (
              <div 
                key={idx} 
                className={`whitespace-pre-wrap leading-relaxed ${
                  log.startsWith('hunter@') 
                    ? 'text-white font-bold' 
                    : log.startsWith('FLAG:') 
                      ? 'text-emerald-400 font-black tracking-wider border border-emerald-500/20 bg-emerald-500/5 p-2 rounded-lg my-1' 
                      : log.startsWith('Error:')
                        ? 'text-rose-600'
                        : 'text-rose-500/90'
                }`}
              >
                {log}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Shell Input Prompt */}
          <div className="p-3 bg-zinc-900/50 border-t border-zinc-800">
            {terminalChallengeSolved ? (
              <div className="py-2 flex items-center justify-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs">
                <CheckCircle2 size={16} />
                CTF Compromised! Flag captured. Round Score: {matchScore}%
              </div>
            ) : (
              <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-400 font-bold select-none">hunter@blindspot:~$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-white font-semibold focus:ring-0 focus:border-none focus:outline-none placeholder-zinc-700"
                  placeholder="enter hacking command..."
                  autoFocus
                  autoComplete="off"
                />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
