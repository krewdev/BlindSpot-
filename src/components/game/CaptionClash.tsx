'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { MessageSquare, Sparkles, ChevronRight, Type, CheckCircle } from 'lucide-react';

export default function CaptionClash() {
  const { captionClashCrops, currentCropIndex, submitCaption, matchScore } = useGameStore();
  const [caption, setCaption] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeCrop = captionClashCrops[currentCropIndex];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;

    setIsSubmitted(true);
    submitCaption(caption);
  };

  // Zoom crop calculation
  const box = activeCrop.box;
  const containerSize = 240; // 240px container
  const scale = Math.min(containerSize / box.width, containerSize / box.height);
  const leftOffset = -box.x * scale + (containerSize - box.width * scale) / 2;
  const topOffset = -box.y * scale + (containerSize - box.height * scale) / 2;

  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">CAPTION CLASH</h3>
            <p className="text-[10px] text-zinc-500">Describe the cropped object. Your descriptions fine-tune multi-modal Vision models.</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
          ALIGNMENT DATA
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Crop Preview */}
        <div className="md:col-span-1 p-5 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Target Crop</span>
          
          <div 
            className="relative overflow-hidden border border-zinc-800 rounded-2xl bg-zinc-950 shadow-inner flex items-center justify-center"
            style={{ width: containerSize, height: containerSize }}
          >
            <img
              src={activeCrop.image}
              alt="Cropped annotation"
              className="absolute max-w-none transition-all duration-300"
              style={{
                left: `${leftOffset}px`,
                top: `${topOffset}px`,
                width: `${800 * scale}px`,
                height: `${500 * scale}px`,
              }}
            />
          </div>
          
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            Class: {activeCrop.originalClass}
          </span>
        </div>

        {/* Input area */}
        <div className="md:col-span-2 p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col justify-between">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full justify-between">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <Type size={12} />
                  Write Descriptive Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. A blue sedan vehicle parked on the shoulder of the highway, next to the metallic guardrail."
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40 transition-colors h-32 resize-none"
                  required
                />
                <span className="text-[10px] text-zinc-500 italic">
                  * Be highly specific. Describe color, type, orientation, and surroundings for consensus.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] mt-4"
              >
                <Sparkles size={16} />
                SUBMIT CAPTION
                <ChevronRight size={16} />
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-5 h-full justify-center py-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3 text-sm text-emerald-300 font-bold justify-center">
                <CheckCircle size={18} className="text-emerald-400" />
                Caption submitted successfully!
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Your Caption</span>
                <p className="text-xs text-zinc-300 italic font-medium leading-relaxed bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
                  &ldquo;{caption}&rdquo;
                </p>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Consensus Matches</span>
                <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800 text-xs">
                  <span className="text-zinc-400">Model-Human text alignment index:</span>
                  <span className="font-bold text-emerald-400">{matchScore}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
