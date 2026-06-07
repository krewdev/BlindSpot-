'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '@/store/gameStore';
import { Box, ObjectClass } from '@/lib/types';
import { Trash2 } from 'lucide-react';

function createSyntheticRoadScene(index: number): string {
  if (typeof window === 'undefined') return '';
  const canvas = window.document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Draw background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 500);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 500);

  // Draw grid lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 800; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 500);
    ctx.stroke();
  }
  for (let j = 0; j < 500; j += 40) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(800, j);
    ctx.stroke();
  }

  // Draw perspective road lanes
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(360, 200);
  ctx.lineTo(440, 200);
  ctx.lineTo(750, 500);
  ctx.lineTo(50, 500);
  ctx.closePath();
  ctx.fill();

  // Draw road lane dividers
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 15]);
  ctx.beginPath();
  ctx.moveTo(400, 200);
  ctx.lineTo(400, 500);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw scene contents based on index
  if (index === 0) {
    // Scene 1: Highway with a vehicle and a box/debris missed by AI
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(205, 330, 90, 80);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(220, 305, 60, 25);
    ctx.fillStyle = '#000';
    ctx.fillRect(215, 410, 20, 10);
    ctx.fillRect(265, 410, 20, 10);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(500, 350, 80, 80);
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.strokeRect(500, 350, 80, 80);
    ctx.beginPath();
    ctx.moveTo(500, 350); ctx.lineTo(580, 430);
    ctx.moveTo(580, 350); ctx.lineTo(500, 430);
    ctx.stroke();
  } else if (index === 1) {
    // Scene 2: Parking lot or wide road
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(405, 410, 190, 80);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(430, 380, 140, 30);
    
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(175, 170, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(160, 190, 30, 60);
    ctx.fillRect(162, 250, 10, 35);
    ctx.fillRect(178, 250, 10, 35);
  } else {
    // Scene 3: Pedestrian crossing
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(125, 220, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(110, 240, 30, 75);
    ctx.fillRect(112, 315, 10, 35);
    ctx.fillRect(128, 315, 10, 35);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(505, 230, 140, 60);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(525, 205, 100, 25);
  }

  // HUD text overlay
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`OFFLINE SANDBOX MODE — SCENE #${index + 1}`, 25, 35);
  ctx.fillStyle = '#475569';
  ctx.fillText('Draw boxes over missed objects (Person, Car, Box) to earn BLND.', 25, 55);

  return canvas.toDataURL();
}

export default function DrawingCanvasInner() {
  const { 
    playerRole, 
    boxes, 
    aiBoxes,
    addBox, 
    removeBox, 
    selectedClass, 
    setSelectedClass,
    matchImages, 
    currentImageIndex 
  } = useGameStore();

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500, x: 0, y: 0 });
  const [newBox, setNewBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);

  // Load active image
  useEffect(() => {
    const imgUrl = matchImages[currentImageIndex];
    if (typeof window !== 'undefined' && imgUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      const calculateDimensions = (w: number, h: number) => {
        const stageWidth = 800;
        const stageHeight = 500;
        const imageRatio = w / h;
        const stageRatio = stageWidth / stageHeight;
        
        let newWidth = stageWidth;
        let newHeight = stageHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (imageRatio > stageRatio) {
          newHeight = stageWidth / imageRatio;
          offsetY = (stageHeight - newHeight) / 2;
        } else {
          newWidth = stageHeight * imageRatio;
          offsetX = (stageWidth - newWidth) / 2;
        }

        setDimensions({ width: newWidth, height: newHeight, x: offsetX, y: offsetY });
      };

      img.onload = () => {
        setImage(img);
        calculateDimensions(img.width, img.height);
      };

      img.onerror = () => {
        console.warn("Remote image failed to load. Generating procedural offline scene fallback.");
        const fallbackUrl = createSyntheticRoadScene(currentImageIndex);
        img.onload = () => {
          setImage(img);
          calculateDimensions(img.width, img.height);
        };
        img.onerror = null;
        img.src = fallbackUrl;
      };

      img.src = imgUrl;
    }
  }, [currentImageIndex, matchImages]);

  const getRelativePointerPosition = (stage: Konva.Stage) => {
    const pointerPosition = stage.getPointerPosition();
    return pointerPosition;
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    setIsDrawing(true);
    setNewBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !newBox) return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    setNewBox({
      ...newBox,
      width: pos.x - newBox.x,
      height: pos.y - newBox.y,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !newBox) return;

    setIsDrawing(false);

    // Save box if it has a reasonable size
    if (Math.abs(newBox.width) > 10 && Math.abs(newBox.height) > 10) {
      const boxToSave: Box = {
        id: Math.random().toString(36).substring(2, 9),
        x: newBox.width < 0 ? newBox.x + newBox.width : newBox.x,
        y: newBox.height < 0 ? newBox.y + newBox.height : newBox.y,
        width: Math.abs(newBox.width),
        height: Math.abs(newBox.height),
        className: selectedClass,
      };
      addBox(boxToSave);
    }
    setNewBox(null);
  };

  // Helper colors for classes
  const getClassColor = (cls: ObjectClass) => {
    switch (cls) {
      case 'person': return '#3b82f6'; // Blue
      case 'car': return '#f59e0b';    // Amber
      case 'box': return '#10b981';    // Emerald
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-4xl">
      {/* Target Classes Selection Bar */}
      <div className="flex gap-4 p-4 w-full bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-t-xl justify-between items-center">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-semibold text-zinc-400">Class:</span>
          {(['person', 'car', 'box'] as ObjectClass[]).map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                selectedClass === cls
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
        <div className="text-xs text-zinc-400 italic font-medium">
          Role: <span className="font-bold text-white capitalize">{playerRole}</span> — Hunt for the AI&apos;s blindspots!
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative border-x border-b border-zinc-800 bg-zinc-950 overflow-hidden w-full flex justify-center items-center h-[500px]">
        {/* Render Konva Stage */}
        <Stage
          width={800}
          height={500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={stageRef}
          className="cursor-crosshair shadow-2xl"
        >
          <Layer>
            {/* Background Image */}
            {image && (
              <KonvaImage
                image={image}
                width={dimensions.width}
                height={dimensions.height}
                x={dimensions.x}
                y={dimensions.y}
                opacity={0.85}
              />
            )}

            {/* Existing aiBoxes */}
            {aiBoxes.map((box) => (
              <Rect
                key={box.id}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                stroke="#ef4444" // Red for AI
                strokeWidth={2}
                dash={[10, 5]} // Dashed line for AI
                fill="rgba(239, 68, 68, 0.1)" // Light red fill
                cornerRadius={2}
              />
            ))}

            {/* Existing human boxes */}
            {boxes.map((box) => (
              <Rect
                key={box.id}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                stroke={getClassColor(box.className)}
                strokeWidth={2}
                fill={`${getClassColor(box.className)}15`} // 15 represents low opacity hex
                cornerRadius={2}
              />
            ))}

            {/* Dragging Preview Box */}
            {newBox && (
              <Rect
                x={newBox.width < 0 ? newBox.x + newBox.width : newBox.x}
                y={newBox.height < 0 ? newBox.y + newBox.height : newBox.y}
                width={Math.abs(newBox.width)}
                height={Math.abs(newBox.height)}
                stroke="#6366f1"
                strokeWidth={2}
                dash={[4, 4]}
                fill="rgba(99, 102, 241, 0.15)"
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Box Inventory list */}
      <div className="w-full bg-zinc-900/60 border-x border-b border-zinc-800 rounded-b-xl p-4 flex flex-col gap-2 max-h-48 overflow-y-auto">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Drawn Annotations</h4>
        {boxes.length === 0 ? (
          <div className="text-xs text-zinc-500 italic py-2">No bounding boxes drawn yet. Click and drag on the image above.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {boxes.map((box) => (
              <div 
                key={box.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300"
              >
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: getClassColor(box.className) }}
                  />
                  <span className="font-semibold uppercase text-zinc-400">{box.className}:</span>
                  <span>[{Math.round(box.x)}, {Math.round(box.y)}, {Math.round(box.width)}x{Math.round(box.height)}]</span>
                </div>
                <button
                  onClick={() => removeBox(box.id)}
                  className="p-1 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
