/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import SanitaireReferenceImage from "./SanitaireReferenceImage";
import { ModuleType } from "../types";
import { FileImage } from "lucide-react";

interface SanitaireSectionProps {
  moduleType: ModuleType;
  configSanitaire?: string;
}

export default function SanitaireSection({
  moduleType,
  configSanitaire,
}: SanitaireSectionProps) {
  return (
    <div id="sanitaire-section-container" className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4 animate-fade-in text-left">
      <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
        <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0 font-display">04</span>
        <FileImage className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
        Dessin d'Usine & Référence Sanitaire
      </h3>
      <div className="p-1">
        <SanitaireReferenceImage
          moduleType={
            moduleType === "Sanitaire 6m"
              ? (configSanitaire === "DX" ? "SANITAIRE_6M_DX" : "SANITAIRE_6M_SX")
              : moduleType
          }
        />
      </div>
    </div>
  );
}
