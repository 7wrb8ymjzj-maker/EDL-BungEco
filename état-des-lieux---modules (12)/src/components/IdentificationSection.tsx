/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ModuleType, ALL_MODULE_TYPES } from "../types";
import { Calendar, ClipboardList, Tag } from "lucide-react";

interface IdentificationSectionProps {
  moduleType: ModuleType;
  setModuleType: (t: ModuleType) => void;
  moduleNumber: string;
  setModuleNumber: (n: string) => void;
  date: string;
  setDate: (d: string) => void;
  handleResetCharacteristics: (t: ModuleType) => void;
  setActiveSubTab: (t: string) => void;
  status: "conforme" | "reserves" | "non_conforme";
  setStatus: (s: "conforme" | "reserves" | "non_conforme") => void;
  nature: "livraison" | "reprise" | "constat";
  setNature: (n: "livraison" | "reprise" | "constat") => void;
  chantier: string;
  setChantier: (c: string) => void;
  isModuleNeuf?: boolean;
  onToggleModuleNeuf?: (checked: boolean) => void;
}

export default function IdentificationSection({
  moduleType,
  setModuleType,
  moduleNumber,
  setModuleNumber,
  date,
  setDate,
  handleResetCharacteristics,
  setActiveSubTab,
  status,
  setStatus,
  nature,
  setNature,
  chantier,
  setChantier,
  isModuleNeuf = false,
  onToggleModuleNeuf,
}: IdentificationSectionProps) {
  return (
    <div id="id-section-container" className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-5">
      <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
        <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0">01</span>
        <ClipboardList className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
        Identification Générale du Matériel
      </h3>
      
      {/* Type & Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col sm:col-span-1 text-left">
          <label htmlFor="module-type" className="text-[11px] uppercase tracking-wider text-slate-500 font-extrabold mb-1.5 font-sans">
            01. Type de Module
          </label>
          <select
            id="module-type"
            value={moduleType}
            onChange={(e) => {
              const newType = e.target.value as ModuleType;
              setModuleType(newType);
              handleResetCharacteristics(newType);
              setActiveSubTab("structure");
            }}
            className="bg-bungeco-light hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2.5 font-bold text-xs focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white transition-all cursor-pointer outline-none text-bungeco-dark"
          >
            {ALL_MODULE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:col-span-2 text-left">
          <label htmlFor="module-number" className="text-xs uppercase tracking-wider text-slate-700 font-black mb-1.5 flex items-center gap-1.5 font-sans">
            <Tag size={13} className="text-bungeco-orange" />
            02. Référence du Module <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm select-none" role="img" aria-label="Tag">
                🔖
              </span>
              <input
                id="module-number"
                type="text"
                placeholder="Exemples : B6-402, CU-90, BX-125"
                value={moduleNumber}
                onChange={(e) => setModuleNumber(e.target.value)}
                className="w-full bg-orange-50/20 hover:bg-orange-50/45 border-2 border-bungeco-orange/40 focus:border-bungeco-orange rounded-lg pl-9 pr-3 py-2 font-mono text-xs focus:ring-2 focus:ring-bungeco-orange/30 font-black uppercase transition-all placeholder:text-slate-400 outline-none text-bungeco-dark focus:bg-white"
              />
            </div>
            {onToggleModuleNeuf && (
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50/60 hover:bg-orange-100/70 border border-bungeco-orange/30 rounded-lg cursor-pointer transition-all select-none shrink-0 h-[38px]">
                <input
                  type="checkbox"
                  checked={isModuleNeuf}
                  onChange={(e) => onToggleModuleNeuf(e.target.checked)}
                  className="w-4 h-4 text-bungeco-orange rounded border-slate-300 focus:ring-bungeco-orange accent-[#D96B00] cursor-pointer"
                />
                <span className="text-xs font-black text-slate-800 tracking-tight whitespace-nowrap">
                  Module Neuf
                </span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Date & Site Name */}
      <div className={`grid grid-cols-1 ${nature === "constat" ? "sm:grid-cols-2" : ""} gap-4`}>
        <div className="flex flex-col text-left">
          <label htmlFor="edl-date" className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mb-1.5 font-sans flex items-center gap-1.5">
            <Calendar size={13} className="text-bungeco-orange" />
            03. Date du Constat
          </label>
          <input
            id="edl-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-bungeco-light hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white transition-all outline-none text-bungeco-dark"
          />
        </div>

        {nature === "constat" && (
          <div className="flex flex-col text-left">
            <label htmlFor="edl-chantier" className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mb-1.5 font-sans flex items-center gap-1.5">
              📍 Adresse / Nom du Chantier
            </label>
            <input
              id="edl-chantier"
              type="text"
              placeholder="Ex : Chantier Grue C, Lyon Sud (Optionnel)"
              value={chantier}
              onChange={(e) => setChantier(e.target.value)}
              className="bg-bungeco-light hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white transition-all outline-none text-bungeco-dark"
            />
          </div>
        )}
      </div>

      {/* Nature of the operation */}
      <div className="flex flex-col text-left">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mb-2 font-sans">
          🚚 Nature de l'opération
        </span>
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setNature("reprise")}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
              nature === "reprise"
                ? "bg-bungeco-dark text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            🔄 Fin de location
          </button>
          <button
            type="button"
            onClick={() => setNature("constat")}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
              nature === "constat"
                ? "bg-bungeco-dark text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            👷 Sur chantier
          </button>
        </div>
      </div>
    </div>
  );
}
