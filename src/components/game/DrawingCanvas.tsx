'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Konva Drawing Canvas to disable Server-Side Rendering (SSR)
// React-Konva relies on browser-only Canvas APIs and will break during Next.js build-time prerendering if imported normally.
const DrawingCanvasInner = dynamic(() => import('./DrawingCanvasInner'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl h-[500px] bg-zinc-950 border border-zinc-800 rounded-xl animate-pulse">
      <div className="text-zinc-500 text-sm font-semibold tracking-wider">LOADING DUEL CANVAS...</div>
    </div>
  ),
});

export default function DrawingCanvas() {
  return <DrawingCanvasInner />;
}
