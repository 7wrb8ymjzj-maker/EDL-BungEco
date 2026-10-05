/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import ModuleSketch from "./ModuleSketch";
import { ModuleType, InspectionCharacteristics } from "../types";
import { PenTool } from "lucide-react";

interface SketchSectionProps {
  moduleType: ModuleType;
  characteristics: InspectionCharacteristics;
  setSketchDataUrl: (url: string) => void;
}

export default function SketchSection({
  moduleType,
  characteristics,
  setSketchDataUrl,
}: SketchSectionProps) {
  return (
    <div id="sketch-section-container" className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4">
      <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
        <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0 font-display">04</span>
        <PenTool className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
        Croquis Tactile de Constat & Dommages
      </h3>

      <ModuleSketch
        moduleType={moduleType}
        characteristics={characteristics}
        onChange={(dataUrl) => setSketchDataUrl(dataUrl)}
        savedDataUrl={characteristics.climTrappe} // dummy change trigger to force redrawing when certain state updates
      />
    </div>
  );
}
