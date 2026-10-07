/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from "react";
import { UserCheck, PenTool, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import SignaturePad from "./SignaturePad";

interface SignaturesSectionProps {
  nomTechnicien: string;
  setNomTechnicien: (n: string) => void;
  nomClient: string;
  setNomClient: (n: string) => void;
  signatureTechnicien: string;
  setSignatureTechnicien: (sig: string) => void;
  signatureClient: string;
  setSignatureClient: (sig: string) => void;
}

export default function SignaturesSection({
  nomTechnicien,
  setNomTechnicien,
  nomClient,
  setNomClient,
  signatureTechnicien,
  setSignatureTechnicien,
  signatureClient,
  setSignatureClient,
}: SignaturesSectionProps) {
  const [showTechPad, setShowTechPad] = useState(false);
  const [showClientPad, setShowClientPad] = useState(false);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] space-y-5">
      <h3 className="text-xs md:text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b-2 border-bungeco-orange/20 pb-2.5 font-display">
        <span className="w-5.5 h-5.5 rounded bg-bungeco-orange text-white flex items-center justify-center text-[10.5px] font-black shrink-0 font-display">07</span>
        <UserCheck className="text-bungeco-orange w-4.5 h-4.5 shrink-0" />
        Signataires et Visas (Facultatif)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Technician Area */}
        <div className="space-y-3.5 p-3.5 bg-slate-50/55 rounded-xl border border-slate-200/50 flex flex-col justify-between">
          <div className="space-y-3">
            <label htmlFor="tech-name" className="block text-[11px] uppercase tracking-wider text-slate-500 font-extrabold font-sans">
              👤 Technicien Vérificateur
            </label>
            <input
              id="tech-name"
              type="text"
              placeholder="Nom du technicien"
              value={nomTechnicien}
              onChange={(e) => setNomTechnicien(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange text-bungeco-dark transition-all font-semibold"
            />

            {signatureTechnicien ? (
              <div className="bg-white p-2.5 border border-slate-200 rounded-lg text-center relative shadow-3xs">
                <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 justify-center mb-1">
                  <CheckCircle2 size={12} /> Signature Enregistrée ✓
                </span>
                <img
                  src={signatureTechnicien}
                  alt="Signature technicien"
                  className="max-h-24 mx-auto object-contain bg-slate-50 border border-slate-100 p-1.5 rounded"
                />
                <button
                  type="button"
                  onClick={() => setSignatureTechnicien("")}
                  className="mt-2 text-[10px] text-red-500 font-bold hover:underline cursor-pointer"
                >
                  Supprimer la signature
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTechPad(!showTechPad)}
                  className="w-full py-2 px-3 border border-dashed border-bungeco-orange/40 hover:border-bungeco-orange text-bungeco-orange rounded-lg text-[11px] font-black tracking-normal transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-[#FFF8F3] hover:bg-orange-50/50"
                >
                  <PenTool size={11} />
                  {showTechPad ? "Masquer la zone" : "✍ Ajouter une signature (Technicien)"}
                  {showTechPad ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                
                {showTechPad && (
                  <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm animate-slide-in">
                    <SignaturePad
                      id="signature-tech"
                      label="Tracé Signature Technicien"
                      value={signatureTechnicien}
                      onChange={setSignatureTechnicien}
                      placeholder="Signez ici avec votre doigt/souris"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Client Area */}
        <div className="space-y-3.5 p-3.5 bg-slate-50/55 rounded-xl border border-slate-200/50 flex flex-col justify-between">
          <div className="space-y-3">
            <label htmlFor="client-name" className="block text-[11px] uppercase tracking-wider text-slate-500 font-extrabold font-sans">
              🤝 Représentant Client / Chantier
            </label>
            <input
              id="client-name"
              type="text"
              placeholder="Nom du client"
              value={nomClient}
              onChange={(e) => setNomClient(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange text-bungeco-dark transition-all font-semibold"
            />

            {signatureClient ? (
              <div className="bg-white p-2.5 border border-slate-200 rounded-lg text-center relative shadow-3xs">
                <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 justify-center mb-1">
                  <CheckCircle2 size={12} /> Signature Enregistrée ✓
                </span>
                <img
                  src={signatureClient}
                  alt="Signature client"
                  className="max-h-24 mx-auto object-contain bg-slate-50 border border-slate-100 p-1.5 rounded"
                />
                <button
                  type="button"
                  onClick={() => setSignatureClient("")}
                  className="mt-2 text-[10px] text-red-500 font-bold hover:underline cursor-pointer"
                >
                  Supprimer la signature
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowClientPad(!showClientPad)}
                  className="w-full py-2 px-3 border border-dashed border-bungeco-orange/40 hover:border-bungeco-orange text-bungeco-orange rounded-lg text-[11px] font-black tracking-normal transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-[#FFF8F3] hover:bg-orange-50/50"
                >
                  <PenTool size={11} />
                  {showClientPad ? "Masquer la zone" : "✍ Ajouter une signature (Client)"}
                  {showClientPad ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                
                {showClientPad && (
                  <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm animate-slide-in">
                    <SignaturePad
                      id="signature-client"
                      label="Tracé Signature Client"
                      value={signatureClient}
                      onChange={setSignatureClient}
                      placeholder="Signez ici avec votre doigt/souris"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
