/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import PhotoManager from "./PhotoManager";
import { Camera } from "lucide-react";

interface PhotoSectionProps {
  photos: string[];
  setPhotos: (photos: string[]) => void;
  readOnly?: boolean;
}

export default function PhotoSection({
  photos,
  setPhotos,
  readOnly = false,
}: PhotoSectionProps) {
  return (
    <div id="photos-section-container" className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4">
      <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
        <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0 font-display">07</span>
        <Camera className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
        Photographies de Chantier (Preuve Visuelle)
      </h3>
      <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">
        Prenez des clichés du module directement avec votre appareil photo ou importez des fichiers. Fortement conseillé pour justifier d'éventuels dommages ou valider la livraison.
      </p>
      <PhotoManager
        photos={photos}
        onChange={(newPhotos) => setPhotos(newPhotos)}
        readOnly={readOnly}
      />
    </div>
  );
}
