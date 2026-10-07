/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Save, Mail } from "lucide-react";
import { ModuleType } from "../types";

interface ActionsBarProps {
  moduleNumber: string;
  date: string;
  travauxPrevoir: string;
  photos: string[];
  observations: string;
  moduleType: ModuleType;
  onCancel?: () => void;
  isSaving?: boolean;
  onSaveAndShare?: () => void;
  isSharing?: boolean;
}

export default function ActionsBar({
  moduleNumber,
  date,
  travauxPrevoir,
  photos,
  observations,
  moduleType,
  onCancel,
  isSaving = false,
  onSaveAndShare,
  isSharing = false,
}: ActionsBarProps) {
  const isModuleNumberValid = moduleNumber.trim().length > 0;
  const isTravauxSignedWithoutPhoto = travauxPrevoir.trim().length > 0 && photos.length === 0;
  const isTravauxSignedWithoutObservations = travauxPrevoir.trim().length > 0 && !observations.trim();

  return (
    <div id="actions-bar-container" className="space-y-4">
      {/* Live validation checklist before save */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-3 text-left">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#333333] flex items-center gap-1.5 border-b border-slate-200 pb-2 font-display">
          🔍 Validateur de Conformité Avant Signature BUNG'ECO
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              {isModuleNumberValid ? (
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
              ) : (
                <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-[10px] animate-pulse">✗</span>
              )}
              <span className={isModuleNumberValid ? "text-slate-600" : "text-rose-500 font-bold"}>
                Référence Module : {isModuleNumberValid ? <span className="font-mono text-xs font-bold text-slate-800">{moduleNumber.trim()}</span> : "Saisie Manque !"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span className="text-slate-600">
                Date de réalisation : <span className="font-mono text-slate-800">{date}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              {!isTravauxSignedWithoutPhoto ? (
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
              ) : (
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] animate-pulse">!</span>
              )}
              <span className={isTravauxSignedWithoutPhoto ? "text-amber-800 font-bold" : "text-slate-600"}>
                {isTravauxSignedWithoutPhoto
                  ? "Travaux listés sans photo jointe ! (Prendre ou importer une photo)"
                  : `Photos justificatives : ${photos.length} cliché(s)`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium">
              {!isTravauxSignedWithoutObservations ? (
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
              ) : (
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] animate-pulse">!</span>
              )}
              <span className={isTravauxSignedWithoutObservations ? "text-amber-800 font-bold" : "text-slate-600"}>
                {isTravauxSignedWithoutObservations
                  ? "Travaux listés mais observations vides !"
                  : "Commentaires & observations validés"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Bottom Summary Action Bar */}
      <div className="bg-[#333333] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between text-white shadow-md uppercase font-mono tracking-wider text-[11px] gap-4">
        <div className="flex gap-6 self-start sm:self-center">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold font-sans">Statut EDL</span>
            <span className="text-xs font-bold flex items-center gap-2 mt-0.5"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Prêt à valider</span>
          </div>
          <div className="flex flex-col border-l border-slate-700 pl-6">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold font-sans">Photos</span>
            <span className="text-xs font-bold mt-0.5 text-bungeco-orange-light">{photos.length} cliché{photos.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-col border-l border-slate-700 pl-6">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold font-sans font-sans">Type</span>
            <span className="text-xs font-bold mt-0.5 text-bungeco-orange-light font-sans">{moduleType}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto font-sans">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 transition rounded-lg text-[11px] font-bold border border-slate-700 cursor-pointer text-white"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving || isSharing}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-700 hover:bg-slate-650 disabled:bg-slate-500 transition rounded-lg text-[11px] font-black flex items-center justify-center gap-2 border border-slate-600 shadow-md cursor-pointer text-white"
          >
            <Save size={14} />
            {isSaving ? "EN COURS..." : "ENREGISTRER LE CONSTAT"}
          </button>
          {onSaveAndShare && (
            <button
              type="button"
              onClick={onSaveAndShare}
              disabled={isSaving || isSharing}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-bungeco-orange hover:bg-bungeco-orange/95 disabled:bg-slate-500 transition rounded-lg text-[11px] font-black flex items-center justify-center gap-2 shadow-xl cursor-pointer text-white"
            >
              <Mail size={14} />
              {isSharing ? "ENVOI..." : "ENREGISTRER ET ENVOYER PAR MAIL"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
