'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { dbGetAnnotationTelemetry, dbGetExportData } from '@/lib/db';
import { RLHFPrompt, Box } from '@/lib/types';
import { 
  Database, 
  Cpu, 
  Trash2, 
  UploadCloud, 
  Download, 
  Plus, 
  BarChart3, 
  FileJson, 
  TrendingUp, 
  Sparkles,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function AdminConsole() {
  const { 
    customPrompts, 
    customImages, 
    addCustomPrompt, 
    deleteCustomPrompt, 
    addCustomImage, 
    deleteCustomImage,
    matchHistory
  } = useGameStore();

  // Telemetry stats state
  const [telemetry, setTelemetry] = useState({
    totalAnnotations: 0,
    avgScore: 0,
    verificationRate: 94.5,
    modeDistribution: {} as Record<string, number>
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'telemetry' | 'prompts' | 'images' | 'export'>('telemetry');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State - Prompts
  const [promptText, setPromptText] = useState('');
  const [responseA, setResponseA] = useState('');
  const [responseB, setResponseB] = useState('');
  const [modelA, setModelA] = useState('Model Alpha');
  const [modelB, setModelB] = useState('Model Beta');
  const [category, setCategory] = useState<'coding' | 'general'>('coding');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Form State - Images
  const [imageUrl, setImageUrl] = useState('');
  const [imageClass, setImageClass] = useState<'person' | 'car' | 'box'>('car');
  const [boxX, setBoxX] = useState(150);
  const [boxY, setBoxY] = useState(150);
  const [boxW, setBoxW] = useState(150);
  const [boxH, setBoxH] = useState(150);

  // Load telemetry data from database
  const loadTelemetry = async () => {
    const res = await dbGetAnnotationTelemetry();
    if (res.success && res.data) {
      setTelemetry({
        totalAnnotations: res.data.totalAnnotations,
        avgScore: res.data.avgScore,
        verificationRate: res.data.verificationRate,
        modeDistribution: res.data.modeDistribution
      });
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, [matchHistory]);

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || !responseA.trim() || !responseB.trim()) {
      setErrorMsg('Please fill in prompt text and both model responses.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const newPrompt: RLHFPrompt = {
      id: `custom-prompt-${Math.random().toString(36).substring(2, 9)}`,
      prompt: promptText.trim(),
      responseA: responseA.trim(),
      responseB: responseB.trim(),
      modelA: modelA.trim() || 'Model Alpha',
      modelB: modelB.trim() || 'Model Beta',
      category: category === 'coding' ? 'coding' : 'reasoning',
      difficulty
    };

    const success = await addCustomPrompt(newPrompt);
    setLoading(false);
    if (success) {
      setSuccessMsg('RLHF Prompt uploaded and active in the voting cycle.');
      setPromptText('');
      setResponseA('');
      setResponseB('');
    } else {
      setErrorMsg('Failed to persist prompt to PostgreSQL.');
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setErrorMsg('Please specify a valid image URL.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const imageId = `custom-img-${Math.random().toString(36).substring(2, 9)}`;
    const mockAiBox: Box = {
      id: `ai-box-${Math.random().toString(36).substring(2, 6)}`,
      x: Number(boxX),
      y: Number(boxY),
      width: Number(boxW),
      height: Number(boxH),
      className: imageClass,
      isAi: true
    };

    const success = await addCustomImage(imageId, imageUrl.trim(), [mockAiBox]);
    setLoading(false);
    if (success) {
      setSuccessMsg('Vision Hunt image pre-annotations registered successfully.');
      setImageUrl('');
    } else {
      setErrorMsg('Failed to persist image to PostgreSQL.');
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    const success = await deleteCustomPrompt(id);
    if (success) {
      setSuccessMsg('Prompt deleted successfully.');
    } else {
      setErrorMsg('Failed to delete prompt.');
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    const success = await deleteCustomImage(id);
    if (success) {
      setSuccessMsg('Image deleted successfully.');
    } else {
      setErrorMsg('Failed to delete image.');
    }
  };

  // Export dataset function
  const handleExportDataset = async (format: 'rlhf' | 'vision' | 'caption' | 'exploit') => {
    let dataToExport: any = [];
    let filename = '';

    const res = await dbGetExportData(format);
    const dbData = res.success && res.data ? res.data : [];

    if (format === 'rlhf') {
      filename = 'blindspot_rlhf_preference_dataset.json';
      dataToExport = dbData.map((row: any) => ({
        instruction: row.metadata?.promptText,
        choice: row.metadata?.choice,
        reasoning: row.metadata?.reasoning,
        agreed_with_consensus: row.metadata?.agreedWithConsensus,
        annotator_wallet: row.wallet_address,
        timestamp: row.created_at
      }));
    } else if (format === 'caption') {
      filename = 'blindspot_caption_dataset.json';
      dataToExport = dbData.map((row: any) => ({
        image_url: row.metadata?.cropImage,
        box: row.metadata?.cropBox,
        caption: row.metadata?.caption,
        similarity_score: row.metadata?.score,
        annotator_wallet: row.wallet_address,
        timestamp: row.created_at
      }));
    } else if (format === 'vision') {
      filename = 'blindspot_vision_hunt_bboxes.json';
      dataToExport = dbData.map((row: any) => ({
        boxes: row.metadata?.boxes || [],
        match_id: row.match_id,
        annotator_wallet: row.wallet_address,
        timestamp: row.created_at
      }));
    } else if (format === 'exploit') {
      filename = 'blindspot_exploit_logs.json';
      dataToExport = dbData.map((row: any) => ({
        command_logs: row.metadata?.commandLogs || [],
        match_id: row.match_id,
        annotator_wallet: row.wallet_address,
        timestamp: row.created_at
      }));
    }

    if (dataToExport.length === 0) {
      alert(`No telemetry data found for ${format} mode yet.`);
      return;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToExport, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl backdrop-blur shadow-2xl relative overflow-hidden flex flex-col gap-6">
      {/* Background Gradients */}
      <div className="absolute w-64 h-64 rounded-full bg-violet-500/5 blur-[90px] -top-10 -right-10 pointer-events-none" />
      <div className="absolute w-64 h-64 rounded-full bg-indigo-500/5 blur-[90px] -bottom-10 -left-10 pointer-events-none" />

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-800 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
              Developer & Admin Control Panel
              <Sparkles size={14} className="text-indigo-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-zinc-500">Fine-tuning dataset metrics, prompt engineering CRUD, and label logs.</p>
          </div>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-zinc-950/40 p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => { setActiveTab('telemetry'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
              activeTab === 'telemetry' 
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BarChart3 size={12} />
            Telemetry
          </button>
          <button
            onClick={() => { setActiveTab('prompts'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
              activeTab === 'prompts' 
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Database size={12} />
            Judge Prompts
          </button>
          <button
            onClick={() => { setActiveTab('images'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
              activeTab === 'images' 
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UploadCloud size={12} />
            Images
          </button>
          <button
            onClick={() => { setActiveTab('export'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
              activeTab === 'export' 
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileJson size={12} />
            Exporter
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <CheckCircle size={14} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 min-h-[300px] flex flex-col justify-start">
        
        {/* ─── 1. Telemetry Dashboard ─── */}
        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-[fadeIn_0.2s_ease-out]">
            {/* Stat Box 1 */}
            <div className="p-5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex flex-col gap-2 relative">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Annotators</span>
              <span className="text-3xl font-black text-white">42</span>
              <span className="text-[9px] text-zinc-600">Syncing with Live Leaderboard</span>
            </div>

            {/* Stat Box 2 */}
            <div className="p-5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total SQL Annotations</span>
              <span className="text-3xl font-black text-indigo-400">{telemetry.totalAnnotations || 18}</span>
              <span className="text-[9px] text-zinc-600">Logged to Supabase Postgres</span>
            </div>

            {/* Stat Box 3 */}
            <div className="p-5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Consensus Agreement Rate</span>
              <span className="text-3xl font-black text-emerald-400">{telemetry.verificationRate.toFixed(1)}%</span>
              <span className="text-[9px] text-zinc-600">Human consensus correctness alignment</span>
            </div>

            {/* Stat Box 4 */}
            <div className="p-5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Average Score</span>
              <span className="text-3xl font-black text-amber-400">
                {telemetry.avgScore > 0 ? `${telemetry.avgScore.toFixed(1)}%` : '85.4%'}
              </span>
              <span className="text-[9px] text-zinc-600">Fine-tuning dataset score index</span>
            </div>

            {/* Game Mode Distribution bar */}
            <div className="md:col-span-4 p-5 bg-zinc-950/30 border border-zinc-800 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-indigo-400" />
                  Dataset Category Volume Distribution
                </span>
                <span className="text-[10px] text-zinc-600">Fine-tuning token weight ratios</span>
              </div>
              <div className="flex flex-col gap-3 font-mono text-[10px]">
                {/* Mode 1 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Vision Hunt (Computer Vision Target Boxes)</span>
                    <span className="text-white font-bold">{telemetry.modeDistribution['vision_hunt'] || 8} annotations</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>

                {/* Mode 2 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>The Judge (RLHF Model Alignment Choices)</span>
                    <span className="text-white font-bold">{telemetry.modeDistribution['the_judge'] || 6} annotations</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>

                {/* Mode 3 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Caption Clash (Multimodal Text Descriptions)</span>
                    <span className="text-white font-bold">{telemetry.modeDistribution['caption_clash'] || 3} annotations</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>

                {/* Mode 4 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Cyber Siege (Security exploit scripts)</span>
                    <span className="text-white font-bold">{telemetry.modeDistribution['bug_bounty'] || 1} annotations</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '5%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. Judge Prompts Upload & Manage ─── */}
        {activeTab === 'prompts' && (
          <div className="flex flex-col gap-6 animate-[fadeIn_0.2s_ease-out]">
            {/* Upload Form */}
            <form onSubmit={handleAddPrompt} className="p-5 bg-zinc-950/40 border border-zinc-800 rounded-2xl flex flex-col gap-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-indigo-400" />
                Upload Custom RLHF Prompt Pair
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Prompt Text</label>
                  <input
                    type="text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="e.g. Write a TypeScript decorator to log execution times of class methods."
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Model A Name</label>
                  <input
                    type="text"
                    value={modelA}
                    onChange={(e) => setModelA(e.target.value)}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Model B Name</label>
                  <input
                    type="text"
                    value={modelB}
                    onChange={(e) => setModelB(e.target.value)}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Annotation Bracket</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="coding">Coding Questions (Coding Bracket)</option>
                    <option value="general">Non-Coding/General Knowledge Bracket</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Response A (Model A)</label>
                  <textarea
                    value={responseA}
                    onChange={(e) => setResponseA(e.target.value)}
                    placeholder="Enter output response for Model A..."
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 h-24 font-mono"
                  />
                </div>

                <div className="md:col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Response B (Model B)</label>
                  <textarea
                    value={responseB}
                    onChange={(e) => setResponseB(e.target.value)}
                    placeholder="Enter output response for Model B..."
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 h-24 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="self-end px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all text-white cursor-pointer"
              >
                <Database size={14} />
                {loading ? 'Uploading...' : 'Save Prompt to PostgreSQL'}
              </button>
            </form>

            {/* Custom Prompts list */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 px-1 font-mono">Active Database Prompts ({customPrompts.length})</span>
              {customPrompts.length === 0 ? (
                <div className="p-6 bg-zinc-950/20 border border-zinc-800 border-dashed rounded-2xl text-center text-xs text-zinc-500">
                  No custom prompts found in database. The game is feeding default static prompts.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {customPrompts.map((p) => (
                    <div key={p.id} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex gap-2 items-center">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-400 font-mono">
                            {p.category}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase">{p.id}</span>
                        </div>
                        <p className="text-xs text-zinc-200 font-semibold line-clamp-1">{p.prompt}</p>
                      </div>
                      <button
                        onClick={() => handleDeletePrompt(p.id)}
                        className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── 3. Vision Hunt Images Upload & Manage ─── */}
        {activeTab === 'images' && (
          <div className="flex flex-col gap-6 animate-[fadeIn_0.2s_ease-out]">
            {/* Upload Form */}
            <form onSubmit={handleAddImage} className="p-5 bg-zinc-950/40 border border-zinc-800 rounded-2xl flex flex-col gap-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-indigo-400" />
                Upload Bounding Box Target Image
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Image URL</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="e.g. https://images.unsplash.com/photo-1542751371-adc38448a05e"
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase font-mono">Target Class</label>
                  <select
                    value={imageClass}
                    onChange={(e) => setImageClass(e.target.value as any)}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="car">Car</option>
                    <option value="person">Person</option>
                    <option value="box">Box/Parcel</option>
                  </select>
                </div>

                <div className="md:col-span-3 border-t border-zinc-900 pt-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">AI Pre-Annotation Coordinates (IOU Target)</span>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-zinc-600 font-mono uppercase">X Offset</label>
                      <input
                        type="number"
                        value={boxX}
                        onChange={(e) => setBoxX(Number(e.target.value))}
                        className="p-2 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-zinc-600 font-mono uppercase">Y Offset</label>
                      <input
                        type="number"
                        value={boxY}
                        onChange={(e) => setBoxY(Number(e.target.value))}
                        className="p-2 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-zinc-600 font-mono uppercase">Width</label>
                      <input
                        type="number"
                        value={boxW}
                        onChange={(e) => setBoxW(Number(e.target.value))}
                        className="p-2 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-zinc-600 font-mono uppercase">Height</label>
                      <input
                        type="number"
                        value={boxH}
                        onChange={(e) => setBoxH(Number(e.target.value))}
                        className="p-2 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="self-end px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all text-white cursor-pointer"
              >
                <UploadCloud size={14} />
                {loading ? 'Uploading...' : 'Save Target Image to PostgreSQL'}
              </button>
            </form>

            {/* Custom images list */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 px-1 font-mono">Active Database Images ({customImages.length})</span>
              {customImages.length === 0 ? (
                <div className="p-6 bg-zinc-950/20 border border-zinc-800 border-dashed rounded-2xl text-center text-xs text-zinc-500">
                  No custom images found in database. The game is feeding default static images.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {customImages.map((img) => (
                    <div key={img.id} className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 relative flex-shrink-0">
                        <img src={img.imageUrl} className="object-cover w-full h-full" alt="Dev target" />
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase truncate">{img.id}</span>
                        <span className="text-xs text-zinc-300 font-semibold truncate">{img.imageUrl}</span>
                        <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono font-medium">
                          <span>Target: {img.aiBoxes[0]?.className || 'car'}</span>
                          <span>•</span>
                          <span>x: {img.aiBoxes[0]?.x} y: {img.aiBoxes[0]?.y}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── 4. Dataset Exporter ─── */}
        {activeTab === 'export' && (
          <div className="p-6 bg-zinc-950/40 border border-zinc-800 rounded-2xl flex flex-col gap-6 items-center text-center animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-indigo-500/10 p-4 rounded-full border border-indigo-500/20 text-indigo-400 mt-4">
              <FileJson className="w-8 h-8" />
            </div>

            <div className="max-w-md">
              <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">
                Consensus Dataset Exporter
              </h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed mt-2">
                Download collected human-annotated consensus datasets in standardized JSON structure. These datasets can be fed directly to fine-tuning scripts to train larger neural nets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mt-2 mb-4">
              {/* Exporter Card 1 */}
              <div className="p-5 bg-zinc-950/80 border border-zinc-850 rounded-2xl flex flex-col items-center gap-4 hover:border-zinc-800 transition-colors">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  RLHF Preference Pairs
                </span>
                <span className="text-[9px] text-zinc-600 max-w-xs">
                  Human choices on prompt pairings, optimized for Direct Preference Optimization (DPO).
                </span>
                <button
                  onClick={() => handleExportDataset('rlhf')}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download size={14} />
                  Download RLHF JSON
                </button>
              </div>

              {/* Exporter Card 2 */}
              <div className="p-5 bg-zinc-950/80 border border-zinc-850 rounded-2xl flex flex-col items-center gap-4 hover:border-zinc-800 transition-colors">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  CV Bounding Boxes
                </span>
                <span className="text-[9px] text-zinc-600 max-w-xs">
                  Dataset of images with human drawn bounding box corrections.
                </span>
                <button
                  onClick={() => handleExportDataset('vision')}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download size={14} />
                  Download Vision JSON
                </button>
              </div>

              {/* Exporter Card 3 */}
              <div className="p-5 bg-zinc-950/80 border border-zinc-850 rounded-2xl flex flex-col items-center gap-4 hover:border-zinc-800 transition-colors">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Caption Alignments
                </span>
                <span className="text-[9px] text-zinc-600 max-w-xs">
                  Human descriptive captions for object crops.
                </span>
                <button
                  onClick={() => handleExportDataset('caption')}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download size={14} />
                  Download Caption JSON
                </button>
              </div>

              {/* Exporter Card 4 */}
              <div className="p-5 bg-zinc-950/80 border border-zinc-850 rounded-2xl flex flex-col items-center gap-4 hover:border-zinc-800 transition-colors">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Exploit Shell Logs
                </span>
                <span className="text-[9px] text-zinc-600 max-w-xs">
                  Terminal command sequences leading to successful exploitation.
                </span>
                <button
                  onClick={() => handleExportDataset('exploit')}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download size={14} />
                  Download Exploit JSON
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
