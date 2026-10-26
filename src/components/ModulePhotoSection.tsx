/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ModuleType } from "../types";
import { getModulePhotoPath, getModulePhotoLabel } from "../constants/modulePhotos";
import { Camera } from "lucide-react";

interface ModulePhotoSectionProps {
  moduleType: ModuleType;
}

export default function ModulePhotoSection({ moduleType }: ModulePhotoSectionProps) {
  const photoPath = getModulePhotoPath(moduleType);
  const label = getModulePhotoLabel(moduleType);

  return (
    <div
      id="module-photo-section-container"
      className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4 animate-fade-in text-left"
    >
      <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
        <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0 font-display">
          04
        </span>
        <Camera className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
        Photo de Référence du Matériel
      </h3>
      <div className="p-1 flex flex-col items-center justify-center w-full">
        {photoPath ? (
          <div className="w-full flex flex-col items-center justify-center">
            <div className="w-full max-h-[340px] flex items-center justify-center bg-slate-50/50 rounded-lg border border-slate-200/90 p-2">
              <img
                src={photoPath}
                alt={`Photo ${label}`}
                className="max-h-[320px] w-auto max-w-full object-contain rounded shadow-xs"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-mono font-bold mt-2">
              Équipement certifié : {label}
            </p>
          </div>
        ) : (
          <p className="text-xs font-bold text-slate-600">
            Photo non disponible pour : {moduleType}
          </p>
        )}
      </div>
    </div>
  );
}
