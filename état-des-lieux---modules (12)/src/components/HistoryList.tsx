/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { HistoryRecord, ModuleType, ALL_MODULE_TYPES, DeliveryControl, Inspection } from "../types";
import {
  Search,
  Filter,
  FileText,
  Trash2,
  Edit3,
  Calendar,
  AlertTriangle,
  Layers,
  Wrench,
  Download,
  Mail,
  Package,
} from "lucide-react";
import {
  generateInspectionPDF,
  generateDeliveryControlPDF,
  generateInspectionPDFBlob,
  generateDeliveryControlPDFBlob,
  shareOrEmailPDF,
  getEDLSubject,
  getDeliveryControlSubject,
} from "../utils";

interface HistoryListProps {
  inspections: HistoryRecord[];
  onSelectEdit: (record: HistoryRecord) => void;
  onDelete: (id: string) => void;
  highlightId?: string | null;
}

export default function HistoryList({
  inspections,
  onSelectEdit,
  onDelete,
  highlightId,
}: HistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<ModuleType | "ALL">("ALL");

  // Filtering logic that inspects normal records AND checks across Delivery Controls
  const filteredRecords = inspections.filter((rec) => {
    const term = searchTerm.toLowerCase();
    
    if ("isDeliveryControl" in rec && rec.isDeliveryControl === true) {
      const matchClient = rec.client.toLowerCase().includes(term);
      const matchCmd = (rec.cmdRef || "").toLowerCase().includes(term);
      const matchModule = rec.modules.some((m) => m.moduleNumber.toLowerCase().includes(term));
      const matchType = filterType === "ALL" || rec.modules.some((m) => m.moduleType === filterType);
      return (matchClient || matchCmd || matchModule) && matchType;
    } else {
      const ins = rec as Inspection;
      const matchesSearch = ins.moduleNumber.toLowerCase().includes(term);
      const matchesType = filterType === "ALL" || ins.moduleType === filterType;
      return matchesSearch && matchesType;
    }
  });

  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const handleShareDeliveryControl = async (e: React.MouseEvent, dc: DeliveryControl) => {
    e.stopPropagation();
    if (sharingId) return;
    setSharingId(dc.id);
    try {
      const result = await generateDeliveryControlPDFBlob(dc);
      if (result) {
        const subject = getDeliveryControlSubject(dc);
        await shareOrEmailPDF({
          blob: result.blob,
          fileName: result.fileName,
          title: subject,
          text: `Veuillez trouver ci-joint le rapport de contrôle qualité avant livraison pour le client ${dc.client}. Destinataire : contact@bungeco.fr`,
          subject,
          body: `Bonjour,\n\nVeuillez trouver ci-joint le rapport de contrôle qualité avant livraison pour le client ${dc.client}.\n\nDestinataire : contact@bungeco.fr\n\nCordialement,\nL'équipe BUNG'ECO`,
          recipientEmail: "contact@bungeco.fr",
        });
      }
    } catch (err) {
      console.error("Share delivery control failed:", err);
    } finally {
      setSharingId(null);
    }
  };

  const handleShareInspection = async (e: React.MouseEvent, ins: Inspection) => {
    e.stopPropagation();
    if (sharingId) return;
    setSharingId(ins.id);
    try {
      const result = await generateInspectionPDFBlob(ins);
      if (result) {
        const isNeuf = !!ins.isModuleNeuf;
        const modNum = ins.moduleNumber?.trim() || "Sans réf";
        const subject = getEDLSubject(ins);
        const fileName = isNeuf
          ? `EDL_Module_${modNum}_NEUF.pdf`
          : result.fileName;
        await shareOrEmailPDF({
          blob: result.blob,
          fileName,
          title: subject,
          text: `Veuillez trouver ci-joint l'état des lieux du module ${ins.moduleType} n° ${modNum}. Destinataire : contact@bungeco.fr`,
          subject,
          body: `Bonjour,\n\nVeuillez trouver ci-joint l'état des lieux du module ${ins.moduleType} n° ${modNum}.\n\nDestinataire : contact@bungeco.fr\n\nCordialement,\nL'équipe BUNG'ECO`,
          recipientEmail: "contact@bungeco.fr",
        });
      }
    } catch (err) {
      console.error("Share EDL failed:", err);
    } finally {
      setSharingId(null);
    }
  };

  const handleDownloadPdf = async (e: React.MouseEvent, rec: HistoryRecord) => {
    e.stopPropagation();
    
    if ("isDeliveryControl" in rec && rec.isDeliveryControl === true) {
      setLoadingPdfId(rec.id);
      await generateDeliveryControlPDF(rec);
      setLoadingPdfId(null);
    } else {
      const inspection = rec as Inspection;
      if (!inspection.moduleNumber || !inspection.moduleNumber.trim()) {
        alert("Veuillez renseigner la référence du module avant de générer l’EDL.");
        return;
      }
      setLoadingPdfId(inspection.id);
      await generateInspectionPDF(inspection);
      setLoadingPdfId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-150 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-6 md:p-8">
      {/* Header section with total files list */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5 select-none">
        <div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="text-bungeco-orange" size={18} />
            Historique complet des Dossiers ({inspections.length})
          </h2>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Consultez les rapports d'EDL et de Contrôle Qualité avant livraison, lancez une recherche croisée ou exportez au format PDF officiel.
          </p>
        </div>
      </div>

      {/* 7-day limits temporary retention notice banner */}
      <div className="mb-6 p-4 bg-amber-50/70 border-l-4 border-bungeco-orange rounded-r-xl flex items-start gap-3 text-left">
        <AlertTriangle className="text-bungeco-orange shrink-0 mt-0.5 animate-pulse" size={18} />
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide leading-none">
            Rétention Temporaire Locale Activée (Sécurité & Simplicité)
          </h4>
          <p className="text-xs text-slate-700 mt-1.5 font-semibold">
            Les EDL sont conservés temporairement pendant 7 jours sur cet appareil. Pensez à télécharger ou transférer vos PDF.
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium font-mono leading-tight">
            🛡️ Sans base de données cloud • Aucune inscription requise • Confidentialité totale garantie.
          </p>
        </div>
      </div>

      {/* Dynamic filter bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            id="history-search"
            type="text"
            placeholder="Rechercher par n° de module, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange transition-all bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="text-slate-400 shrink-0" size={16} />
          <select
            id="history-filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ModuleType | "ALL")}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange transition-all bg-slate-50/50 cursor-pointer"
          >
            <option value="ALL">Tous les types de module</option>
            {ALL_MODULE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of records (Inspections & DeliveryControls) */}
      {filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
            <FileText size={22} />
          </div>
          <p className="text-slate-600 font-semibold text-sm">Aucun rapport trouvé</p>
          <p className="text-slate-400 text-xs mt-1 max-w-sm font-medium">
            {inspections.length === 0
              ? "Commencez par ajouter votre premier dossier depuis les onglets ci-dessus."
              : "Aucun dossier ne correspond à vos filtres de recherche. Veuillez réinitialiser les filtres."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRecords.map((rec) => {
            // Check record type
            const isDC = "isDeliveryControl" in rec && rec.isDeliveryControl === true;

            const dateObj = new Date(rec.date);
            const formattedDate = dateObj.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            if (isDC) {
              // --- RENDER DELIVERY CONTROL CARD ---
              const dc = rec as DeliveryControl;
              const totalModules = dc.modules.length;
              const hasAlerts = dc.modules.some((m) => m.status === "reserves");

              const isHighlighted = dc.id === highlightId;

              return (
                <div
                  key={dc.id}
                  className={`group relative flex flex-col justify-between p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all border-l-4 border-l-[#D96C0F] text-left select-none ${
                    isHighlighted
                      ? "bg-orange-50/40 border-bungeco-orange ring-2 ring-bungeco-orange/20 scale-[1.01] duration-500"
                      : "bg-white border-slate-200 hover:border-[#D96C0F]"
                  }`}
                >
                  <div>
                    {/* Header bar row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black bg-slate-800 text-white uppercase tracking-wider shadow-3xs">
                          <Package size={11} /> COMMANDE CLIENT
                        </span>
                        {dc.status === "attente" ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase">
                            ⏸ ATTENTE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                            ✓ VALIDÉ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-slate-450 text-xs gap-1 font-semibold font-mono">
                        {isHighlighted && (
                          <span className="mr-1 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-bungeco-orange text-white uppercase select-none tracking-wider shadow-3xs animate-bounce">
                            🆕 NOUVEAU
                          </span>
                        )}
                        <Calendar size={12} />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Client name / order reference */}
                    <div className="flex flex-col gap-0.5 mb-2">
                      <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase">
                        📦 {dc.client}
                      </h3>
                      {dc.cmdRef && (
                        <p className="text-[10px] text-slate-450 font-black font-mono tracking-wider leading-none uppercase">
                          Réf Commande : {dc.cmdRef}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-bold font-mono tracking-tight leading-none mt-1 uppercase">
                        Contrôleur : {dc.controller}
                      </p>
                    </div>

                    {/* Mini inline checklist labels inside the card */}
                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 mt-3">
                      <div className="text-[9px] font-black text-slate-400 tracking-wider uppercase leading-none">
                        Rapports par module ({totalModules}) :
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {dc.modules.map((m, idx) => (
                          <span
                            key={m.id || idx}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-black font-mono rounded border ${
                              m.status === "conforme"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {m.status === "conforme" ? "🟢" : "🟠"} {m.moduleNumber || "Sans n°"}
                          </span>
                        ))}
                      </div>
                    </div>

                    {dc.chantier && (
                      <p className="text-[10px] text-slate-500 font-bold mt-2.5 flex items-center gap-1 uppercase">
                        📍 Destination : <span className="text-slate-800 font-black">{dc.chantier}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions row for this DeliveryControl */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 mt-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectEdit(dc)}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
                      title={dc.status === "attente" ? "Reprendre ce contrôle" : "Modifier ce contrôle"}
                    >
                      <Edit3 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadPdf(e, dc)}
                      disabled={loadingPdfId === dc.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-bungeco-orange hover:bg-orange-700 text-white font-black text-[11px] py-2 px-3 rounded-xl shadow-xs transition-all cursor-pointer select-all"
                      title="Télécharger le document PDF"
                    >
                      {loadingPdfId === dc.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Download size={13} />
                      )}
                      <span>Télécharger le PDF</span>
                    </button>

                    <button
                      type="button"
                      disabled={sharingId === dc.id}
                      onClick={(e) => handleShareDeliveryControl(e, dc)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-bungeco-orange hover:bg-orange-50 disabled:opacity-50 font-black text-[11px] transition-all cursor-pointer"
                      title="Partager le document PDF"
                    >
                      {sharingId === dc.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-bungeco-orange border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Mail size={13} />
                      )}
                      <span>Partager</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(dc.id)}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 transition-all cursor-pointer"
                      title="Supprimer ce contrôle"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            } else {
              // --- RENDER STANDARD EDL CARD ---
              const ins = rec as Inspection;
              const issuesList = ins.travauxPrevoir
                .split("\n")
                .filter((line) => line.trim().length > 0);

              const natureLabel = 
                ins.nature === "reprise" 
                  ? "🔄 Fin de location" 
                  : ins.nature === "constat" 
                    ? "👷 Sur chantier" 
                    : "📦 Avant livraison";

              const isHighlighted = ins.id === highlightId;

              return (
                <div
                  key={ins.id}
                  className={`group relative flex flex-col justify-between p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all text-left select-none ${
                    isHighlighted
                      ? "bg-orange-50/40 border-bungeco-orange ring-2 ring-bungeco-orange/20 scale-[1.01] duration-500"
                      : "bg-white border-slate-150 hover:border-bungeco-orange"
                  }`}
                >
                  <div>
                    {/* Top line with labels */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-[#1e293b] text-white uppercase select-none tracking-wider shadow-3xs">
                          {ins.moduleType}
                        </span>
                        <span className="font-mono text-[10px] bg-orange-50/70 text-[#D96C0F] px-1.5 py-0.5 rounded border border-orange-200 font-black select-all uppercase">
                          🔖 {ins.moduleNumber}
                        </span>
                      </div>
                      <div className="flex items-center text-slate-450 text-xs gap-1 font-semibold font-mono">
                        {isHighlighted && (
                          <span className="mr-1 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-bungeco-orange text-white uppercase select-none tracking-wider shadow-3xs animate-bounce">
                            🆕 NOUVEAU
                          </span>
                        )}
                        <Calendar size={12} />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Title labels */}
                    <div className="mb-2">
                      <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
                        📄 Constat EDL • {natureLabel}
                      </h3>
                      <p className="text-[10px] text-slate-450 font-bold font-mono tracking-wider mb-1 lowercase leading-none">
                        {ins.nomTechnicien ? `Technicien : ${ins.nomTechnicien}` : "Technicien non spécifié"}
                      </p>
                    </div>

                    {/* Brief options preview */}
                    <p className="text-slate-500 text-xs line-clamp-1 mb-2.5 font-medium">
                      {ins.characteristics.couleurRAL && `Coloris: ${ins.characteristics.couleurRAL} | `}
                      {ins.characteristics.climTrappe &&
                        ins.characteristics.climTrappe !== "none" &&
                        `${ins.characteristics.climTrappe} | `}
                      {ins.characteristics.cuisineType &&
                        ins.characteristics.cuisineType !== "none" &&
                        `Cuis. ${ins.characteristics.cuisineType} | `}
                      {ins.characteristics.sanitaireType &&
                        ins.characteristics.sanitaireType !== "none" &&
                        `${ins.characteristics.sanitaireType} | `}
                      {ins.characteristics.typeWC && `${ins.characteristics.typeWC} | `}
                      {ins.characteristics.cles !== undefined && `${ins.characteristics.cles} clé(s)`}
                    </p>

                    {/* Works logic list */}
                    {issuesList.length > 0 ? (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2.5 mb-3">
                        <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-black uppercase mb-1">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>Travaux requis :</span>
                        </div>
                        <ul className="text-[10.5px] text-amber-700 space-y-1 pl-0">
                          {issuesList.slice(0, 2).map((issue, idx) => (
                            <li key={idx} className="line-clamp-1 italic font-semibold">
                              • {issue}
                            </li>
                          ))}
                          {issuesList.length > 2 && (
                            <li className="text-[9px] text-amber-500 font-extrabold italic pl-2">
                              + {issuesList.length - 2} autre(s) action(s)
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600 text-xs mb-3 italic font-semibold">
                        <Wrench size={12} />
                        <span>Aucune observation de réparation</span>
                      </div>
                    )}
                  </div>

                  {/* Operational actions */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 mt-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectEdit(ins)}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
                      title="Modifier cet état des lieux"
                    >
                      <Edit3 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadPdf(e, ins)}
                      disabled={loadingPdfId === ins.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-bungeco-orange hover:bg-orange-700 text-white font-black text-[11px] py-2 px-3 rounded-xl shadow-xs transition-all cursor-pointer select-all"
                      title="Télécharger le document PDF"
                    >
                      {loadingPdfId === ins.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Download size={13} />
                      )}
                      <span>Télécharger le PDF</span>
                    </button>

                    <button
                      type="button"
                      disabled={sharingId === ins.id}
                      onClick={(e) => handleShareInspection(e, ins)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-bungeco-orange hover:bg-orange-50 disabled:opacity-50 font-black text-[11px] transition-all cursor-pointer"
                      title="Partager le document PDF"
                    >
                      {sharingId === ins.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-bungeco-orange border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Mail size={13} />
                      )}
                      <span>Partager</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(ins.id)}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 transition-all cursor-pointer"
                      title="Supprimer cet état des lieux"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

    </div>
  );
}
