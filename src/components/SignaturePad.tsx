/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { MoveRight, Eraser } from "lucide-react";

interface SignaturePadProps {
  id: string;
  label: string;
  value?: string; // Existing base64 image if any
  onChange: (base64: string) => void;
  placeholder?: string;
}

export default function SignaturePad({
  id,
  label,
  value,
  onChange,
  placeholder = "Signer ici au doigt ou au stylet"
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Resize canvas to match box
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = 150; // Fixed height for signature pad
      
      // If we have an existing value, draw it on the newly sized canvas
      if (value) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.src = value;
        }
      } else {
        clearCanvas();
      }
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [value]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use PointerEvents for unified desktop and mobile pen/touch tracking
    canvas.setPointerCapture(e.pointerId);
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b"; // Charcoal black signature
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
      // Save signature state
      const dataUrl = canvas.toDataURL("image/png");
      onChange(dataUrl);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw subtle signature grid/baseline helper
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, 115);
      ctx.lineTo(canvas.width - 20, 115);
      ctx.stroke();
      ctx.setLineDash([]); // clear dash pattern
      
      onChange("");
      setIsEmpty(true);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col space-y-1.5 text-left w-full">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-sans">
        {label}
      </span>
      <div className="relative border-2 border-dashed border-slate-200 hover:border-bungeco-orange/40 rounded-xl overflow-hidden bg-slate-50/50 transition-all aspect-[2.5/1] sm:aspect-auto sm:h-[150px]">
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 p-4 text-center">
            <span className="text-xl mb-1 opacity-70">✍️</span>
            <span className="text-[10px] md:text-xs font-semibold text-slate-400">
              {placeholder}
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="block w-full h-[150px] cursor-crosshair touch-none"
          id={id}
        />
        {!isEmpty && (
          <button
            type="button"
            onClick={clearCanvas}
            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-500 hover:text-red-600 border border-slate-200/50 shadow-sm transition-all text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer select-none"
            title="Effacer la signature"
          >
            <Eraser size={11} />
            Effacer
          </button>
        )}
      </div>
    </div>
  );
}
