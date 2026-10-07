/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CheckCircle, RefreshCw, Wrench, MessageSquare } from "lucide-react";

interface ObservationsSectionProps {
  travauxPrevoir: string;
  setTravauxPrevoir: (value: string) => void;
  isAutoSyncTravaux: boolean;
  setIsAutoSyncTravaux: (value: boolean) => void;
  observations: string;
  setObservations: (value: string) => void;
  isModuleNeuf?: boolean;
  onToggleModuleNeuf?: (checked: boolean) => void;
  pasDeMobilier?: boolean;
  onTogglePasDeMobilier?: (checked: boolean) => void;
  rasReparations?: boolean;
  onToggleRAS?: (checked: boolean) => void;
}

export default function ObservationsSection({
  travauxPrevoir,
  setTravauxPrevoir,
  isAutoSyncTravaux,
  setIsAutoSyncTravaux,
  observations,
  setObservations,
  pasDeMobilier,
  onTogglePasDeMobilier,
  rasReparations,
  onToggleRAS,
}: ObservationsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Travaux à prévoir */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4">
        <div className="flex items-center justify-between border-b-2 border-bungeco-orange/20 pb-2.5">
          <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 font-display">
            <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0 font-display">05</span>
            <Wrench className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
            Remises en État à Prévoir
          </h3>
          <button
            type="button"
            onClick={() => setIsAutoSyncTravaux(!isAutoSyncTravaux)}
            className={`px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wide flex items-center gap-1 cursor-pointer transition-all ${
              isAutoSyncTravaux
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {isAutoSyncTravaux ? (
              <>
                <CheckCircle size={11} /> Auto-Calculé
              </>
            ) : (
              <>
                <RefreshCw size={11} className="animate-spin" /> Saisie Manuelle
              </>
            )}
          </button>
        </div>

        <textarea
          id="travaux-prevoir-input"
          value={travauxPrevoir}
          onChange={(e) => {
            setTravauxPrevoir(e.target.value);
            setIsAutoSyncTravaux(false); // Stop auto overwrite if user edits text by hand
          }}
          placeholder="Indiquez ici les pièces à facturer pour dommages, vitres fêlées, etc..."
          rows={3}
          className="w-full text-xs font-mono p-3 border border-slate-200 bg-bungeco-light rounded-lg focus:outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white text-bungeco-dark transition-all resize-none"
        />

        {/* Deux nouvelles coches : Pas de mobilier & RAS */}
        <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none hover:text-slate-900 transition">
            <input
              type="checkbox"
              id="checkbox-pas-de-mobilier"
              checked={pasDeMobilier || false}
              onChange={(e) => onTogglePasDeMobilier?.(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-bungeco-orange focus:ring-bungeco-orange/20 cursor-pointer accent-bungeco-orange"
            />
            <span>Pas de mobilier</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none hover:text-slate-900 transition">
            <input
              type="checkbox"
              id="checkbox-ras-reparations"
              checked={rasReparations || false}
              onChange={(e) => onToggleRAS?.(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-bungeco-orange focus:ring-bungeco-orange/20 cursor-pointer accent-bungeco-orange"
            />
            <span>RAS</span>
          </label>
        </div>

        {!isAutoSyncTravaux && (
          <button
            type="button"
            onClick={() => {
              setIsAutoSyncTravaux(true);
            }}
            className="text-[10px] text-bungeco-orange font-bold hover:underline flex items-center gap-1 pointer cursor-pointer font-sans"
          >
            <RefreshCw size={10} /> Recalculer automatiquement selon les règles BUNG'ECO
          </button>
        )}
      </div>

      {/* Observations Générales */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4">
        <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
          <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0 font-display">06</span>
          <MessageSquare className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
          Observations Générales du Technicien
        </h3>
        
        <textarea
          id="observations-input"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Excellente structure de re-livraison. Note sur l'état général des panneaux muraux ou du plancher, référence du matériel..."
          rows={3}
          className="w-full text-xs p-3 border border-slate-200 bg-bungeco-light rounded-lg focus:outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white text-bungeco-dark transition-all resize-none"
        />
      </div>
    </div>
  );
}
