/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Info, Settings2, Armchair, ChevronDown } from "lucide-react";
import { ModuleType, InspectionCharacteristics, MobilierOption, INITIAL_MOBILIER } from "../types";

interface CharacteristicsSectionProps {
  moduleType: ModuleType;
  characteristics: InspectionCharacteristics;
  setCharacteristics: React.Dispatch<React.SetStateAction<InspectionCharacteristics>>;
}

export default function CharacteristicsSection({
  moduleType,
  characteristics,
  setCharacteristics,
}: CharacteristicsSectionProps) {

  // Helper inside to update furniture qualities
  const updateFurnitureQty = (key: keyof MobilierOption, val: number) => {
    setCharacteristics((prev) => {
      const currentMob = prev.mobilier || { ...INITIAL_MOBILIER };
      return {
        ...prev,
        mobilier: {
          ...currentMob,
          [key]: val,
        },
      };
    });
  };

  const isBSeries = ["B6", "B5", "B4"].includes(moduleType);

  return (
    <div id="characteristics-section" className="space-y-4">
      {/* 02. Caractéristiques Techniques */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4">
        <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
          <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0">02</span>
          <Settings2 className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
          Spécificités et Caractéristiques Techniques
        </h3>

        {/* B6 Specific attributes */}
        {moduleType === "B6" && (
          <div className="space-y-3 pt-1 text-left">
            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Gamme BUNG'ECO</span>
              <div className="grid grid-cols-2 gap-1.5">
                {["Flex", "Top"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      const isFlex = g === "Flex";
                      setCharacteristics((prev) => ({
                        ...prev,
                        gamme: g as "Flex" | "Top",
                        eclairageType: isFlex ? "neons" : "led",
                        commandeEclairage: "interrupteur"
                      }));
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      characteristics.gamme === g
                        ? "bg-bungeco-orange border-bungeco-orange text-white shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Implantation d'origine</span>
              <div className="grid grid-cols-3 gap-1.5">
                {["Pignon", "Façade", "Conquet"].map((cfg) => (
                  <button
                    key={cfg}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        configurationType: cfg as "Pignon" | "Façade" | "Conquet",
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      characteristics.configurationType === cfg
                        ? "bg-bungeco-orange border-bungeco-orange text-white shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {cfg}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Commande de l'Éclairage</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: "interrupteur", label: "Interrupteur" },
                  { key: "detecteur", label: "Détecteur de présence" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        commandeEclairage: item.key as any,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      (characteristics.commandeEclairage || "interrupteur") === item.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Confort Thermique (Clim / Trappe)</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "Clim", label: "Climatiseur" },
                  { key: "Trappe", label: "Trappe" },
                  { key: "none", label: "Aucun" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        climTrappe: item.key as any,
                        climTaille: item.key === "Clim" ? "56cm" : undefined,
                        trappeTaille: item.key === "Trappe" ? "56cm" : undefined
                      }))
                    }
                    className={`py-1.5 px-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer font-bold ${
                      characteristics.climTrappe === item.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {characteristics.climTrappe === "Clim" && (
                <div className="mt-1.5 pl-3 border-l-2 border-bungeco-orange py-0.5 space-y-1 animate-fade-in text-left">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Taille Climatiseur</span>
                  <div className="grid grid-cols-4 gap-1">
                    {["56cm", "45cm", "60cm", "autre"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCharacteristics((prev) => ({ ...prev, climTaille: sz as any }))}
                        className={`py-1 rounded text-[11px] font-semibold border text-center cursor-pointer ${
                          characteristics.climTaille === sz
                            ? "bg-orange-50 border-bungeco-orange text-bungeco-orange font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {sz === "autre" ? "Autre" : sz}
                      </button>
                    ))}
                  </div>
                  {characteristics.climTaille === "autre" && (
                    <input
                      type="text"
                      value={characteristics.climTailleAutre || ""}
                      placeholder="Note dimension..."
                      onChange={(e) => setCharacteristics((prev) => ({ ...prev, climTailleAutre: e.target.value }))}
                      className="w-full px-2 py-1 text-xs border border-slate-200 bg-slate-50/50 rounded focus:ring-1 focus:ring-bungeco-orange outline-none text-bungeco-dark"
                    />
                  )}
                </div>
              )}

              {characteristics.climTrappe === "Trappe" && (
                <div className="mt-1.5 pl-3 border-l-2 border-bungeco-orange py-0.5 space-y-1 animate-fade-in text-left">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Taille Trappe</span>
                  <div className="grid grid-cols-3 gap-1">
                    {["56cm", "45cm", "60cm"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCharacteristics((prev) => ({ ...prev, trappeTaille: sz as any }))}
                        className={`py-1 rounded text-[11px] font-semibold border text-center cursor-pointer ${
                          characteristics.trappeTaille === sz
                            ? "bg-orange-50 border-bungeco-orange text-bungeco-orange font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Options Cuisines</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "Bois", label: "Bois" },
                  { key: "Métal", label: "Métal" },
                  { key: "none", label: "Aucune" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        cuisineType: item.key as any,
                        cuisine120: item.key === "none" ? undefined : (prev.cuisine120 !== undefined ? prev.cuisine120 : false)
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer font-bold ${
                      characteristics.cuisineType === item.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {characteristics.cuisineType && characteristics.cuisineType !== "none" && (
                <div className="mt-1.5 pl-3 border-l-2 border-bungeco-orange py-0.5 space-y-1 animate-fade-in text-left">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Largeur d'origine</span>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { key: true, label: "120 cm" },
                      { key: false, label: "80 cm" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setCharacteristics((prev) => ({ ...prev, cuisine120: opt.key }))}
                        className={`py-1 rounded text-xs font-semibold border text-center cursor-pointer ${
                          characteristics.cuisine120 === opt.key
                            ? "bg-orange-50 border-bungeco-orange text-bungeco-orange font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Raccordements Sanitaires</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "WC", countKey: "wcCount" },
                  { label: "Douches", countKey: "doucheCount" },
                ].map((item) => {
                  const val = (characteristics as any)[item.countKey] || 0;
                  return (
                    <div key={item.label} className="bg-slate-50 border border-slate-200/50 p-2 rounded-lg flex flex-col justify-between">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</span>
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (val > 0) {
                              setCharacteristics((prev) => ({ ...prev, [item.countKey]: val - 1 }));
                            }
                          }}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-bungeco-dark">{val}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCharacteristics((prev) => ({ ...prev, [item.countKey]: val + 1 }));
                          }}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Coloris Extérieur</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "RAL 7016", label: "Gris 7016" },
                  { key: "RAL 9002", label: "Blanc 9002" },
                  { key: "none", label: "Standard / Autre" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setCharacteristics((prev) => ({ ...prev, couleurRAL: opt.key as any }))}
                    className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer font-bold ${
                      characteristics.couleurRAL === opt.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* B5 & B4 Options (Slightly different: no Gamme selection) */}
        {(moduleType === "B5" || moduleType === "B4") && (
          <div className="space-y-3 pt-1 text-left animate-fade-in">
            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Implantation d'origine</span>
              <div className="grid grid-cols-3 gap-1.5">
                {["Pignon", "Façade", "Conquet"].map((cfg) => (
                  <button
                    key={cfg}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        configurationType: cfg as "Pignon" | "Façade" | "Conquet",
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      characteristics.configurationType === cfg
                        ? "bg-bungeco-orange border-bungeco-orange text-white shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {cfg}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Commande de l'Éclairage</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: "interrupteur", label: "Interrupteur" },
                  { key: "detecteur", label: "Détecteur de présence" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        commandeEclairage: item.key as any,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      (characteristics.commandeEclairage || "interrupteur") === item.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Confort Thermique (Clim / Trappe)</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "Clim", label: "Climatiseur" },
                  { key: "Trappe", label: "Trappe" },
                  { key: "none", label: "Aucun" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        climTrappe: item.key as any,
                        climTaille: item.key === "Clim" ? "56cm" : undefined,
                        trappeTaille: item.key === "Trappe" ? "56cm" : undefined
                      }))
                    }
                    className={`py-1.5 px-1.5 rounded-lg border text-xs text-center transition-all cursor-pointer font-bold ${
                      characteristics.climTrappe === item.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {characteristics.climTrappe === "Clim" && (
                <div className="mt-1.5 pl-3 border-l-2 border-bungeco-orange py-0.5 space-y-1 animate-fade-in text-left">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Taille Climatiseur</span>
                  <div className="grid grid-cols-4 gap-1">
                    {["56cm", "45cm", "60cm", "autre"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCharacteristics((prev) => ({ ...prev, climTaille: sz as any }))}
                        className={`py-1 rounded text-[11px] font-semibold border text-center cursor-pointer ${
                          characteristics.climTaille === sz
                            ? "bg-orange-50 border-bungeco-orange text-bungeco-orange font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {sz === "autre" ? "Autre" : sz}
                      </button>
                    ))}
                  </div>
                  {characteristics.climTaille === "autre" && (
                    <input
                      type="text"
                      value={characteristics.climTailleAutre || ""}
                      placeholder="Note dimension..."
                      onChange={(e) => setCharacteristics((prev) => ({ ...prev, climTailleAutre: e.target.value }))}
                      className="w-full px-2 py-1 text-xs border border-slate-200 bg-slate-50/50 rounded focus:ring-1 focus:ring-bungeco-orange outline-none text-bungeco-dark"
                    />
                  )}
                </div>
              )}

              {characteristics.climTrappe === "Trappe" && (
                <div className="mt-1.5 pl-3 border-l-2 border-bungeco-orange py-0.5 space-y-1 animate-fade-in text-left">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Taille Trappe</span>
                  <div className="grid grid-cols-3 gap-1">
                    {["56cm", "45cm", "60cm"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCharacteristics((prev) => ({ ...prev, trappeTaille: sz as any }))}
                        className={`py-1 rounded text-[11px] font-semibold border text-center cursor-pointer ${
                          characteristics.trappeTaille === sz
                            ? "bg-orange-50 border-bungeco-orange text-bungeco-orange font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Options Cuisines</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "Bois", label: "Bois" },
                  { key: "Métal", label: "Métal" },
                  { key: "none", label: "Aucune" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        cuisineType: item.key as any,
                        cuisine120: item.key === "none" ? undefined : (prev.cuisine120 !== undefined ? prev.cuisine120 : false)
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer font-bold ${
                      characteristics.cuisineType === item.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {characteristics.cuisineType && characteristics.cuisineType !== "none" && (
                <div className="mt-1.5 pl-3 border-l-2 border-bungeco-orange py-0.5 space-y-1 animate-fade-in text-left">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Largeur d'origine</span>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { key: true, label: "120 cm" },
                      { key: false, label: "80 cm" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setCharacteristics((prev) => ({ ...prev, cuisine120: opt.key }))}
                        className={`py-1 rounded text-xs font-semibold border text-center cursor-pointer ${
                          characteristics.cuisine120 === opt.key
                            ? "bg-orange-50 border-bungeco-orange text-bungeco-orange font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Raccordements Sanitaires</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "WC", countKey: "wcCount" },
                  { label: "Douches", countKey: "doucheCount" },
                ].map((item) => {
                  const val = (characteristics as any)[item.countKey] || 0;
                  return (
                    <div key={item.label} className="bg-slate-50 border border-slate-200/50 p-2 rounded-lg flex flex-col justify-between">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</span>
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (val > 0) {
                              setCharacteristics((prev) => ({ ...prev, [item.countKey]: val - 1 }));
                            }
                          }}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-bungeco-dark">{val}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCharacteristics((prev) => ({ ...prev, [item.countKey]: val + 1 }));
                          }}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* S1, SS1, SD1 Specific sanitary options */}
        {(moduleType === "S1" || moduleType === "SS1" || moduleType === "SD1") && (
          <div className="space-y-3 pt-1 text-left animate-fade-in">
            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-sans">Chauffe-eau</span>
              <div className="flex gap-1.5">
                {[
                  { key: true, label: "Présence Chauffe-eau" },
                  { key: false, label: "Aucun" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setCharacteristics((prev) => ({ ...prev, chauffeEau: opt.key }))}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer font-bold ${
                      characteristics.chauffeEau === opt.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white font-bold"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Type de WC</span>
              <div className="grid grid-cols-2 gap-1.5">
                {["WC anglais", "WC turc"].map((typeWC) => (
                  <button
                    key={typeWC}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({ ...prev, typeWC: typeWC as any }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                      characteristics.typeWC === typeWC
                        ? "bg-bungeco-orange border-bungeco-orange text-white font-bold shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {typeWC}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sanitaire 6m options */}
        {moduleType === "Sanitaire 6m" && (
          <div className="space-y-3 pt-1 text-left animate-fade-in">
            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Configuration Usine</span>
              <div className="grid grid-cols-3 gap-1.5">
                {["SX", "DX", "autre"].map((cfg) => (
                  <button
                    key={cfg}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({ ...prev, configSanitaire: cfg as any }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                      characteristics.configSanitaire === cfg
                        ? "bg-bungeco-orange border-bungeco-orange text-white font-bold shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {cfg}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Communication Vestiaires-Douches</span>
              <div className="flex gap-1.5">
                {[
                  { key: true, label: "Oui (Prévu)" },
                  { key: false, label: "Non" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({ ...prev, commVestiaire: opt.key }))
                    }
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                      characteristics.commVestiaire === opt.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white font-bold shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Containers attributes */}
        {["C8'", "C10'", "C20'", "C20' OS"].includes(moduleType) && (
          <div className="space-y-3 pt-1 text-left animate-fade-in">
            {moduleType === "C20'" && (
              <div>
                <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Clef-Canne</span>
                <div className="flex gap-1.5">
                  {[
                    { key: true, label: "Présente" },
                    { key: false, label: "Manquante" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setCharacteristics((prev) => ({ ...prev, clefCanne: opt.key }))
                      }
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                        characteristics.clefCanne === opt.key
                          ? "bg-bungeco-orange border-bungeco-orange text-white font-bold shadow-3xs"
                          : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Couleur Container d'Origine</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: "RAL 9010", label: "Blanc RAL 9010" },
                  { key: "autre", label: "Autre" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({
                        ...prev,
                        couleurContainer: opt.key as any,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                      characteristics.couleurContainer === opt.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white font-bold shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cuve options */}
        {(moduleType === "Cuve 2500L" || moduleType === "Cuve 6300L") && (
          <div className="space-y-3 pt-1 text-left animate-fade-in">
            <div>
              <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">État de Vidange</span>
              <div className="flex gap-1.5">
                {[
                  { key: true, label: "Vidangée (Vide)" },
                  { key: false, label: "Pleine" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      setCharacteristics((prev) => ({ ...prev, vidangee: opt.key }))
                    }
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs text-center transition-all cursor-pointer ${
                      characteristics.vidangee === opt.key
                        ? "bg-bungeco-orange border-bungeco-orange text-white font-bold shadow-3xs"
                        : "bg-white border-slate-200 text-bungeco-dark hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Escalier non options fallback */}
        {(moduleType === "Escalier R+1" ||
          moduleType === "Escalier 4 marches" ||
          moduleType === "autre") && (
          <div className="bg-bungeco-light p-4 rounded-xl border border-slate-200 text-xs text-slate-500 italic flex items-center gap-1.5 animate-fade-in">
            <Info size={14} className="text-bungeco-orange shrink-0" />
            <span>Aucune spécification technique additionnelle n'est requise d'office pour les escaliers ou les fiches personnalisées.</span>
          </div>
        )}

        {/* Keys slider for habitable and some sanitary modules */}
        {["B4", "B5", "B6", "SD2", "SDU", "SSU", "Sanitaire 6m"].includes(moduleType) && (
          <div className="mt-4 border-t border-slate-100 pt-4 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="keys-slider" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                  Nombre de Clés Remises
                </label>
                <span className="text-[10px] text-slate-450">Toute clé manquante entraînera la facturation d'un barillet.</span>
              </div>
              <span className="text-xs font-mono font-bold text-bungeco-orange bg-orange-50 border border-orange-100 rounded px-2.5 py-1">
                {characteristics.cles ?? 0} {characteristics.cles && characteristics.cles > 1 ? "clés" : "clé"}
              </span>
            </div>
            <input
              id="keys-slider"
              type="range"
              min="0"
              max={moduleType === "Sanitaire 6m" ? 8 : 2}
              value={characteristics.cles ?? 0}
              onChange={(e) =>
                setCharacteristics((prev) => ({ ...prev, cles: parseInt(e.target.value) }))
              }
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-bungeco-orange"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-bold px-1">
              {moduleType === "Sanitaire 6m" ? (
                <>
                  <span>0 clé</span>
                  <span>2</span>
                  <span>4</span>
                  <span>6</span>
                  <span>8 clés</span>
                </>
              ) : (
                <>
                  <span>0 clé</span>
                  <span>1 clé</span>
                  <span>2 clés</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Habitability module mobilier options list */}
      {["B4", "B5", "B6"].includes(moduleType) && (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-4">
          <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center justify-between border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
            <div className="flex items-center gap-2">
              <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0">03</span>
              <Armchair className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
              <span>Mobilier d'Origine Recensé</span>
            </div>
            <span className="text-[10px] text-bungeco-orange bg-orange-50 px-2 py-0.5 rounded border border-orange-100 normal-case font-bold font-mono">Quantités</span>
          </h3>

          <div className="space-y-3 px-1 text-left">
            {Object.keys(INITIAL_MOBILIER).map((key) => {
              const label = key === "microondes" ? "Micro-ondes" : key;
              const currentMob = characteristics.mobilier || { ...INITIAL_MOBILIER };
              const value = currentMob[key as keyof typeof INITIAL_MOBILIER] || 0;

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between gap-4 text-xs font-sans">
                    <span className="text-slate-700 font-semibold capitalize w-24 shrink-0">{label}</span>
                    <div className="relative flex-1">
                      <select
                        id={`mob-select-${key}`}
                        value={value}
                        onChange={(e) =>
                          updateFurnitureQty(key as any, parseInt(e.target.value))
                        }
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-bungeco-orange cursor-pointer appearance-none pr-8 select-all"
                      >
                        {Array.from({ length: 51 }, (_, i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                    <span className={`w-12 text-center text-[10px] font-mono font-bold px-1 py-0.5 rounded transition shrink-0 ${
                      value > 0 ? "bg-orange-50 text-bungeco-orange border border-orange-100" : "bg-slate-100 text-slate-400"
                    }`}>
                      {key === "casier" && value > 0 ? `${value}x2` : value}
                    </span>
                  </div>
                  {key === "autre" && value > 0 && (
                    <div className="pt-1 pl-28 pr-14 animate-fade-in">
                      <input
                        type="text"
                        placeholder="Préciser le mobilier autre..."
                        value={characteristics.mobilierAutreTexte || ""}
                        onChange={(e) =>
                          setCharacteristics((prev) => ({
                            ...prev,
                            mobilierAutreTexte: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-bungeco-orange"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
