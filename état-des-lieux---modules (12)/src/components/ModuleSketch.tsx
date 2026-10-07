/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { ModuleType, InspectionCharacteristics } from "../types";
import { Pen, Eraser, Trash2, ShieldAlert, Sparkles, Undo } from "lucide-react";
import { SANITAIRE_6M_SX_BASE64 } from "./sanitaire_6m_sx_base64";

interface ModuleSketchProps {
  moduleType: ModuleType;
  characteristics: InspectionCharacteristics;
  onChange: (dataUrl: string) => void;
  savedDataUrl?: string;
  onUpdateCharacteristics?: (updater: (prev: InspectionCharacteristics) => InspectionCharacteristics) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
}

export default function ModuleSketch({
  moduleType,
  characteristics,
  onChange,
  savedDataUrl,
  onUpdateCharacteristics,
}: ModuleSketchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const [customSanitaireImage, setCustomSanitaireImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem("sanitaire_6m_sx_image") || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    setImgLoaded(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = (err) => {
      if (customSanitaireImage) {
        try {
          localStorage.removeItem("sanitaire_6m_sx_image");
        } catch {
          // ignore
        }
        setCustomSanitaireImage(null);
        img.src = SANITAIRE_6M_SX_BASE64;
      } else {
        console.error("Failed to load sanitaire 6m sx image:", err);
      }
    };
    img.src = customSanitaireImage || SANITAIRE_6M_SX_BASE64;
  }, [customSanitaireImage]);

  const [currentColor, setCurrentColor] = useState<string>("#ef4444"); // Red (damage)
  const [currentWidth, setCurrentWidth] = useState<number>(3);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 320 });

  const initPos = (() => {
    const cfg = characteristics.configurationType || "Pignon";
    if (cfg === "Pignon") {
      return {
        door: { side: "right", t: moduleType === "B6" ? 0.659 : 0.5 },
        win: { side: "left", t: 0.295 },
        alim: { side: "left", t: 0.85 },
      };
    } else if (cfg === "Façade") {
      return {
        door: { side: "bottom", t: 0.75 },
        win: { side: "bottom", t: 0.25 },
        alim: { side: "left", t: 0.85 },
      };
    } else {
      return {
        door: { side: "bottom", t: 0.5 },
        win: { side: "top", t: 0.5 },
        alim: { side: "left", t: 0.85 },
      };
    }
  })();

  const [doorPos, setDoorPos] = useState(initPos.door);
  const [winPos, setWinPos] = useState(initPos.win);
  const [climTrappePos, setClimTrappePos] = useState({ side: "left", t: 0.65 });
  const [evierPos, setEvierPos] = useState({ side: "left", t: 0.15 });
  const [wcPos, setWcPos] = useState({ rx: 0.85, ry: 0.70 });
  const [douchePos, setDouchePos] = useState({ rx: 0.62, ry: 0.70 });
  const [alimPos, setAlimPos] = useState(initPos.alim);
  const [customElements, setCustomElements] = useState<{ id: string; type: "door" | "window" | "outlet" | "rj45"; side: "top" | "bottom" | "left" | "right"; t: number }[]>([]);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);

  const getEnclosingCoords = () => {
    let mw = canvasSize.width * 0.75;
    let mh = canvasSize.height * 0.55;
    
    const type = moduleType;
    if (type.startsWith("B4")) {
      mw = canvasSize.width * 0.55;
    } else if (type.startsWith("B5")) {
      mw = canvasSize.width * 0.65;
    } else if (type === "S1") {
      // 1.18 x 1.18 (Square)
      mw = canvasSize.height * 0.48;
      mh = mw;
    } else if (type === "SS1" || type === "SD1") {
      // 1.18 x 2.42 (horizontal ratio: 1.18 / 2.42 = 0.487)
      mw = canvasSize.width * 0.7;
      mh = mw * 0.487;
    } else if (type === "SD2" || type === "SDU" || type === "SSU") {
      // 2.30 x 2.42 (horizontal ratio: 2.30 / 2.42 = 0.95)
      mw = canvasSize.height * 0.55;
      mh = mw * 0.95;
    } else if (type === "C8'") {
      // 2.20 x 2.42 (horizontal ratio: 2.20 / 2.42 = 0.91)
      mw = canvasSize.height * 0.56;
      mh = mw * 0.91;
    } else if (type === "C10'") {
      // 3.00 x 2.42 (horizontal ratio: 2.42 / 3.00 = 0.81)
      mw = canvasSize.width * 0.65;
      mh = mw * 0.81;
    } else if (type.startsWith("C20'")) {
      // 6.05 x 2.43 (horizontal ratio: 2.43 / 6.05 = 0.40)
      mw = canvasSize.width * 0.78;
      mh = mw * 0.402;
    } else if (type === "Sanitaire 6m") {
      mw = canvasSize.width * 0.78;
      mh = mw * 0.402;
    }

    let mx = (canvasSize.width - mw) / 2;
    let my = (canvasSize.height - mh) / 2 + 10;
    return { mx, my, mw, mh };
  };

  const findClosestPeriphery = (px: number, py: number, mx: number, my: number, mw: number, mh: number) => {
    const distTop = Math.abs(py - my);
    const distBottom = Math.abs(py - (my + mh));
    const distLeft = Math.abs(px - mx);
    const distRight = Math.abs(px - (mx + mw));

    const minDist = Math.min(distTop, distBottom, distLeft, distRight);

    if (minDist === distTop) {
      const t = Math.max(0.05, Math.min(0.95, (px - mx) / mw));
      return { side: "top", t };
    } else if (minDist === distBottom) {
      const t = Math.max(0.05, Math.min(0.95, (px - mx) / mw));
      return { side: "bottom", t };
    } else if (minDist === distLeft) {
      const t = Math.max(0.08, Math.min(0.92, (py - my) / mh));
      return { side: "left", t };
    } else {
      const t = Math.max(0.08, Math.min(0.92, (py - my) / mh));
      return { side: "right", t };
    }
  };

  // Handle resizing of the canvas based on container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(300, Math.min(650, rect.width));
        const height = Math.round(width * 0.65);
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Auto-align door and window when configuration type changes
  useEffect(() => {
    if (["B6", "B5", "B4"].includes(moduleType)) {
      if (characteristics.configurationType === "Pignon") {
        if (moduleType === "B6") {
          setDoorPos({ side: "right", t: 0.659 }); // Aligning '1 unit (1.00m) - 1 door - 23cm panel'
        } else {
          setDoorPos({ side: "right", t: 0.5 });
        }
        setWinPos({ side: "left", t: 0.295 }); // Exactly 1m window center after 22cm panel
        setClimTrappePos({ side: "left", t: 0.635 }); // Clim or Trappe below it
        setEvierPos({ side: "left", t: 0.15 }); // Sink / kitchen block inside on left
      } else if (characteristics.configurationType === "Façade") {
        setDoorPos({ side: "bottom", t: 0.75 }); // center of 5th segment
        setWinPos({ side: "bottom", t: 0.25 });  // center of 2nd segment
        setEvierPos({ side: "left", t: 0.15 });
      } else if (characteristics.configurationType === "Conquet") {
        setDoorPos({ side: "bottom", t: 0.5 }); // Porte centrée sur le grand côté inférieur
        setWinPos({ side: "top", t: 0.5 });     // Fenêtre centrée sur le grand côté supérieur
        setAlimPos({ side: "left", t: 0.85 });  // Alimentation vers le pignon gauche
        setClimTrappePos({ side: "left", t: 0.35 });
        setEvierPos({ side: "left", t: 0.15 });
      }
    }
  }, [characteristics.configurationType, moduleType]);

  // Initialize or redraw everything on size, type, options or strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw solid canvas background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw static module baseline schematic
    drawModuleBase(ctx, canvas.width, canvas.height, moduleType, characteristics);

    // 3. Draw user's drawn strokes
    drawUserStrokes(ctx);

    // 4. Propagate image up
    const timer = setTimeout(() => {
      const dataUrl = canvas.toDataURL("image/png");
      onChange(dataUrl);
    }, 200);

    return () => clearTimeout(timer);
  }, [canvasSize, moduleType, characteristics, strokes, currentStroke, doorPos, winPos, climTrappePos, evierPos, wcPos, douchePos, alimPos, customElements, imgLoaded]);

  const drawModuleBase = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    type: ModuleType,
    opts: InspectionCharacteristics
  ) => {
    ctx.save();

    // Semi-transparent grids for architectural guidelines (neutral slate grey grid)
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Label of module type at top right
    ctx.fillStyle = "#475569";
    ctx.font = "bold 11px sans-serif";
    const headerTitle = opts.configurationType === "Conquet" ? `${type} — CONQUET` : `${type}`;
    ctx.fillText(headerTitle, w - 170, 20);

    // Enclosing Frame (Outer wall coordinates)
    const { mx, my, mw, mh } = getEnclosingCoords();

    if (type === "Sanitaire 6m" && opts.configSanitaire === "SX") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx, my, mw, mh);
      if (imgRef.current && imgLoaded) {
        ctx.drawImage(imgRef.current, mx, my, mw, mh);
      } else {
        ctx.fillStyle = "#64748b";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Chargement du plan sanitaire...", mx + mw/2, my + mh/2);
      }
      ctx.restore();
      return;
    }

    // Draw solid white cabin bounds (neutral background - "La couleur ne doit pas apparaitre")
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3.5;

    const removedPanel = opts.panneauSupprime;

    // Draw Left and Right walls (Pignons)
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx, my + mh);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mx + mw, my);
    ctx.lineTo(mx + mw, my + mh);
    ctx.stroke();

    // Top 6m wall (Façade avant)
    if (removedPanel === "haut") {
      ctx.save();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + mw, my);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✕ PANNEAU 6M DÉPOSÉ (ABSENT)", mx + mw / 2, my - 6);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + mw, my);
      ctx.stroke();
    }

    // Bottom 6m wall (Façade arrière)
    if (removedPanel === "bas") {
      ctx.save();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(mx, my + mh);
      ctx.lineTo(mx + mw, my + mh);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✕ PANNEAU 6M DÉPOSÉ (ABSENT)", mx + mw / 2, my + mh + 26);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(mx, my + mh);
      ctx.lineTo(mx + mw, my + mh);
      ctx.stroke();
    }

    // 1. Helpers to get periphery coordinates for drag-and-drop elements
    const getPeripheryCoords = (side: string, t: number) => {
      if (side === "top") {
        return { x: mx + mw * t, y: my };
      } else if (side === "right") {
        return { x: mx + mw, y: my + mh * t };
      } else if (side === "bottom") {
        return { x: mx + mw * t, y: my + mh };
      } else { // "left"
        return { x: mx, y: my + mh * t };
      }
    };

    const drawPartitionDoor = (x: number, y: number, label: string, swingLeft: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.8;
      
      const width = 24;
      // Eraser line cut in wall
      ctx.beginPath();
      ctx.moveTo(-width / 2, 0);
      ctx.lineTo(width / 2, 0);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3.5;
      ctx.stroke();
      
      // Door leaf swinging open
      ctx.save();
      ctx.translate(-width / 2, 0);
      ctx.rotate(swingLeft ? -Math.PI / 4 : -3 * Math.PI / 4);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.stroke();
      
      // Swing arc
      ctx.beginPath();
      ctx.arc(0, 0, width, 0, swingLeft ? -Math.PI / 4 : -Math.PI / 2, true);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 1]);
      ctx.stroke();
      ctx.restore();
      
      ctx.fillStyle = "#475569";
      ctx.font = "bold 6px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 10);
      ctx.restore();
    };

    const drawLighting = () => {
      const isConquet = opts.configurationType === "Conquet";
      if (!isConquet && (!opts.eclairageType || opts.eclairageType === "none")) return;
      ctx.save();
      
      let realLength = 6.09;
      let realWidth = 2.42;
      if (type.startsWith("B5")) realLength = 5.09;
      else if (type.startsWith("B4")) realLength = 4.09;
      else if (type === "S1") { realLength = 1.18; realWidth = 1.18; }
      else if (type === "SS1" || type === "SD1") { realLength = 1.18; realWidth = 2.42; }
      else if (type === "SD2" || type === "SDU" || type === "SSU") { realLength = 2.30; realWidth = 2.42; }
      else if (type === "Sanitaire 6m") { realLength = 6.09; realWidth = 2.42; }
      else if (type.startsWith("C10'")) realLength = 3.00;
      else if (type.startsWith("C8'")) realLength = 2.22;

      const pxPerMeterX = mw / realLength;
      const pxPerMeterY = mh / realWidth;

      const neonFill = "#fef08a"; // glowing yellow/white
      const neonBorder = "#eab308";
      
      if (isConquet || opts.eclairageType === "neons") {
        // Draw exactly 2 vertical 120cm neons parallel to the 242cm width
        const neonLength = 1.20 * pxPerMeterY;
        const neonYStart = my + (mh - neonLength) / 2;
        const xPositions = [mx + mw * 0.33, mx + mw * 0.67];

        xPositions.forEach((lx, index) => {
          // Outer glow
          ctx.shadowColor = neonBorder;
          ctx.shadowBlur = 8;
          ctx.fillStyle = neonFill;
          ctx.strokeStyle = neonBorder;
          ctx.lineWidth = 1.5;
          
          // Draw vertical capsule (parallel to width)
          ctx.beginPath();
          ctx.roundRect(lx - 3, neonYStart, 6, neonLength, 3);
          ctx.fill();
          ctx.stroke();
          
          ctx.shadowBlur = 0; // reset shadow
          ctx.fillStyle = "#854d0e";
          ctx.font = "bold 6.5px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`NÉON 120cm #${index + 1}`, lx, neonYStart - 6);
        });
      } else if (opts.eclairageType === "led") {
        // Draw exactly 2 LED tiles of 50x50cm
        const ledW = 0.50 * pxPerMeterX;
        const ledH = 0.50 * pxPerMeterY;
        const tileY = my + (mh - ledH) / 2;
        const xPositions = [mx + mw * 0.33 - ledW / 2, mx + mw * 0.67 - ledW / 2];

        xPositions.forEach((lx, index) => {
          ctx.shadowColor = "#fcd34d";
          ctx.shadowBlur = 6;
          ctx.fillStyle = "#fffbeb";
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 1.5;
          ctx.fillRect(lx, tileY, ledW, ledH);
          ctx.strokeRect(lx, tileY, ledW, ledH);
          
          // Draw standard electrical ceiling 'X' cross inside
          ctx.beginPath();
          ctx.moveTo(lx, tileY);
          ctx.lineTo(lx + ledW, tileY + ledH);
          ctx.moveTo(lx + ledW, tileY);
          ctx.lineTo(lx, tileY + ledH);
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#b45309";
          ctx.font = "bold 6.5px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`LED 50x50 #${index + 1}`, lx + ledW / 2, tileY - 6);
        });
      }
      ctx.restore();
    };

    const drawPeripheryEvier = (side: string, t: number, label: string) => {
      const coords = getPeripheryCoords(side, t);
      ctx.save();
      
      const cuisW = opts.cuisine120 ? 46 : 34; // along wall length
      const cuisH = 22; // thickness inward
      
      let bx = coords.x;
      let by = coords.y;
      
      ctx.translate(bx, by);
      if (side === "left") {
        // Left wall, draw rectangle projecting to the right (interior)
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.fillRect(2, -cuisW / 2, cuisH, cuisW);
        ctx.strokeRect(2, -cuisW / 2, cuisH, cuisW);
        
        ctx.beginPath();
        ctx.arc(cuisH / 2 + 2, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#e2e8f0";
        ctx.fill();
        ctx.stroke();
      } else if (side === "right") {
        // Right wall, draw rectangle projecting left
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.fillRect(-2 - cuisH, -cuisW / 2, cuisH, cuisW);
        ctx.strokeRect(-2 - cuisH, -cuisW / 2, cuisH, cuisW);
        
        ctx.beginPath();
        ctx.arc(-cuisH / 2 - 2, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#e2e8f0";
        ctx.fill();
        ctx.stroke();
      } else if (side === "top") {
        // Top wall, draw rectangle projecting down
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.fillRect(-cuisW / 2, 2, cuisW, cuisH);
        ctx.strokeRect(-cuisW / 2, 2, cuisW, cuisH);
        
        ctx.beginPath();
        ctx.arc(0, cuisH / 2 + 2, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#e2e8f0";
        ctx.fill();
        ctx.stroke();
      } else { // bottom
        // Bottom wall, draw rectangle projecting up
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.fillRect(-cuisW / 2, -2 - cuisH, cuisW, cuisH);
        ctx.strokeRect(-cuisW / 2, -2 - cuisH, cuisW, cuisH);
        
        ctx.beginPath();
        ctx.arc(0, -cuisH / 2 - 2, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#e2e8f0";
        ctx.fill();
        ctx.stroke();
      }
      
      // Label
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 7px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ÉVIER", 0, 0);
      
      // Handle bubble
      ctx.fillStyle = "rgba(217, 108, 15, 0.25)";
      ctx.strokeStyle = "#D96C0F";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    };

    // Draw draggable doors
    const drawPeripheryDoor = (side: string, t: number, label: string) => {
      const coords = getPeripheryCoords(side, t);
      ctx.save();
      ctx.translate(coords.x, coords.y);
      if (side === "left" || side === "right") {
        ctx.rotate(Math.PI / 2);
      }
      
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#1e293b"; // dark neutral
      ctx.lineWidth = 2.5;
      const doorW = 34;
      
      // Draw the door opening rectangle
      ctx.fillRect(-doorW / 2, -3, doorW, 6);
      ctx.strokeRect(-doorW / 2, -3, doorW, 6);
      
      // Swing arc
      ctx.beginPath();
      ctx.arc(-doorW / 2, 0, doorW, 0, -Math.PI / 2, true);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      
      let textOffset = 15;
      if (side === "bottom") textOffset = -10;
      ctx.fillText(label, 0, textOffset);
      
      // Drag handle bubble
      ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    };

    // Draw draggable windows
    const drawPeripheryWindow = (side: string, t: number, label: string) => {
      const coords = getPeripheryCoords(side, t);
      ctx.save();
      ctx.translate(coords.x, coords.y);
      if (side === "left" || side === "right") {
        ctx.rotate(Math.PI / 2);
      }
      
      ctx.fillStyle = "#f1f5f9";
      ctx.strokeStyle = "#0284c7"; // slate blue window
      ctx.lineWidth = 2.5;
      const winW = 44;
      
      ctx.fillRect(-winW / 2, -3, winW, 6);
      ctx.strokeRect(-winW / 2, -3, winW, 6);
      
      // Split line inside window
      ctx.beginPath();
      ctx.moveTo(-winW / 2, 0);
      ctx.lineTo(winW / 2, 0);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#0369a1";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      
      let textOffset = 15;
      if (side === "bottom") textOffset = -10;
      ctx.fillText(label, 0, textOffset);
      
      // Drag handle bubble
      ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    };

    // Draw draggable electric socket
    const drawPeripheryOutlet = (side: string, t: number, label: string) => {
      const coords = getPeripheryCoords(side, t);
      ctx.save();
      ctx.translate(coords.x, coords.y);
      
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#4338ca"; // Indigo for outlets
      ctx.lineWidth = 2;
      ctx.stroke();

      // two pins
      ctx.fillStyle = "#4338ca";
      ctx.beginPath();
      ctx.arc(-2, 0, 1, 0, Math.PI * 2);
      ctx.arc(2, 0, 1, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.font = "700 7px sans-serif";
      ctx.textAlign = "center";
      let textOffset = 13;
      if (side === "bottom") textOffset = -10;
      ctx.fillText(label, 0, textOffset);

      ctx.restore();
    };

    // Draw draggable RJ45 plug
    const drawPeripheryRJ45 = (side: string, t: number, label: string) => {
      const coords = getPeripheryCoords(side, t);
      ctx.save();
      ctx.translate(coords.x, coords.y);
      
      ctx.fillStyle = "#0d9488"; // Teal for RJ45
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = "#115e59";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -6, 12, 12);

      // Inner icon details (grid/bars representation)
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 6px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("RJ", 0, 0);

      // Label
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 7px sans-serif";
      ctx.textAlign = "center";
      let textOffset = 13;
      if (side === "bottom") textOffset = -10;
      ctx.fillText(label, 0, textOffset);

      ctx.restore();
    };

    // Draw draggable Clim or Trappe
    const drawPeripheryClimTrappe = (side: string, t: number, mode: "CLIM" | "TRAPPE") => {
      const coords = getPeripheryCoords(side, t);
      ctx.save();
      ctx.translate(coords.x, coords.y);
      if (side === "left" || side === "right") {
        ctx.rotate(Math.PI / 2);
      }

      const wSize = 34;
      const hSize = 10;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = mode === "CLIM" ? "#dc2626" : "#d97706";
      ctx.lineWidth = 2.5;

      if (mode === "TRAPPE") {
        ctx.setLineDash([3, 2]);
      }
      ctx.fillRect(-wSize / 2, -hSize / 2, wSize, hSize);
      ctx.strokeRect(-wSize / 2, -hSize / 2, wSize, hSize);
      ctx.setLineDash([]);

      ctx.fillStyle = mode === "CLIM" ? "#dc2626" : "#d97706";
      ctx.font = "900 7px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Include exact size in label if selected
      let finalLabel: string = mode;
      if (mode === "CLIM" && opts.climTaille) {
        finalLabel = `CLIM ${opts.climTaille}`;
        if (opts.climTaille === "autre" && opts.climTailleAutre) {
          finalLabel = opts.climTailleAutre;
        }
      } else if (mode === "TRAPPE" && opts.trappeTaille) {
        finalLabel = `TRAP ${opts.trappeTaille}`;
      }

      ctx.fillText(finalLabel, 0, 0);

      // Label below
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 7px sans-serif";
      let textOffset = 13;
      if (side === "bottom") textOffset = -10;
      ctx.fillText(mode === "CLIM" ? "Climatiseur" : "Trappe", 0, textOffset);

      ctx.restore();
    };

    // Draw draggable electrical arrival
    const drawPeripheryAlim = (side: string, t: number) => {
      const coords = getPeripheryCoords(side, t);
      ctx.save();
      ctx.translate(coords.x, coords.y);
      if (side === "left") {
        // no rotation
      } else if (side === "right") {
        ctx.rotate(Math.PI);
      } else if (side === "top") {
        ctx.rotate(Math.PI / 2);
      } else if (side === "bottom") {
        ctx.rotate(-Math.PI / 2);
      }

      // Arrow pointing right into the wall (towards x=0)
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(0, 0);
      ctx.strokeStyle = "#ea580c"; // orange arrow
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Arrow head touching wall at x=0
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-5, -4);
      ctx.moveTo(0, 0);
      ctx.lineTo(-5, 4);
      ctx.strokeStyle = "#ea580c";
      ctx.stroke();

      // Text ALIM
      ctx.fillStyle = "#ea580c";
      ctx.font = "900 7px sans-serif";
      ctx.fillText("ALIM", -25, -6);

      // 2 Double sockets inside in prolongement of the arrow
      // Socket 1
      ctx.beginPath();
      ctx.arc(10, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Socket 2
      ctx.beginPath();
      ctx.arc(20, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    // Helper to draw interrupteur or detecteur next to a door
    const drawSwitchNextToDoor = (doorSide: string, doorT: number) => {
      if (!opts.commandeEclairage || opts.commandeEclairage === "none") return;
      
      const doorCoords = getPeripheryCoords(doorSide, doorT);
      let offset = { dx: 18, dy: -10 }; // default
      if (doorSide === "bottom") offset = { dx: 20, dy: -12 };
      else if (doorSide === "top") offset = { dx: 20, dy: 12 };
      else if (doorSide === "left") offset = { dx: 12, dy: -18 };
      else if (doorSide === "right") offset = { dx: -12, dy: -18 };

      const sx = doorCoords.x + offset.dx;
      const sy = doorCoords.y + offset.dy;

      ctx.save();
      if (opts.commandeEclairage === "interrupteur") {
        // Draw little switch icon: square with a circle or switch lever
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        ctx.fillRect(sx - 5, sy - 5, 10, 10);
        ctx.strokeRect(sx - 5, sy - 5, 10, 10);
        
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy + 3);
        ctx.lineTo(sx + 3, sy - 3);
        ctx.strokeStyle = "#000000";
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "700 6px sans-serif";
        ctx.fillText("INT", sx - 5, sy - 6);
      } else if (opts.commandeEclairage === "detecteur") {
        // Draw motion sensor icon: circle with radiating lines
        ctx.fillStyle = "#D96C0F";
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Radiating line
        ctx.beginPath();
        ctx.arc(sx, sy, 7, -Math.PI / 4, Math.PI / 4);
        ctx.strokeStyle = "#D96C0F";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "700 6px sans-serif";
        ctx.fillText("DET", sx - 5, sy - 6);
      }
      ctx.restore();
    };


    // ================== LAYOUT DRAWS BY TYPE ==================

    if (type.startsWith("B6") || type.startsWith("B5") || type.startsWith("B4")) {
      // 1. Draw baseline dimensions label
      let dimString = "DIMENSIONS : 6.09m x 2.42m";
      if (opts.configurationType === "Conquet") {
        dimString = "DIMENSIONS : 6,09 m x 2,42 m (Implantation Conquet)";
      } else if (type.startsWith("B5")) {
        dimString = "DIMENSIONS : 5.09m x 2.42m";
      } else if (type.startsWith("B4")) {
        dimString = "DIMENSIONS : 4.09m x 2.42m";
      }

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px monospace";
      ctx.fillText(dimString, mx, my + mh + 15);

      // On a B6 pignon, show the exact right wall panels (1 unit, 1 door, 1 panel of 23cm)
      if (type.startsWith("B6") && opts.configurationType === "Pignon") {
        const pxPerMeterY = mh / 2.42;
        const y1 = my + 1.00 * pxPerMeterY;
        const y2 = my + mh - 0.23 * pxPerMeterY;

        ctx.save();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        
        // 1m divider mark
        ctx.beginPath();
        ctx.moveTo(mx + mw - 15, y1);
        ctx.lineTo(mx + mw, y1);
        ctx.stroke();

        // 23cm divider mark
        ctx.beginPath();
        ctx.moveTo(mx + mw - 15, y2);
        ctx.lineTo(mx + mw, y2);
        ctx.stroke();

        // Labels removed per user request: "retirer les écrits sur la largeur de droite hormis les indication PORTE et INT/DET"
        ctx.restore();
      }

      // 2. Draw movable primary Door and movable Window along current periphery ratios
      drawPeripheryDoor(doorPos.side, doorPos.t, "Porte");
      drawPeripheryWindow(winPos.side, winPos.t, "Fenêtre");

      // 3. Draw interrupteur next to the primary door
      drawSwitchNextToDoor(doorPos.side, doorPos.t);

      // Draw luminaires based on selection (neon or led tiles with true visual symbols)
      drawLighting();

      // 4. Electrical arrival alignment (Movable orange/yellow arrow)
      drawPeripheryAlim(alimPos.side, alimPos.t);


      // 5. Clim or Trappe features (mobile around the periphery!)
      if (opts.climTrappe && opts.climTrappe !== "none") {
        drawPeripheryClimTrappe(climTrappePos.side, climTrappePos.t, opts.climTrappe === "Clim" ? "CLIM" : "TRAPPE");
      }

      // 6. Draw any custom added periphery elements
      customElements.forEach((el) => {
        if (el.type === "door") drawPeripheryDoor(el.side, el.t, "Porte ADD");
        if (el.type === "window") drawPeripheryWindow(el.side, el.t, "Fenêtre ADD");
        if (el.type === "outlet") drawPeripheryOutlet(el.side, el.t, "Prise Elec");
        if (el.type === "rj45") drawPeripheryRJ45(el.side, el.t, "Prise RJ45");
      });

      // 7. Cuisine / evier options (movable inside layout!)
      if (opts.cuisineType && opts.cuisineType !== "none") {
        drawPeripheryEvier(evierPos.side, evierPos.t, "Évier");
      }

      // 8. Independent dynamic sanitaires (WC and/or Douche count sliders with dynamic REAL scale dimensions relative to module!)
      let realLength = 6.09;
      let realWidth = 2.42;
      if (type.startsWith("B5")) realLength = 5.09;
      if (type.startsWith("B4")) realLength = 4.09;

      const pxPerMeterX = mw / realLength;
      const pxPerMeterY = mh / realWidth;

      const wcCount = opts.wcCount || 0;
      if (wcCount > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.8;
        
        const wcW = Math.round(0.80 * pxPerMeterX); // 80cm wide wc compartment
        const wcH = Math.round(1.15 * pxPerMeterY); // 1.15m deep wc compartment
        
        // Compute position using local wcPos ratio
        const minX = mx + 2;
        const maxX = mx + mw - wcW - 2;
        const minY = my + 2;
        const maxY = my + mh - wcH - 2;

        const startX = Math.max(minX, Math.min(maxX, mx + (mw - wcW) * wcPos.rx));
        const startY = Math.max(minY, Math.min(maxY, my + (mh - wcH) * wcPos.ry));
        
        ctx.fillRect(startX, startY, wcW, wcH);
        ctx.strokeRect(startX, startY, wcW, wcH);

        // toilet seating oval
        ctx.beginPath();
        ctx.ellipse(startX + wcW/2, startY + wcH/2, 4, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`WC x${wcCount}`, startX + wcW/2, startY + wcH/2 + 2);

        // draw a tiny drag-handle bubble in the center of the WC box.
        ctx.beginPath();
        ctx.arc(startX + wcW/2, startY + wcH/2 - 12, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
        ctx.strokeStyle = "#475569";
        ctx.fill();
        ctx.stroke();
      }

      const dCount = opts.doucheCount || (opts.presenceDouche ? 1 : 0);
      if (dCount > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 1.8;
        
        const showerW = Math.round(0.80 * pxPerMeterX); // 80cm
        const showerH = Math.round(0.80 * pxPerMeterY); // 80cm
        
        // Compute position using local douchePos ratio
        const minX = mx + 2;
        const maxX = mx + mw - showerW - 2;
        const minY = my + 2;
        const maxY = my + mh - showerH - 2;

        const startX = Math.max(minX, Math.min(maxX, mx + (mw - showerW) * douchePos.rx));
        const startY = Math.max(minY, Math.min(maxY, my + (mh - showerH) * douchePos.ry));
        
        ctx.fillRect(startX, startY, showerW, showerH);
        ctx.strokeRect(startX, startY, showerW, showerH);

        // Shower diagonal lines showing floor tray drainage slope
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + showerW, startY + showerH);
        ctx.moveTo(startX + showerW, startY);
        ctx.lineTo(startX, startY + showerH);
        ctx.strokeStyle = "#ccfbf1";
        ctx.stroke();

        ctx.strokeStyle = "#0d9488";
        ctx.fillStyle = "#0d9488";
        ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`DCH x${dCount}`, startX + showerW/2, startY + showerH/2 + 2);

        // draw a tiny drag-handle bubble in the center of the shower box.
        ctx.beginPath();
        ctx.arc(startX + showerW/2, startY + showerH/2 - 12, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
        ctx.strokeStyle = "#0d9488";
        ctx.fill();
        ctx.stroke();
      }

      // furniture lines
      let labelY = my + mh / 2 - 12;
      if (opts.mobilier) {
        ctx.fillStyle = "#334155";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "left";
        let mobStrings: string[] = [];
        Object.entries(opts.mobilier).map(([key, val]) => {
          if (val > 0) {
            const displayVal = key === "casier" ? `${val}x2` : val;
            mobStrings.push(`${key}: ${displayVal}`);
          }
        });

        if (mobStrings.length > 0) {
          ctx.fillText("Mobilier répertorié :", mx + mw / 2 - 45, labelY);
          let offset = 10;
          ctx.font = "7px sans-serif";
          mobStrings.forEach((str) => {
            ctx.fillText(str, mx + mw / 2 - 45, labelY + offset);
            offset += 8;
          });
        }
      }

    } else if (type === "S1") {
      // S1: 1.18m x 1.18m square official CAD layout (Image 6)
      const wallThickness = 6;
      
      // Background Grid for CAD Blueprint feel
      ctx.save();
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 0.5;
      for (let x = mx; x < mx + mw; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x, my + mh); ctx.stroke();
      }
      for (let y = my; y < my + mh; y += 15) {
        ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx + mw, y); ctx.stroke();
      }
      ctx.restore();

      // Double Walls of 118x118 container
      ctx.fillStyle = "#cbd5e1"; // elegant wall fill
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx + wallThickness, my + wallThickness, mw - wallThickness*2, mh - wallThickness*2);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.strokeRect(mx + wallThickness, my + wallThickness, mw - wallThickness*2, mh - wallThickness*2);

      // Top-Right Toilet Bowl (with flushing tank) - Matches Image 6 top-right layout
      const wcW = (mw - wallThickness*2) * 0.38;
      const wcH = (mh - wallThickness*2) * 0.52;
      const tcX = mx + mw - wallThickness - wcW - 3;
      const tcY = my + wallThickness + 3;
      
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.2;
      ctx.fillRect(tcX, tcY, wcW, wcH * 0.28);
      ctx.strokeRect(tcX, tcY, wcW, wcH * 0.28);
      ctx.beginPath();
      ctx.ellipse(tcX + wcW/2, tcY + wcH * 0.65, wcW/2.4, wcH/3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.fill();

      ctx.fillStyle = "#475569";
      ctx.font = "bold 6.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WC", tcX + wcW/2, tcY + wcH * 0.65 + 2);

      // Top-Left Lave-mains (Sink) - Matches Image 6 top-left corner
      const sinkSize = (mw - wallThickness*2) * 0.32;
      const skX = mx + wallThickness + 4;
      const skY = my + wallThickness + 4;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(skX, skY, sinkSize, sinkSize * 0.75, 4);
      ctx.fill();
      ctx.stroke();
      // faucet
      ctx.beginPath();
      ctx.arc(skX + sinkSize/2, skY + 2.5, 1.8, 0, Math.PI*2);
      ctx.fillStyle = "#94a3b8";
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#475569";
      ctx.font = "bold 6px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LM", skX + sinkSize/2, skY + sinkSize * 0.5 + 1);

      // Floor siphon/drain in center
      ctx.beginPath();
      ctx.arc(mx + mw/2, my + mh/2, 4.5, 0, Math.PI*2);
      ctx.strokeStyle = "#475569";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx + mw/2 - 3.5, my + mh/2);
      ctx.lineTo(mx + mw/2 + 3.5, my + mh/2);
      ctx.moveTo(mx + mw/2, my + mh/2 - 3.5);
      ctx.lineTo(mx + mw/2, my + mh/2 + 3.5);
      ctx.stroke();

      // Electrical box convector & switch bottom left
      ctx.strokeStyle = "#475569";
      ctx.strokeRect(mx + wallThickness + 3, my + mh - wallThickness - 18, 8, 12);
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(mx + wallThickness + 3, my + mh - wallThickness - 18, 8, 12);
      ctx.fillStyle = "#475569";
      ctx.font = "bold 5px sans-serif";
      ctx.fillText("elec", mx + wallThickness + 7, my + mh - wallThickness - 12);

      // Entry door bottom wall opening out-right (Matches Image 6)
      const doorWidth = (mw - wallThickness*2) * 0.65;
      const doorX = mx + mw/2 - doorWidth/2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(doorX, my + mh - wallThickness, doorWidth, wallThickness);
      
      ctx.save();
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(doorX, my + mh - wallThickness/2);
      const angle = Math.PI / 4.5; // swing angle
      const dEndX = doorX + doorWidth * Math.cos(angle);
      const dEndY = my + mh + doorWidth * Math.sin(angle);
      ctx.lineTo(dEndX, dEndY);
      ctx.stroke();
      // swing arc
      ctx.strokeStyle = "#94a3b8";
      ctx.setLineDash([2, 1.5]);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(doorX, my + mh, doorWidth, 0, angle);
      ctx.stroke();
      ctx.restore();

      // Dimension labels
      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 0.8;
      const dimX = mx + mw + 12;
      ctx.beginPath();
      ctx.moveTo(dimX, my); ctx.lineTo(dimX, my + mh);
      ctx.moveTo(dimX - 3, my); ctx.lineTo(dimX + 3, my);
      ctx.moveTo(dimX - 3, my + mh); ctx.lineTo(dimX + 3, my + mh);
      ctx.stroke();
      // slashes
      ctx.beginPath();
      ctx.moveTo(dimX - 2.5, my - 2.5); ctx.lineTo(dimX + 2.5, my + 2.5);
      ctx.moveTo(dimX - 2.5, my + mh - 2.5); ctx.lineTo(dimX + 2.5, my + mh + 2.5);
      ctx.stroke();

      ctx.fillStyle = "#475569";
      ctx.font = "bold 8.5px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("118", dimX + 5, my + mh/2);

      // Bottom edge horizontal
      const dimY = my + mh + 12;
      ctx.beginPath();
      ctx.moveTo(mx, dimY); ctx.lineTo(mx + mw, dimY);
      ctx.moveTo(mx, dimY - 3); ctx.lineTo(mx, dimY + 3);
      ctx.moveTo(mx + mw, dimY - 3); ctx.lineTo(mx + mw, dimY + 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 2.5, dimY - 2.5); ctx.lineTo(mx + 2.5, dimY + 2.5);
      ctx.moveTo(mx + mw - 2.5, dimY - 2.5); ctx.lineTo(mx + mw + 2.5, dimY + 2.5);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("118", mx + mw/2, dimY + 4);
      ctx.restore();

      // Arrival & Evacuation plumbing arrows at the top
      ctx.save();
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 0.8;
      const ax = mx + mw * 0.35;
      const ay = my - 12;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + 6);
      ctx.lineTo(ax - 1.5, ay + 4); ctx.moveTo(ax, ay + 6); ctx.lineTo(ax + 1.5, ay + 4);
      ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.font = "7.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A", ax, ay - 2);

      const ex = mx + mw * 0.65;
      ctx.beginPath();
      ctx.moveTo(ex, ay + 6); ctx.lineTo(ex, ay);
      ctx.lineTo(ex - 1.5, ay + 2); ctx.moveTo(ex, ay); ctx.lineTo(ex + 1.5, ay + 2);
      ctx.stroke();
      ctx.fillText("E", ex, ay - 2);
      ctx.restore();

      // Top right label: "WC à l'anglaise"
      ctx.fillStyle = "#475569";
      ctx.fillRect(mx + mw - 70, my - 12, 70, 9);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 5.5px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("WC à l'anglaise", mx + mw - 35, my - 7.5);

    } else if (type === "SS1" || type === "SD1") {
      // 1.18m x 2.42m Layouts
      const wallThickness = 6;
      
      // Background Grid
      ctx.save();
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 0.5;
      for (let x = mx; x < mx + mw; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x, my + mh); ctx.stroke();
      }
      for (let y = my; y < my + mh; y += 15) {
        ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx + mw, y); ctx.stroke();
      }
      ctx.restore();

      // Double Walls
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx + wallThickness, my + wallThickness, mw - wallThickness*2, mh - wallThickness*2);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.strokeRect(mx + wallThickness, my + wallThickness, mw - wallThickness*2, mh - wallThickness*2);

      // Central divider wall
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mx + mw/2, my + wallThickness);
      ctx.lineTo(mx + mw/2, my + mh - wallThickness);
      ctx.stroke();

      if (type === "SD1") {
        // SD1 Layout: WC right, Shower & LM left (Image 2)
        // Left chamber (Shower & water heater CE50L)
        const shSize = (mh - wallThickness*2) * 0.65;
        const leftAreaX = mx + wallThickness;
        const leftAreaY = my + wallThickness;
        const leftAreaW = mw/2 - wallThickness;
        
        // Shower cabin top-left
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 1.5;
        ctx.fillRect(leftAreaX + 3, leftAreaY + 3, shSize, shSize);
        ctx.strokeRect(leftAreaX + 3, leftAreaY + 3, shSize, shSize);
        // drain lines
        ctx.beginPath();
        ctx.moveTo(leftAreaX + 3, leftAreaY + 3); ctx.lineTo(leftAreaX + 3 + shSize, leftAreaY + 3 + shSize);
        ctx.moveTo(leftAreaX + 3 + shSize, leftAreaY + 3); ctx.lineTo(leftAreaX + 3, leftAreaY + 3 + shSize);
        ctx.strokeStyle = "#ccfbf1";
        ctx.stroke();

        ctx.fillStyle = "#0d9488";
        ctx.font = "bold 6.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DOUCHE", leftAreaX + 3 + shSize/2, leftAreaY + 3 + shSize/2 + 2);

        // Water Heater "CE50L" next to Partition
        ctx.beginPath();
        const ceCenterX = mx + mw/2 - 13;
        const ceCenterY = my + wallThickness + 14;
        ctx.arc(ceCenterX, ceCenterY, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = "#e0f2fe";
        ctx.fill();
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#0369a1";
        ctx.font = "bold 5px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CE50L", ceCenterX, ceCenterY);

        // Washbasin (LM) inside left room near door
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(leftAreaX + 4, my + mh - wallThickness - 18, 12, 10, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "5px sans-serif";
        ctx.fillText("LM", leftAreaX + 10, my + mh - wallThickness - 13);

        // Siphon/Drain floor
        ctx.beginPath();
        ctx.arc(leftAreaX + leftAreaW/2 + 6, my + mh/2 + 8, 3.5, 0, Math.PI*2);
        ctx.strokeStyle = "#94a3b8";
        ctx.stroke();

        // Left Room Door opening outwards
        const dSizeL = leftAreaW * 0.7;
        const dXL = leftAreaX + leftAreaW - 6 - dSizeL;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(dXL, my + mh - wallThickness, dSizeL, wallThickness);
        // Leaf
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(dXL + dSizeL, my + mh - wallThickness/2);
        const angL = Math.PI / 4.5;
        ctx.lineTo(dXL + dSizeL - dSizeL * Math.cos(angL), my + mh + dSizeL * Math.sin(angL));
        ctx.stroke();

        // Right Chamber (WC block)
        const rightAreaX = mx + mw/2;
        const rightAreaW = mw/2 - wallThickness;
        const wcW = rightAreaW * 0.42;
        const wcH = (mh - wallThickness*2) * 0.52;
        const wcX = mx + mw - wallThickness - wcW - 6;
        const wcY = my + wallThickness + 4;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.2;
        ctx.fillRect(wcX, wcY, wcW, wcH * 0.28);
        ctx.strokeRect(wcX, wcY, wcW, wcH * 0.28);
        ctx.beginPath();
        ctx.ellipse(wcX + wcW/2, wcY + wcH * 0.65, wcW/2.4, wcH/3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#f8fafc";
        ctx.fill();
        ctx.fillStyle = "#475569";
        ctx.font = "bold 6.5px sans-serif";
        ctx.fillText("WC", wcX + wcW/2, wcY + wcH * 0.65 + 2);

        // Toilet chamber floor drain
        ctx.beginPath();
        ctx.arc(rightAreaX + rightAreaW/2, my + mh/2 + 5, 3.5, 0, Math.PI*2);
        ctx.stroke();

        // Right Room Door opening outwards to right
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(rightAreaX + 6, my + mh - wallThickness, dSizeL, wallThickness);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(rightAreaX + 6, my + mh - wallThickness/2);
        ctx.lineTo(rightAreaX + 6 + dSizeL * Math.cos(angL), my + mh + dSizeL * Math.sin(angL));
        ctx.stroke();

        // Partition Subtitle
        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 5.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PAROI SURBAISSÉE", mx + mw/2, my + mh - 12);

        // Arrows A & E top right
        ctx.save();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 0.8;
        const ax = rightAreaX + rightAreaW * 0.4;
        const ay = my - 12;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay+6); ctx.stroke();
        ctx.fillStyle = "#475569"; ctx.font = "7px sans-serif"; ctx.fillText("A", ax, ay-1);

        const ex = rightAreaX + rightAreaW * 0.7;
        ctx.beginPath(); ctx.moveTo(ex, ay+6); ctx.lineTo(ex, ay); ctx.stroke();
        ctx.fillText("E", ex, ay-1);
        ctx.restore();

        // Text Header "WC à l'anglaise"
        ctx.fillStyle = "#475569";
        ctx.fillRect(mx + mw - 70, my - 12, 70, 9);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 5.5px sans-serif";
        ctx.fillText("WC à l'anglaise", mx + mw - 35, my - 7.5);

      } else {
        // SS1 Layout: Two identical WC cabins (Image 7)
        // Left Chamber
        const leftX = mx + wallThickness;
        const rightX = mx + mw/2;
        const cabW = mw/2 - wallThickness;

        const drawWCCabin = (cX: number, doorOutRight: boolean) => {
          // Lave-mains top-left
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(cX + 3, my + wallThickness + 4, 11, 8, 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#475569";
          ctx.font = "5px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("LM", cX + 8.5, my + wallThickness + 9);

          // WC top-right
          const wcW = cabW * 0.38;
          const wcH = (mh - wallThickness*2) * 0.52;
          const wcX = cX + cabW - wcW - 4;
          const wcY = my + wallThickness + 4;
          ctx.strokeRect(wcX, wcY, wcW, wcH * 0.28);
          ctx.beginPath();
          ctx.ellipse(wcX + wcW/2, wcY + wcH * 0.65, wcW/2.4, wcH/3, 0, 0, Math.PI*2);
          ctx.stroke();
          ctx.fillText("WC", wcX + wcW/2, wcY + wcH*0.7);

          // Floor Siphon
          ctx.beginPath(); ctx.arc(cX + cabW/2, my + mh/2 + 6, 3.5, 0, Math.PI*2); ctx.stroke();

          // Door bottom
          const dS = cabW * 0.65;
          ctx.fillStyle = "#ffffff";
          if (doorOutRight) {
            ctx.fillRect(cX + 5, my + mh - wallThickness, dS, wallThickness);
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(cX + 5, my + mh - wallThickness/2);
            ctx.lineTo(cX + 5 + dS * Math.cos(Math.PI/4.5), my + mh + dS * Math.sin(Math.PI/4.5));
            ctx.stroke();
          } else {
            ctx.fillRect(cX + cabW - dS - 5, my + mh - wallThickness, dS, wallThickness);
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(cX + cabW - 5, my + mh - wallThickness/2);
            ctx.lineTo(cX + cabW - 5 - dS * Math.cos(Math.PI/4.5), my + mh + dS * Math.sin(Math.PI/4.5));
            ctx.stroke();
          }
        };

        drawWCCabin(leftX, false);
        drawWCCabin(rightX, true);

        // Header
        ctx.fillStyle = "#475569";
        ctx.fillRect(mx + mw - 70, my - 12, 70, 9);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 5.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Double WC SS1", mx + mw - 35, my - 7.5);
      }

      // Dimensions: bottom "242" & right "118"
      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 0.8;
      // Right vertical
      const dimX = mx + mw + 12;
      ctx.beginPath(); ctx.moveTo(dimX, my); ctx.lineTo(dimX, my + mh);
      ctx.moveTo(dimX - 3, my); ctx.lineTo(dimX + 3, my);
      ctx.moveTo(dimX - 3, my + mh); ctx.lineTo(dimX + 3, my + mh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dimX - 2.5, my - 2.5); ctx.lineTo(dimX + 2.5, my + 2.5);
      ctx.moveTo(dimX - 2.5, my + mh - 2.5); ctx.lineTo(dimX + 2.5, my + mh + 2.5);
      ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(type === "SS1" ? "120" : "118", dimX + 5, my + mh/2);

      // Bottom horizontal
      const dimY = my + mh + 12;
      ctx.beginPath(); ctx.moveTo(mx, dimY); ctx.lineTo(mx + mw, dimY);
      ctx.moveTo(mx, dimY - 3); ctx.lineTo(mx, dimY + 3);
      ctx.moveTo(mx + mw, dimY - 3); ctx.lineTo(mx + mw, dimY + 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 2.5, dimY - 2.5); ctx.lineTo(mx + 2.5, dimY + 2.5);
      ctx.moveTo(mx + mw - 2.5, dimY - 2.5); ctx.lineTo(mx + mw + 2.5, dimY + 2.5);
      ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("242", mx + mw/2, dimY + 4);
      ctx.restore();

    } else if (type === "SD2" || type === "SDU" || type === "SSU") {
      // 2.30m x 2.42m Square modules (Image 3, 4, 5)
      const wallThickness = 6;
      
      // Background Grid
      ctx.save();
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 0.5;
      for (let x = mx; x < mx + mw; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x, my + mh); ctx.stroke();
      }
      for (let y = my; y < my + mh; y += 15) {
        ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(mx + mw, y); ctx.stroke();
      }
      ctx.restore();

      // Double Walls of container
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx + wallThickness, my + wallThickness, mw - wallThickness*2, mh - wallThickness*2);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.strokeRect(mx + wallThickness, my + wallThickness, mw - wallThickness*2, mh - wallThickness*2);

      // Horizontal central dividing wall
      const partitionY = my + mh/2;
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mx + wallThickness, partitionY);
      ctx.lineTo(mx + mw - wallThickness, partitionY);
      ctx.stroke();

      if (type === "SD2") {
        // SD2 layout - Shower Cabin left, Toilet Cabin right, vestibule bottom (Image 3)
        // Draw vertical wall dividing top half
        ctx.beginPath();
        ctx.moveTo(mx + mw/2, my + wallThickness);
        ctx.lineTo(mx + mw/2, partitionY);
        ctx.stroke();

        // 1. Top left shower cabin
        const topW = mw/2 - wallThickness;
        const topH = mh/2 - wallThickness;
        const shSize = Math.min(topW, topH) * 0.75;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 1.5;
        ctx.fillRect(mx + wallThickness + 4, my + wallThickness + 4, shSize, shSize);
        ctx.strokeRect(mx + wallThickness + 4, my + wallThickness + 4, shSize, shSize);
        ctx.beginPath();
        ctx.moveTo(mx + wallThickness + 4, my + wallThickness + 4);
        ctx.lineTo(mx + wallThickness + 4 + shSize, my + wallThickness + 4 + shSize);
        ctx.moveTo(mx + wallThickness + 4 + shSize, my + wallThickness + 4);
        ctx.lineTo(mx + wallThickness + 4, my + wallThickness + 4 + shSize);
        ctx.strokeStyle = "#ccfbf1";
        ctx.stroke();
        ctx.fillStyle = "#0d9488";
        ctx.font = "bold 6px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Douche", mx + wallThickness + 4 + shSize/2, my + wallThickness + 4 + shSize/2 + 2);

        // Shower partition door swing inwards/outwards (porte surbaissée)
        ctx.save();
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(mx + mw*0.25, partitionY);
        ctx.lineTo(mx + mw*0.25 - 12 * Math.cos(Math.PI/6), partitionY + 12 * Math.sin(Math.PI/6));
        ctx.stroke();
        ctx.restore();

        // 2. Top-right WC with Chauffe-eau
        const wcW = topW * 0.38;
        const wcH = topH * 0.65;
        const wcX = mx + mw - wallThickness - wcW - 6;
        const wcY = my + wallThickness + 4;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.2;
        ctx.fillRect(wcX, wcY, wcW, wcH * 0.28);
        ctx.strokeRect(wcX, wcY, wcW, wcH * 0.28);
        ctx.beginPath();
        ctx.ellipse(wcX + wcW/2, wcY + wcH * 0.65, wcW/2.4, wcH/3, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "bold 6px sans-serif";
        ctx.fillText("WC", wcX + wcW/2, wcY + wcH * 0.65 + 1.5);

        // "ch.eau" next to WC
        ctx.beginPath();
        const ceCenterX = mx + mw/2 + 13;
        const ceCenterY = my + wallThickness + 14;
        ctx.arc(ceCenterX, ceCenterY, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#e0f2fe";
        ctx.fill();
        ctx.strokeStyle = "#0284c7";
        ctx.stroke();
        ctx.fillStyle = "#0369a1";
        ctx.font = "bold 5px sans-serif";
        ctx.fillText("ch.eau", ceCenterX, ceCenterY + 1.5);

        // Toilet partition door swing
        ctx.save();
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(mx + mw*0.75, partitionY);
        ctx.lineTo(mx + mw*0.75 + 12 * Math.cos(Math.PI/6), partitionY + 12 * Math.sin(Math.PI/6));
        ctx.stroke();
        ctx.restore();

        // 3. Bottom compartment (Vanity/Lavabo left, convector & entrance right)
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        const vW = mw * 0.35;
        const vH = mh * 0.16;
        ctx.fillRect(mx + wallThickness + 4, my + mh - wallThickness - vH - 4, vW, vH);
        ctx.strokeRect(mx + wallThickness + 4, my + mh - wallThickness - vH - 4, vW, vH);
        ctx.beginPath();
        ctx.arc(mx + wallThickness + 4 + vW/2, my + mh - wallThickness - vH/2 - 4, 5, 0, Math.PI*2);
        ctx.fillStyle = "#e2e8f0";
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "bold 6px sans-serif";
        ctx.fillText("Lavabo", mx + wallThickness + 4 + vW/2, my + mh - wallThickness - 2);

        // Convector
        ctx.strokeRect(mx + mw - wallThickness - 18, my + mh/2 + 8, 12, 6);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(mx + mw - wallThickness - 18, my + mh/2 + 8, 12, 6);
        ctx.fillStyle = "#475569";
        ctx.font = "4.5px sans-serif";
        ctx.fillText("conv", mx + mw - wallThickness - 12, my + mh/2 + 12);

        // Entrance door bottom right
        const dS = mw * 0.28;
        const dX = mx + mw - wallThickness - dS - 6;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(dX, my + mh - wallThickness, dS, wallThickness);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(dX + dS, my + mh - wallThickness/2);
        ctx.lineTo(dX + dS + dS*Math.cos(Math.PI/4), my + mh + dS*Math.sin(Math.PI/4));
        ctx.stroke();

        // Floor siphons in partition vestibule and lobby
        ctx.beginPath();
        ctx.arc(mx + mw*0.25, my + mh - 26, 3.5, 0, Math.PI*2);
        ctx.arc(mx + mw*0.75, my + mh - 26, 3.5, 0, Math.PI*2);
        ctx.stroke();

        // Header Title
        ctx.fillStyle = "#475569";
        ctx.fillRect(mx + mw - 70, my - 12, 70, 9);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 5.5px sans-serif";
        ctx.fillText("Sanitaire SD2", mx + mw - 35, my - 7.5);

      } else if (type === "SDU") {
        // SDU layout - Handicapped PMR version (Image 4)
        // 1. PMR wide elements, top-left open shower
        const dSize = Math.min(mw, mh) * 0.38;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 1.5;
        ctx.fillRect(mx + wallThickness + 4, my + wallThickness + 4, dSize, dSize);
        ctx.strokeRect(mx + wallThickness + 4, my + wallThickness + 4, dSize, dSize);
        ctx.beginPath();
        ctx.moveTo(mx + wallThickness + 4, my + wallThickness + 4);
        ctx.lineTo(mx + wallThickness + 4 + dSize, my + wallThickness + 4 + dSize);
        ctx.strokeStyle = "#ccfbf1";
        ctx.stroke();
        ctx.fillStyle = "#0d9488";
        ctx.font = "bold 6px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DCH PMR", mx + wallThickness + 4 + dSize/2, my + wallThickness + 4 + dSize/2 + 2);

        // Shower curtain line
        ctx.strokeStyle = "#94a3b8";
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(mx + wallThickness + 4 + dSize, my + wallThickness);
        ctx.lineTo(mx + wallThickness + 4 + dSize, my + wallThickness + 4 + dSize);
        ctx.stroke();
        ctx.restore();

        // 2. Top-right WC with double Grab Rails "DM" (Dispositif Médicalized PMR)
        const wcW = mw * 0.16;
        const wcH = mh * 0.28;
        const wcX = mx + mw - wallThickness - wcW - 14;
        const wcY = my + wallThickness + 4;
        
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.2;
        ctx.fillRect(wcX, wcY, wcW, wcH * 0.3);
        ctx.strokeRect(wcX, wcY, wcW, wcH * 0.3);
        ctx.beginPath();
        ctx.ellipse(wcX + wcW/2, wcY + wcH * 0.65, wcW/2.2, wcH/3, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "bold 6px sans-serif";
        ctx.fillText("WC PMR", wcX + wcW/2, wcY + wcH * 0.65 + 1.5);

        // Grab bars (DM) on both left & right of toilet
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.8;
        // left bar
        ctx.beginPath(); ctx.moveTo(wcX - 6, wcY + 2); ctx.lineTo(wcX - 6, wcY + wcH); ctx.stroke();
        // right bar
        ctx.beginPath(); ctx.moveTo(wcX + wcW + 6, wcY + 2); ctx.lineTo(wcX + wcW + 6, wcY + wcH); ctx.stroke();
        ctx.fillStyle = "#3b82f6";
        ctx.font = "bold 5px sans-serif";
        ctx.fillText("DM", wcX - 12, wcY + wcH/2);
        ctx.fillText("DM", wcX + wcW + 12, wcY + wcH/2);

        // "ch.eau" next to toilet
        ctx.beginPath();
        const ceX = wcX - 25;
        const ceY = my + wallThickness + 12;
        ctx.arc(ceX, ceY, 7.5, 0, Math.PI*2);
        ctx.fillStyle = "#e0f2fe";
        ctx.fill();
        ctx.strokeStyle = "#0284c7";
        ctx.stroke();
        ctx.fillStyle = "#0369a1";
        ctx.font = "bold 4.5px sans-serif";
        ctx.fillText("ch.eau", ceX, ceY + 1.5);

        // 3. Wide PMR sink in bottom room
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        const sinkW = mw * 0.28;
        const sinkH = mh * 0.12;
        ctx.fillRect(mx + wallThickness + 4, my + mh - wallThickness - sinkH - 4, sinkW, sinkH);
        ctx.strokeRect(mx + wallThickness + 4, my + mh - wallThickness - sinkH - 4, sinkW, sinkH);
        ctx.beginPath();
        ctx.arc(mx + wallThickness + 4 + sinkW/2, my + mh - wallThickness - sinkH/2 - 4, 4, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "bold 5.5px sans-serif";
        ctx.fillText("Évier PMR", mx + wallThickness + 4 + sinkW/2, my + mh - wallThickness - 1);

        // Wide sliding or pivot entrance door
        const dS = mw * 0.38;
        const dX = mx + mw - wallThickness - dS - 8;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(dX, my + mh - wallThickness, dS, wallThickness);
        ctx.strokeStyle = "#3b82f6"; // highlight PMR path
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dX + dS, my + mh - wallThickness/2);
        ctx.lineTo(dX + dS + dS*Math.cos(Math.PI/5), my + mh + dS*Math.sin(Math.PI/5));
        ctx.stroke();

        // Floor drain circle
        ctx.beginPath();
        ctx.arc(mx + mw/2, my + mh/2 + 20, 3.5, 0, Math.PI*2);
        ctx.strokeStyle = "#475569";
        ctx.stroke();

        // Header Title
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(mx + mw - 70, my - 12, 70, 9);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 5.5px sans-serif";
        ctx.fillText("Sanitaire PMR SDU", mx + mw - 35, my - 7.5);

      } else {
        // SSU layout - Double Toilet block shared corridor (Image 5)
        // Divide top section into two WC cubicles
        ctx.beginPath();
        ctx.moveTo(mx + mw/2, my + wallThickness);
        ctx.lineTo(mx + mw/2, partitionY);
        ctx.stroke();

        // Draw double WC bowls inside top cabins (WC A and WC B)
        const topW = mw/2 - wallThickness;
        const topH = mh/2 - wallThickness;
        const wcW = topW * 0.38;
        const wcH = topH * 0.65;

        const drawCabinSymbols = (cX: number, name: string) => {
          const x = cX + topW/2 - wcW/2;
          const y = my + wallThickness + 4;
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1.2;
          ctx.fillRect(x, y, wcW, wcH * 0.3);
          ctx.strokeRect(x, y, wcW, wcH * 0.3);
          ctx.beginPath();
          ctx.ellipse(x + wcW/2, y + wcH*0.65, wcW/2.4, wcH/3, 0, 0, Math.PI*2);
          ctx.stroke();
          ctx.fillStyle = "#475569";
          ctx.font = "bold 6px sans-serif";
          ctx.fillText(name, x + wcW/2, y + wcH*0.65 + 1.5);

          // Inward opening door layout swing
          ctx.save();
          ctx.strokeStyle = "#94a3b8";
          ctx.setLineDash([1, 1]);
          ctx.beginPath();
          ctx.arc(cX + topW * 0.25, partitionY, 12, 0, Math.PI/2);
          ctx.stroke();
          ctx.restore();
        };

        drawCabinSymbols(mx + wallThickness, "WC A");
        drawCabinSymbols(mx + mw/2, "WC B");

        // "ch.eau" next to toilet inside cabin A
        ctx.beginPath();
        const ceX = mx + wallThickness + topW - 12;
        const ceY = my + wallThickness + 10;
        ctx.arc(ceX, ceY, 7.5, 0, Math.PI*2);
        ctx.fillStyle = "#e0f2fe";
        ctx.fill();
        ctx.strokeStyle = "#0284c7";
        ctx.stroke();
        ctx.fillStyle = "#0369a1";
        ctx.font = "bold 4.5px sans-serif";
        ctx.fillText("ch.eau", ceX, ceY + 1.5);

        // Urinal bottom left (Image 5)
        const uRadius = Math.min(mw, mh) * 0.05;
        const urX = mx + wallThickness + 14;
        const urY = my + mh - wallThickness - 18;
        ctx.beginPath();
        ctx.arc(urX, urY, uRadius, 0, Math.PI*2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "bold 5.5px sans-serif";
        ctx.fillText("urinoir", urX, urY + 2.5);

        // Double lavabos bottom center
        const lavW = mw * 0.25;
        const lavH = mh * 0.12;
        const lX = mx + mw/2 - lavW/2;
        const lY = my + mh - wallThickness - lavH - 4;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.3;
        ctx.fillRect(lX, lY, lavW, lavH);
        ctx.strokeRect(lX, lY, lavW, lavH);
        ctx.beginPath();
        ctx.arc(lX + lavW*0.3, lY + lavH/2, 3.5, 0, Math.PI*2);
        ctx.arc(lX + lavW*0.7, lY + lavH/2, 3.5, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "bold 5.5px sans-serif";
        ctx.fillText("LAVABOS", lX + lavW/2, lY + lavH/2 + 2);

        // Partition doors
        ctx.save();
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(mx + mw*0.25, partitionY);
        ctx.lineTo(mx + mw*0.25 - 10, partitionY + 10);
        ctx.moveTo(mx + mw*0.75, partitionY);
        ctx.lineTo(mx + mw*0.75 - 10, partitionY + 10);
        ctx.stroke();
        ctx.restore();

        // Entrance door bottom right
        const dS = mw * 0.25;
        const dX = mx + mw - wallThickness - dS - 6;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(dX, my + mh - wallThickness, dS, wallThickness);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(dX + dS, my + mh - wallThickness/2);
        ctx.lineTo(dX + dS + dS*Math.cos(Math.PI/4.5), my + mh + dS*Math.sin(Math.PI/4.5));
        ctx.stroke();

        // Header Title
        ctx.fillStyle = "#475569";
        ctx.fillRect(mx + mw - 70, my - 12, 70, 9);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 5.5px sans-serif";
        ctx.fillText("Sanitaire SSU", mx + mw - 35, my - 7.5);
      }

      // Linear dimensions: top "230" & left "242"
      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 0.8;
      // Left vertical
      const dimX = mx - 12;
      ctx.beginPath(); ctx.moveTo(dimX, my); ctx.lineTo(dimX, my + mh);
      ctx.moveTo(dimX - 3, my); ctx.lineTo(dimX + 3, my);
      ctx.moveTo(dimX - 3, my + mh); ctx.lineTo(dimX + 3, my + mh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dimX - 2.5, my - 2.5); ctx.lineTo(dimX + 2.5, my + 2.5);
      ctx.moveTo(dimX - 2.5, my + mh - 2.5); ctx.lineTo(dimX + 2.5, my + mh + 2.5);
      ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.font = "bold 8.5px monospace";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText("242", dimX - 4, my + mh/2);

      // Top horizontal
      const dimY = my - 12;
      ctx.beginPath(); ctx.moveTo(mx, dimY); ctx.lineTo(mx + mw, dimY);
      ctx.moveTo(mx, dimY - 3); ctx.lineTo(mx, dimY + 3);
      ctx.moveTo(mx + mw, dimY - 3); ctx.lineTo(mx + mw, dimY + 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 2.5, dimY - 2.5); ctx.lineTo(mx + 2.5, dimY + 2.5);
      ctx.moveTo(mx + mw - 2.5, dimY - 2.5); ctx.lineTo(mx + mw + 2.5, dimY + 2.5);
      ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText("230", mx + mw/2, dimY - 3);
      ctx.restore();

    } else if (type === "Sanitaire 6m") {
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`SANiTAiRE 6M (${opts.configSanitaire || "SX"}) DIMENSIONS : 6.09m x 2.42m`, mx, my + mh + 15);

      const pxPerMeterX = mw / 6.09;
      const pxPerMeterY = mh / 2.42;

      // Draw partition walls for 3 equal compartments
      const pxLeftPartition = mx + 2.03 * pxPerMeterX;
      const pxRightPartition = mx + 4.06 * pxPerMeterX;

      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 3.5;
      
      ctx.beginPath();
      ctx.moveTo(pxLeftPartition, my);
      ctx.lineTo(pxLeftPartition, my + mh);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pxRightPartition, my);
      ctx.lineTo(pxRightPartition, my + mh);
      ctx.stroke();

      // Connecting doors inside
      drawPartitionDoor(pxLeftPartition, my + mh * 0.35, "Porte", true);
      drawPartitionDoor(pxRightPartition, my + mh * 0.35, "Porte", false);

      const isSX = opts.configSanitaire === "SX";

      if (!isSX) {
        // =============== DX CONFIGURATION (from image 3) ===============
        // Leftmost compartment (Segment 1): 2 showers along bottom wall, CE/Convector along top
        const shSize = 0.82 * pxPerMeterX;
        
        // Shower 1
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 2;
        ctx.fillRect(mx + 4, my + mh - shSize - 4, shSize, shSize);
        ctx.strokeRect(mx + 4, my + mh - shSize - 4, shSize, shSize);
        ctx.beginPath();
        ctx.moveTo(mx + 4, my + mh - shSize - 4);
        ctx.lineTo(mx + 4 + shSize, my + mh - 4);
        ctx.moveTo(mx + 4 + shSize, my + mh - shSize - 4);
        ctx.lineTo(mx + 4, my + mh - 4);
        ctx.strokeStyle = "#ccfbf1";
        ctx.stroke();

        // Shower 2
        ctx.fillRect(mx + 6 + shSize, my + mh - shSize - 4, shSize, shSize);
        ctx.strokeRect(mx + 6 + shSize, my + mh - shSize - 4, shSize, shSize);
        ctx.beginPath();
        ctx.moveTo(mx + 6 + shSize, my + mh - shSize - 4);
        ctx.lineTo(mx + 6 + shSize * 2, my + mh - 4);
        ctx.stroke();

        ctx.fillStyle = "#0d9488";
        ctx.font = "bold 6.5px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DCH 1", mx + 4 + shSize/2, my + mh - shSize/2);
        ctx.fillText("DCH 2", mx + 6 + shSize * 1.5, my + mh - shSize/2);

        // CE top left corner
        const ceRadius = 0.28 * Math.min(pxPerMeterX, pxPerMeterY);
        ctx.beginPath();
        ctx.arc(mx + ceRadius + 8, my + ceRadius + 8, ceRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#e0f2fe";
        ctx.fill();
        ctx.strokeStyle = "#0284c7";
        ctx.stroke();
        ctx.fillStyle = "#0369a1";
        ctx.font = "bold 6px sans-serif";
        ctx.fillText("ch.eau", mx + ceRadius + 8, my + ceRadius + 10);

        // Convector top-left
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.fillRect(mx + ceRadius*2 + 15, my + 4, 30, 8);
        ctx.strokeRect(mx + ceRadius*2 + 15, my + 4, 30, 8);
        ctx.fillStyle = "#334155";
        ctx.font = "5px sans-serif";
        ctx.fillText("convecteur", mx + ceRadius*2 + 30, my + 10);

        // Middle segment (Segment 2): 2 WC compartments + urinal
        const wcPartitionX = pxLeftPartition + (pxRightPartition - pxLeftPartition) * 0.45;
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(wcPartitionX, my + 4);
        ctx.lineTo(wcPartitionX, my + mh - 12);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pxLeftPartition, my + mh - 12);
        ctx.lineTo(pxRightPartition - 20, my + mh - 12);
        ctx.stroke();

        const tW = 0.40 * pxPerMeterX;
        const tH = 0.65 * pxPerMeterY;
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(pxLeftPartition + 8, my + 4, tW, tH);
        ctx.strokeRect(pxLeftPartition + 8, my + 4, tW, tH);
        
        ctx.fillRect(wcPartitionX + 8, my + 4, tW, tH);
        ctx.strokeRect(wcPartitionX + 8, my + 4, tW, tH);

        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 6.5px sans-serif";
        ctx.fillText("WC 1", pxLeftPartition + 8 + tW/2, my + 18);
        ctx.fillText("WC 2", wcPartitionX + 8 + tW/2, my + 18);

        // Urinal
        const uRadius = 0.22 * Math.min(pxPerMeterX, pxPerMeterY);
        ctx.beginPath();
        ctx.arc(pxRightPartition - uRadius - 6, my + mh - uRadius - 15, uRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.stroke();
        ctx.fillStyle = "#334155";
        ctx.font = "bold 5.5px sans-serif";
        ctx.fillText("urinoir", pxRightPartition - uRadius - 6, my + mh - uRadius - 13);

        // Rightmost segment (Segment 3): 2 lavabos top wall, convector right, door right
        const lavW = 0.65 * pxPerMeterX;
        const lavH = 0.38 * pxPerMeterY;
        
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.fillRect(pxRightPartition + 12, my + 4, lavW, lavH);
        ctx.strokeRect(pxRightPartition + 12, my + 4, lavW, lavH);

        ctx.fillRect(pxRightPartition + 16 + lavW, my + 4, lavW, lavH);
        ctx.strokeRect(pxRightPartition + 16 + lavW, my + 4, lavW, lavH);

        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 6px sans-serif";
        ctx.fillText("Lavabo 1", pxRightPartition + 12 + lavW/2, my + 12);
        ctx.fillText("Lavabo 2", pxRightPartition + 16 + lavW * 1.5, my + 12);

        // convector right
        ctx.fillRect(mx + mw - 12, my + 24, 8, 30);
        ctx.strokeRect(mx + mw - 12, my + 24, 8, 30);
        ctx.fillStyle = "#334155";
        ctx.font = "5px sans-serif";
        ctx.fillText("convecteur", mx + mw - 46, my + 40);

        // Entrance door on the short right wall opening out (t = 0.5)
        drawPeripheryDoor("right", 0.5, "Entrée");

      } else {
        // =============== SX CONFIGURATION (from image 4) ===============
        // Mirrored layout (Showers up, WC down)
        const shSize = 0.82 * pxPerMeterX;
        
        // Shower 1 & 2 (bottom wall matching uploaded image)
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.8;
        
        // Shower 1
        ctx.fillRect(mx + 4, my + mh - shSize - 4, shSize, shSize);
        ctx.strokeRect(mx + 4, my + mh - shSize - 4, shSize, shSize);
        ctx.beginPath();
        ctx.moveTo(mx + 4, my + mh - shSize - 4);
        ctx.lineTo(mx + 4 + shSize, my + mh - 4);
        ctx.stroke();
        
        // Shower 2
        ctx.fillRect(mx + 6 + shSize, my + mh - shSize - 4, shSize, shSize);
        ctx.strokeRect(mx + 6 + shSize, my + mh - shSize - 4, shSize, shSize);
        ctx.beginPath();
        ctx.moveTo(mx + 6 + shSize, my + mh - shSize - 4);
        ctx.lineTo(mx + 6 + shSize * 2, my + mh - 4);
        ctx.stroke();

        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 6.5px sans-serif";
        ctx.textAlign = "center";
        
        // CE top left corner
        const ceRadius = 0.28 * Math.min(pxPerMeterX, pxPerMeterY);
        ctx.beginPath();
        ctx.arc(mx + ceRadius + 8, my + ceRadius + 8, ceRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.stroke();
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 5px sans-serif";
        ctx.fillText("ch eau", mx + ceRadius + 8, my + ceRadius + 10);

        // Convector top-left
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.fillRect(mx + ceRadius*2 + 15, my + 4, 30, 8);
        ctx.strokeRect(mx + ceRadius*2 + 15, my + 4, 30, 8);
        ctx.fillStyle = "#334155";
        ctx.font = "5px sans-serif";
        ctx.fillText("convecteur", mx + ceRadius*2 + 30, my + 10);

        // Middle segment (Segment 2): WCs bottom, urinal bottom, lavabos top (uploaded image)
        const wcPartitionX = pxLeftPartition + (pxRightPartition - pxLeftPartition) * 0.45;
        
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.8;
        
        // WC partition walls (bottom of Segment 2)
        ctx.beginPath();
        ctx.moveTo(wcPartitionX, my + mh - 4);
        ctx.lineTo(wcPartitionX, my + 15);
        ctx.moveTo(pxLeftPartition, my + 15);
        ctx.lineTo(pxRightPartition - 15, my + 15);
        ctx.stroke();

        const tW = 0.38 * pxPerMeterX;
        const tH = 0.55 * pxPerMeterY;

        // Draw WC bowls inside cabin 1 & 2
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.2;
        
        // WC 1 bowl
        ctx.beginPath();
        ctx.arc(pxLeftPartition + tW/2 + 6, my + 25, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pxLeftPartition + tW/2 + 3, my + 22);
        ctx.lineTo(pxLeftPartition + tW/2 + 9, my + 28);
        ctx.moveTo(pxLeftPartition + tW/2 + 9, my + 22);
        ctx.lineTo(pxLeftPartition + tW/2 + 3, my + 28);
        ctx.stroke();

        // WC 2 bowl
        ctx.beginPath();
        ctx.arc(wcPartitionX + tW/2 + 6, my + 25, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(wcPartitionX + tW/2 + 3, my + 22);
        ctx.lineTo(wcPartitionX + tW/2 + 9, my + 28);
        ctx.moveTo(wcPartitionX + tW/2 + 9, my + 22);
        ctx.lineTo(wcPartitionX + tW/2 + 3, my + 28);
        ctx.stroke();

        // Urinal bottom right of middle section
        const uRadius = 0.20 * Math.min(pxPerMeterX, pxPerMeterY);
        ctx.beginPath();
        ctx.arc(pxRightPartition - uRadius - 6, my + 25, uRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.stroke();
        ctx.fillStyle = "#334155";
        ctx.font = "bold 5px sans-serif";
        ctx.fillText("urinoir", pxRightPartition - uRadius - 6, my + 27);

        // Double lavabos on the top/middle segment (matching uploaded image top wall)
        const lavW = 0.60 * pxPerMeterX;
        const lavH = 0.35 * pxPerMeterY;
        
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        ctx.fillRect(pxLeftPartition + 15, my + mh - lavH - 4, lavW, lavH);
        ctx.strokeRect(pxLeftPartition + 15, my + mh - lavH - 4, lavW, lavH);

        ctx.fillRect(pxLeftPartition + 20 + lavW, my + mh - lavH - 4, lavW, lavH);
        ctx.strokeRect(pxLeftPartition + 20 + lavW, my + mh - lavH - 4, lavW, lavH);

        // Rightmost compartment (Segment 3): convector right, entrance right
        ctx.fillRect(mx + mw - 12, my + 15, 8, 30);
        ctx.strokeRect(mx + mw - 12, my + 15, 8, 30);
        ctx.fillStyle = "#334155";
        ctx.font = "5px sans-serif";
        ctx.save();
        ctx.translate(mx + mw - 6, my + 30);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("convecteur", 0, 0);
        ctx.restore();

        // Entrance door on the short right wall swinging outwards
        drawPeripheryDoor("right", 0.5, "Entrée");

        // Left Dimension "242"
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 0.8;
        
        ctx.beginPath();
        ctx.moveTo(mx - 30, my);
        ctx.lineTo(mx - 30, my + mh);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(mx - 35, my);
        ctx.lineTo(mx - 25, my);
        ctx.moveTo(mx - 35, my + mh);
        ctx.lineTo(mx - 25, my + mh);
        ctx.stroke();

        ctx.save();
        ctx.translate(mx - 38, my + mh/2);
        ctx.rotate(-Math.PI/2);
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("242", 0, 0);
        ctx.restore();

        // Bottom Dimension "609"
        ctx.beginPath();
        ctx.moveTo(mx, my + mh + 35);
        ctx.lineTo(mx + mw, my + mh + 35);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(mx, my + mh + 30);
        ctx.lineTo(mx, my + mh + 40);
        ctx.moveTo(mx + mw, my + mh + 30);
        ctx.lineTo(mx + mw, my + mh + 40);
        ctx.stroke();

        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("609", mx + mw/2, my + mh + 35);
      }

    } else if (type.startsWith("C20'") || type.startsWith("C10'") || type.startsWith("C8'")) {
      // Maritime Style - NEUTRAL styling (White background)
      let dimLabel = "DIMENSIONS : 6.05m x 2.43m";
      if (type.startsWith("C10'")) dimLabel = "DIMENSIONS : 3.00m x 2.42m";
      if (type.startsWith("C8'")) dimLabel = "DIMENSIONS : 2.22m x 2.42m";

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px monospace";
      ctx.fillText(dimLabel, mx, my + mh + 15);

      // Draw container ripples
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      for (let yOffset = my + 8; yOffset < my + mh; yOffset += 8) {
        ctx.beginPath();
        ctx.moveTo(mx + 4, yOffset);
        ctx.lineTo(mx + mw - 4, yOffset);
        ctx.stroke();
      }

      if (type === "C20' OS") {
        // Open Side container has full opening length-side doors
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2.5;
        const segW = mw / 4;
        for (let i = 0; i < 4; i++) {
          // draw swing arc
          ctx.beginPath();
          ctx.arc(mx + segW * i, my + mh, segW / 2, 0, Math.PI / 2, false);
          ctx.strokeStyle = "#94a3b8";
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // draw door line
          ctx.beginPath();
          ctx.moveTo(mx + segW * i, my + mh);
          ctx.lineTo(mx + segW * i + segW / 2, my + mh + 12);
          ctx.strokeStyle = "#334155";
          ctx.stroke();
        }
        ctx.fillStyle = "#334155";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Ouverture Latérale Complète (C20' Open Side)", mx + mw/2, my + mh - 8);

      } else {
        // Standard double container swing doors on the right wall
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2.5;
        ctx.fillRect(mx + mw - 4, my + 10, 8, mh - 20);
        ctx.strokeRect(mx + mw - 4, my + 10, 8, mh - 20);

        ctx.fillStyle = "#334155";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Double-Portes", mx + mw - 68, my + mh / 2 + 3);
      }

      if (type.startsWith("C20'") && opts.clefCanne) {
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(mx + mw - 10, my + mh / 2 - 12);
        ctx.lineTo(mx + mw - 10, my + mh / 2 + 12);
        ctx.stroke();
        ctx.fillStyle = "#ea580c";
        ctx.font = "bold 7px sans-serif";
        ctx.fillText("CLEF-CANNE", mx + mw - 65, my + 15);
      }

    } else if (type.startsWith("Cuve")) {
      // Liquid Tank shape side outline
      const is6300L = type.includes("6300L");
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3.5;
      ctx.fillStyle = "#ffffff";

      // Draw horizontal cylinder tank
      const rx = mx + 20;
      const ry = my + 10;
      const r_w = mw - 40;
      const r_h = mh - 20;

      // Draw tank body
      ctx.beginPath();
      ctx.roundRect(rx, ry, r_w, r_h, 20);
      ctx.fill();
      ctx.stroke();

      // Inlet top dome
      ctx.fillStyle = "#334155";
      ctx.fillRect(rx + r_w / 2 - 20, ry - 10, 40, 10);
      ctx.strokeRect(rx + r_w / 2 - 20, ry - 10, 40, 10);

      // Outlet valve bottom
      ctx.fillRect(rx + r_w / 2 - 10, ry + r_h - 2, 20, 10);

      // Draw 2 regards on the short side left wall (exterior)
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.8;
      ctx.fillStyle = "#64748b";
      
      const regRadius = 7;
      // Regard 1
      ctx.beginPath();
      ctx.arc(mx - 10, my + mh * 0.3, regRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Regard 2
      ctx.beginPath();
      ctx.arc(mx - 10, my + mh * 0.7, regRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#475569";
      ctx.font = "bold 6.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("regard", mx - 10, my + mh * 0.3 - regRadius - 3);
      ctx.fillText("regard", mx - 10, my + mh * 0.7 - regRadius - 3);

      // Water filler indicator inside tank
      if (!opts.vidangee) {
        ctx.fillStyle = "#bae6fd";
        ctx.beginPath();
        ctx.roundRect(rx + 4, ry + r_h / 2, r_w - 8, r_h / 2 - 4, [0, 0, 16, 16]);
        ctx.fill();

        ctx.fillStyle = "#0369a1";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText("⚠️ NON VIDANGÉE (LIQUIDE)", rx + 30, ry + r_h / 2 + 12);
      } else {
        ctx.fillStyle = "#16a34a";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText("✅ CUVE VIDANGÉE (BIEN VIDE)", rx + 25, ry + r_h / 2 + 5);
      }

      ctx.fillStyle = "#334155";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`CUVE ${is6300L ? "6300 Litres" : "2500 Litres"}`, rx + 15, ry + 20);

    } else if (type.startsWith("Escalier")) {
      // Staircase drawing
      const is4m = type.includes("4 marches");
      ctx.fillStyle = "#f1f5f9";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;

      const stepsCount = is4m ? 4 : 12;

      // Draw steps side view stairs
      ctx.beginPath();
      ctx.moveTo(mx + 20, my + mh - 20);
      let curX = mx + 20;
      let curY = my + mh - 20;
      const stepW = (mw - 40) / stepsCount;
      const stepH = (mh - 40) / stepsCount;

      for (let i = 0; i < stepsCount; i++) {
        ctx.lineTo(curX, curY - stepH);
        curY -= stepH;
        ctx.lineTo(curX + stepW, curY);
        curX += stepW;
      }
      ctx.lineTo(curX, my + mh - 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${stepsCount} Marches - Galvanisé`, mx + 30, my + mh - 4);

      if (type === "Escalier R+1") {
        // Draw complementary 1.40x1.40m palier staircase landing!
        const pxLanding = 38; // proportional square
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2.2;
        
        const landX = mx + mw - pxLanding - 4;
        const landY = my + 4;
        ctx.fillRect(landX, landY, pxLanding, pxLanding);
        ctx.strokeRect(landX, landY, pxLanding, pxLanding);

        ctx.fillStyle = "#475569";
        ctx.font = "bold 6px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Palier Compl.", landX + pxLanding/2, landY + 14);
        ctx.fillText("1,40m x 1,40m", landX + pxLanding/2, landY + 24);
      }

    } else {
      // General custom cabin
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 3;
      ctx.strokeRect(mx, my, mw, mh);

      ctx.fillStyle = "#334155";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(`${type} - CADRE GÉNÉRIQUE`, mx + 20, my + mh / 2);
    }

    ctx.restore();
  };

  const drawUserStrokes = (ctx: CanvasRenderingContext2D) => {
    strokes.forEach((stroke) => {
      if (stroke.points.length < 1) return;
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    });

    // Draw active drawing stroke
    if (currentStroke && currentStroke.length > 0) {
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : currentColor;
      ctx.lineWidth = currentWidth;

      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
      }

      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
  };

  // Get pointer coordinates relative to canvas
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Map screen inputs properly accounting for the CSS scaling of canvas
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    return { x, y };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling when drawing on phones
    if (e.cancelable) {
      e.preventDefault();
    }
    const pt = getCanvasCoords(e);
    if (!pt) return;

    // Sanitary modules are not modifiable but remain annotable. Bypass hit tests.
    const isSanitaireModule = ["S1", "SD1", "SS1", "SD2", "SDU", "SSU", "Sanitaire 6m"].includes(moduleType);
    if (isSanitaireModule) {
      setCurrentStroke([pt]);
      return;
    }

    const { mx, my, mw, mh } = getEnclosingCoords();

    // 0. Sanitary elements (WC and douche cabins) hit test
    let realLength = 6.09;
    let realWidth = 2.42;
    if (moduleType.startsWith("B5")) realLength = 5.09;
    if (moduleType.startsWith("B4")) realLength = 4.09;

    const wcCount = characteristics.wcCount || 0;
    if (wcCount > 0) {
      const pxPerMeterX = mw / realLength;
      const pxPerMeterY = mh / realWidth;
      const wcW = Math.round(0.80 * pxPerMeterX);
      const wcH = Math.round(1.15 * pxPerMeterY);
      
      const minX = mx + 2;
      const maxX = mx + mw - wcW - 2;
      const minY = my + 2;
      const maxY = my + mh - wcH - 2;

      const startX = Math.max(minX, Math.min(maxX, mx + (mw - wcW) * wcPos.rx));
      const startY = Math.max(minY, Math.min(maxY, my + (mh - wcH) * wcPos.ry));

      // With generous padding of 10px around the box for easier touch targets
      if (pt.x >= startX - 10 && pt.x <= startX + wcW + 10 && pt.y >= startY - 10 && pt.y <= startY + wcH + 10) {
        setDraggingElement("wc");
        return;
      }
    }

    const dCount = characteristics.doucheCount || (characteristics.presenceDouche ? 1 : 0);
    if (dCount > 0) {
      const pxPerMeterX = mw / realLength;
      const pxPerMeterY = mh / realWidth;
      const showerW = Math.round(0.80 * pxPerMeterX);
      const showerH = Math.round(0.80 * pxPerMeterY);
      
      const minX = mx + 2;
      const maxX = mx + mw - showerW - 2;
      const minY = my + 2;
      const maxY = my + mh - showerH - 2;

      const startX = Math.max(minX, Math.min(maxX, mx + (mw - showerW) * douchePos.rx));
      const startY = Math.max(minY, Math.min(maxY, my + (mh - showerH) * douchePos.ry));

      // With generous padding of 10px around the box for easier touch targets
      if (pt.x >= startX - 10 && pt.x <= startX + showerW + 10 && pt.y >= startY - 10 && pt.y <= startY + showerH + 10) {
        setDraggingElement("douche");
        return;
      }
    }

    const getPeripheryCoordsStatic = (side: string, t: number) => {
      if (side === "top") return { x: mx + mw * t, y: my };
      if (side === "right") return { x: mx + mw, y: my + mh * t };
      if (side === "bottom") return { x: mx + mw * t, y: my + mh };
      return { x: mx, y: my + mh * t };
    };

    // 1. Primary Door hit test
    const doorCoords = getPeripheryCoordsStatic(doorPos.side, doorPos.t);
    if (Math.hypot(pt.x - doorCoords.x, pt.y - doorCoords.y) < 22) {
      setDraggingElement("door");
      return;
    }

    // 2. Primary Window hit test
    const winCoords = getPeripheryCoordsStatic(winPos.side, winPos.t);
    if (Math.hypot(pt.x - winCoords.x, pt.y - winCoords.y) < 22) {
      setDraggingElement("window");
      return;
    }

    // 2.5. Movable Evier (if cuisine is selected)
    if (characteristics.cuisineType && characteristics.cuisineType !== "none") {
      const evierCoords = getPeripheryCoordsStatic(evierPos.side, evierPos.t);
      if (Math.hypot(pt.x - evierCoords.x, pt.y - evierCoords.y) < 22) {
        setDraggingElement("evier");
        return;
      }
    }

    // 3. Clim / Trappe hit test (if present)
    if (characteristics.climTrappe && characteristics.climTrappe !== "none") {
      const climCoords = getPeripheryCoordsStatic(climTrappePos.side, climTrappePos.t);
      if (Math.hypot(pt.x - climCoords.x, pt.y - climCoords.y) < 22) {
        setDraggingElement("climTrappe");
        return;
      }
    }

    // 3.5. Movable Alim (Electrical arrival always present)
    const alimCoords = getPeripheryCoordsStatic(alimPos.side, alimPos.t);
    if (Math.hypot(pt.x - alimCoords.x, pt.y - alimCoords.y) < 22) {
      setDraggingElement("alim");
      return;
    }

    // 4. Custom elements hit test (re-verify all elements in custom list)
    for (const el of customElements) {
      const elCoords = getPeripheryCoordsStatic(el.side, el.t);
      if (Math.hypot(pt.x - elCoords.x, pt.y - elCoords.y) < 22) {
        setDraggingElement(el.id);
        return;
      }
    }

    setCurrentStroke([pt]);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const pt = getCanvasCoords(e);
    if (!pt) return;

    if (draggingElement) {
      const { mx, my, mw, mh } = getEnclosingCoords();
      const closest = findClosestPeriphery(pt.x, pt.y, mx, my, mw, mh);
      if (draggingElement === "door") {
        setDoorPos(closest as any);
      } else if (draggingElement === "window") {
        setWinPos(closest as any);
      } else if (draggingElement === "climTrappe") {
        setClimTrappePos(closest as any);
      } else if (draggingElement === "evier") {
        setEvierPos(closest as any);
      } else if (draggingElement === "alim") {
        setAlimPos(closest as any);
      } else if (draggingElement === "wc") {
        let realLength = 6.09;
        let realWidth = 2.42;
        if (moduleType.startsWith("B5")) realLength = 5.09;
        if (moduleType.startsWith("B4")) realLength = 4.09;

        const pxPerMeterX = mw / realLength;
        const pxPerMeterY = mh / realWidth;
        const wcW = Math.round(0.80 * pxPerMeterX);
        const wcH = Math.round(1.15 * pxPerMeterY);

        const idealStartX = pt.x - mx - wcW / 2;
        const idealStartY = pt.y - my - wcH / 2;

        const rx = Math.max(0, Math.min(1, idealStartX / (mw - wcW)));
        const ry = Math.max(0, Math.min(1, idealStartY / (mh - wcH)));

        setWcPos({ rx, ry });
      } else if (draggingElement === "douche") {
        let realLength = 6.09;
        let realWidth = 2.42;
        if (moduleType.startsWith("B5")) realLength = 5.09;
        if (moduleType.startsWith("B4")) realLength = 4.09;

        const pxPerMeterX = mw / realLength;
        const pxPerMeterY = mh / realWidth;
        const showerW = Math.round(0.80 * pxPerMeterX);
        const showerH = Math.round(0.80 * pxPerMeterY);

        const idealStartX = pt.x - mx - showerW / 2;
        const idealStartY = pt.y - my - showerH / 2;

        const rx = Math.max(0, Math.min(1, idealStartX / (mw - showerW)));
        const ry = Math.max(0, Math.min(1, idealStartY / (mh - showerH)));

        setDouchePos({ rx, ry });
      } else {
        // Find match in custom list
        setCustomElements((prev) =>
          prev.map((el) =>
            el.id === draggingElement
              ? { ...el, side: closest.side as any, t: closest.t }
              : el
          )
        );
      }
      return;
    }

    if (!currentStroke) return;
    setCurrentStroke((prev) => (prev ? [...prev, pt] : [pt]));
  };

  const handleEnd = () => {
    if (draggingElement) {
      setDraggingElement(null);
      return;
    }

    if (!currentStroke) return;
    const newStroke: Stroke = {
      points: currentStroke,
      color: currentColor,
      width: currentWidth,
      isEraser,
    };
    setStrokes((prev) => [...prev, newStroke]);
    setCurrentStroke(null);
  };

  const handleClear = () => {
    if (window.confirm("Effacer tous vos dessins personnalisés ?")) {
      setStrokes([]);
      setCurrentStroke(null);
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const addCustomElement = (type: "door" | "window" | "outlet" | "rj45") => {
    const newEl = {
      id: `custom_${Date.now()}_${Math.random()}`,
      type,
      side: "bottom" as const,
      t: 0.5,
    };
    setCustomElements((prev) => [...prev, newEl]);
  };

  const deleteCustomElement = (id: string) => {
    setCustomElements((prev) => prev.filter((el) => el.id !== id));
  };

  return (
    <div className="flex flex-col gap-3.5 w-full bg-slate-50/60 p-4 rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Couleur :</span>
          {/* Red: damage */}
          <button
            type="button"
            onClick={() => {
              setCurrentColor("#ef4444");
              setIsEraser(false);
            }}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded transition-all cursor-pointer ${
              currentColor === "#ef4444" && !isEraser
                ? "bg-red-500 text-white font-semibold shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white"></span>
            Dégât
          </button>
          
          {/* Orange: modification/addition */}
          <button
            type="button"
            onClick={() => {
              setCurrentColor("#D96C0F");
              setIsEraser(false);
            }}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded transition-all cursor-pointer ${
              currentColor === "#D96C0F" && !isEraser
                ? "bg-bungeco-orange text-white font-semibold shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white"></span>
            Ajout
          </button>
 
          {/* Black: general comment */}
          <button
            type="button"
            onClick={() => {
              setCurrentColor("#0f172a");
              setIsEraser(false);
            }}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded transition-all cursor-pointer ${
              currentColor === "#0f172a" && !isEraser
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white"></span>
            Annotation
          </button>
        </div>
 
        <div className="flex items-center gap-1.5">
          {/* Eraser */}
          <button
            type="button"
            onClick={() => setIsEraser(true)}
            className={`p-1.5 rounded transition-all cursor-pointer ${
              isEraser
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Gomme"
          >
            <Eraser size={14} />
          </button>
 
          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className={`p-1.5 rounded transition cursor-pointer ${
              strokes.length === 0
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Annuler"
          >
            <Undo size={14} />
          </button>
 
          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded border border-red-200 text-red-650 bg-red-50 hover:bg-red-100/80 transition cursor-pointer"
            title="Tout effacer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Direct Addable Architectural Elements (only if not a sanitary module) */}
      {!["S1", "SD1", "SS1", "SD2", "SDU", "SSU", "Sanitaire 6m"].includes(moduleType) && (
        <div className="flex flex-col gap-2 bg-white/70 p-3 rounded-lg border border-slate-200/65">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <Sparkles size={11} className="text-bungeco-orange shrink-0" />
            <span>Éléments interactifs à ajouter (puis glisser sur les murs) :</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addCustomElement("door")}
              className="flex items-center gap-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 border border-slate-250 text-slate-800 px-2 py-1.5 rounded transition cursor-pointer"
            >
              + Porte
            </button>
            <button
              type="button"
              onClick={() => addCustomElement("window")}
              className="flex items-center gap-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 border border-slate-250 text-slate-800 px-2 py-1.5 rounded transition cursor-pointer"
            >
              + Fenêtre
            </button>
            <button
              type="button"
              onClick={() => addCustomElement("outlet")}
              className="flex items-center gap-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 border border-slate-250 text-slate-800 px-2 py-1.5 rounded transition cursor-pointer"
            >
              + Prise Élec
            </button>
            <button
              type="button"
              onClick={() => addCustomElement("rj45")}
              className="flex items-center gap-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 border border-slate-250 text-slate-800 px-2 py-1.5 rounded transition cursor-pointer"
            >
              + Prise RJ45
            </button>
          </div>

          {customElements.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1 border-t border-slate-100 pt-2 items-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase shrink-0">Éléments ajoutés :</span>
              {customElements.map((el) => (
                <span
                  key={el.id}
                  className="inline-flex items-center gap-1 text-[10px] bg-slate-200/50 hover:bg-slate-250/50 text-slate-700 px-1.5 py-0.5 rounded transition"
                >
                  {el.type === "door" && "🚪 Porte"}
                  {el.type === "window" && "🪟 Fenêtre"}
                  {el.type === "outlet" && "🔌 Prise Elec"}
                  {el.type === "rj45" && "🌐 Prise RJ45"}
                  <button
                    type="button"
                    onClick={() => deleteCustomElement(el.id)}
                    className="text-red-650 hover:text-red-700 font-bold ml-1 shrink-0"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tool : Supprimer une longueur de panneau 6 m (assemblage chantier) */}
      {!["S1", "SD1", "SS1", "SD2", "SDU", "SSU", "Sanitaire 6m"].includes(moduleType) && (
        <div className="flex flex-col gap-2 bg-amber-50/70 p-3 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏗️ Supprimer panneau 6 m (assemblage chantier) :</span>
            </span>
            {characteristics.panneauSupprime && (
              <span className="text-[10px] font-bold text-red-650 bg-red-100 px-2 py-0.5 rounded">
                Panneau {characteristics.panneauSupprime === "haut" ? "Haut" : "Bas"} retiré
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onUpdateCharacteristics?.((prev) => ({
                  ...prev,
                  panneauSupprime: prev.panneauSupprime === "haut" ? null : "haut",
                }));
              }}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded transition cursor-pointer border ${
                characteristics.panneauSupprime === "haut"
                  ? "bg-red-600 text-white border-red-700 shadow-xs"
                  : "bg-white text-slate-700 border-slate-250 hover:bg-slate-50"
              }`}
            >
              {characteristics.panneauSupprime === "haut" ? "✓ Panneau Haut retiré" : "Retirer Panneau Haut (6m)"}
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdateCharacteristics?.((prev) => ({
                  ...prev,
                  panneauSupprime: prev.panneauSupprime === "bas" ? null : "bas",
                }));
              }}
              className={`text-[11px] font-bold px-2.5 py-1.5 rounded transition cursor-pointer border ${
                characteristics.panneauSupprime === "bas"
                  ? "bg-red-600 text-white border-red-700 shadow-xs"
                  : "bg-white text-slate-700 border-slate-250 hover:bg-slate-50"
              }`}
            >
              {characteristics.panneauSupprime === "bas" ? "✓ Panneau Bas retiré" : "Retirer Panneau Bas (6m)"}
            </button>

            {characteristics.panneauSupprime && (
              <button
                type="button"
                onClick={() => {
                  onUpdateCharacteristics?.((prev) => ({
                    ...prev,
                    panneauSupprime: null,
                  }));
                }}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded transition cursor-pointer bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
              >
                ↺ Rétablir le panneau
              </button>
            )}
          </div>
        </div>
      )}

      {/* Thickness settings */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500 px-1">
        <span className="font-semibold">Épaisseur du trait :</span>
        <div className="flex items-center gap-2">
          {[2, 4, 7].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setCurrentWidth(w)}
              className={`px-3 py-1 rounded text-[10px] font-semibold cursor-pointer ${
                currentWidth === w
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {w === 2 ? "Fin" : w === 4 ? "Moyen" : "Épais"}
            </button>
          ))}
        </div>
      </div>

      {/* Original Image Importer for Sanitaire 6m SX */}
      {moduleType === "Sanitaire 6m" && characteristics.configSanitaire === "SX" && (
        <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-lg flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-850">
            <span>📁 Plan d’origine Sanitaire 6m SX (.jpg)</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Pour importer votre plan de base d'origine à l'identique (au format .jpg, .jpeg, ou .png) sans autre modification :
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-[10.5px] px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded cursor-pointer transition shadow-xs">
              M'importer l'image .jpg
              <input
                id="sanitaire-jpg-uploader"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const dataUrl = evt.target?.result as string;
                      if (dataUrl) {
                        setCustomSanitaireImage(dataUrl);
                        try {
                          localStorage.setItem("sanitaire_6m_sx_image", dataUrl);
                        } catch (err) {
                          console.warn("Storage budget full, loaded locally:", err);
                        }
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
            {customSanitaireImage && (
              <button
                type="button"
                id="reset-sanitaire-img"
                onClick={() => {
                  setCustomSanitaireImage(null);
                  try {
                    localStorage.removeItem("sanitaire_6m_sx_image");
                  } catch {}
                }}
                className="text-[10.5px] px-3.5 py-1.5 border border-red-200 text-red-650 hover:bg-red-50 rounded transition font-medium cursor-pointer"
              >
                Réinitialiser par défaut
              </button>
            )}
          </div>
        </div>
      )}

      {/* Graphical Hint */}
      <div className="bg-bungeco-orange/10 border border-bungeco-orange/20 text-bungeco-dark text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 font-medium">
        <Sparkles size={12} className="text-bungeco-orange shrink-0" />
        <span>Remplissez le formulaire de gauche, le plan de base s'adapte, puis dessinez dessus !</span>
      </div>

      {/* Canvas container with touch action absolute styling */}
      <div
        ref={containerRef}
        className="w-full flex justify-center items-center overflow-hidden rounded-xl border border-slate-300 shadow-inner bg-white select-none relative"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="cursor-crosshair max-w-full block bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]"
        />
      </div>
    </div>
  );
}
