/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { HistoryRecord, ModuleType, INITIAL_MOBILIER, DeliveryControl, Inspection } from "./types";
import EDLForm from "./components/EDLForm";
import DeliveryControlForm from "./components/DeliveryControlForm";
import HistoryList from "./components/HistoryList";
import { getValue, setValue } from "./indexedDbStore";
import {
  generateInspectionPDFBlob,
  generateDeliveryControlPDFBlob,
  shareOrEmailPDF,
  getEDLSubject,
  getDeliveryControlSubject,
} from "./utils";
import {
  PlusCircle,
  FileText,
  Database,
  Mail,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Package,
} from "lucide-react";

// Pre-seeded inspections to populate history database on first load
const SEED_INSPECTIONS: HistoryRecord[] = [
  {
    id: "seed-b6-1",
    moduleType: "B6",
    moduleNumber: "B6-402",
    date: "2026-06-15",
    characteristics: {
      gamme: "Top",
      configurationType: "Façade",
      climTrappe: "Clim",
      cuisineType: "Bois",
      cuisine120: true,
      sanitaireType: "WC",
      wcCount: 1,
      presenceDouche: false,
      mobilier: {
        ...INITIAL_MOBILIER,
        table: 2,
        chaise: 6,
        frigo: 1,
        microondes: 1,
      },
      cles: 1,
      couleurRAL: "RAL 7016",
    },
    travauxPrevoir: "- Double des clefs à prévoir\n- Nettoyage du plancher souillé de terre",
    observations: "Climatiseur testé en mode chaud/froid standard. Le client n'a rendu qu'une seule clé sur les deux initialement fournies.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-s1-2",
    moduleType: "S1",
    moduleNumber: "S1-105",
    date: "2026-06-12",
    characteristics: {
      chauffeEau: true,
      typeWC: "WC anglais",
    },
    travauxPrevoir: "",
    observations: "Module sanitaire en parfait état. Raccordements électriques vérifiés. Cuve raccordée.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-cuve-3",
    moduleType: "Cuve 2500L",
    moduleNumber: "CV-2511",
    date: "2026-06-10",
    characteristics: {
      vidangee: false,
    },
    travauxPrevoir: "- Vidange de la cuve obligatoire (cuve pleine)",
    observations: "La cuve est encore pleine à 60% d'eaux usées. Facturation de la vidange d'office au client sortant.",
    createdAt: new Date().toISOString(),
  },
];

export default function App() {
  const [inspections, setInspections] = useState<HistoryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "new_edl" | "delivery_check">("history");
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [editingDeliveryControl, setEditingDeliveryControl] = useState<DeliveryControl | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentModuleNumber, setCurrentModuleNumber] = useState("");
  const [currentModuleType, setCurrentModuleType] = useState<ModuleType | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Load and filter from IndexedDB (or localStorage) on startup
  useEffect(() => {
    const loadData = async () => {
      let initialList: HistoryRecord[] = [];
      try {
        const dbValue = await getValue<HistoryRecord[]>("modules_edl_list");
        if (dbValue && dbValue.length > 0) {
          initialList = dbValue;
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem("modules_edl_list");
          if (saved) {
            initialList = JSON.parse(saved);
          } else {
            initialList = SEED_INSPECTIONS;
          }
        }
      } catch (err) {
        console.error("IndexedDB error, fallback to localStorage", err);
        const saved = localStorage.getItem("modules_edl_list");
        if (saved) {
          try {
            initialList = JSON.parse(saved);
          } catch (_) {
            initialList = SEED_INSPECTIONS;
          }
        } else {
          initialList = SEED_INSPECTIONS;
        }
      }

      // Ensure all items have a creation date (createdAt)
      const enrichedList = initialList.map((item) => {
        const createdAt = item.createdAt || new Date(item.date).toISOString();
        return {
          ...item,
          createdAt,
        };
      });

      // Keep only records from the last 7 days and sort descending
      const now = new Date();
      const sortedAndFilteredList = enrichedList
        .filter((item) => {
          const createdDate = new Date(item.createdAt);
          const diffMs = now.getTime() - createdDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setInspections(sortedAndFilteredList);

      // Keep them in sync in the background
      try {
        await setValue("modules_edl_list", sortedAndFilteredList);
      } catch (_) {}
      try {
        localStorage.setItem("modules_edl_list", JSON.stringify(sortedAndFilteredList));
      } catch (_) {}
    };

    loadData();
  }, []);

  const saveList = async (list: HistoryRecord[], newlyCreatedOrEditedId?: string): Promise<HistoryRecord[]> => {
    const now = new Date();
    const sortedAndFilteredList = list.map(item => ({
      ...item,
      createdAt: item.createdAt || new Date(item.date).toISOString()
    })).filter((item) => {
      const createdDate = new Date(item.createdAt);
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let iDbSuccess = false;
    let localStorageSuccess = false;

    // Save to IndexedDB
    try {
      await setValue("modules_edl_list", sortedAndFilteredList);
      iDbSuccess = true;
    } catch (err) {
      console.error("IndexedDB save failed", err);
    }

    // Save to localStorage
    try {
      localStorage.setItem("modules_edl_list", JSON.stringify(sortedAndFilteredList));
      localStorageSuccess = true;
    } catch (err) {
      console.warn("localStorage save failed/quota exceeded", err);
    }

    if (!iDbSuccess && !localStorageSuccess) {
      throw new Error("Impossible d’enregistrer sur cet appareil");
    }

    if (newlyCreatedOrEditedId) {
      setHighlightId(newlyCreatedOrEditedId);
      setTimeout(() => {
        setHighlightId(null);
      }, 5000);

      // Auto scroll to top
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }, 100);
    }

    return sortedAndFilteredList;
  };

  const [isSharing, setIsSharing] = useState(false);

  const handleSaveInspection = async (formData: Omit<Inspection, "id" | "createdAt"> & { id?: string }): Promise<Inspection | null> => {
    let updatedList: HistoryRecord[] = [];
    const isEditing = !!formData.id;
    const targetId = formData.id || `edl-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let savedIns: Inspection;

    if (isEditing) {
      // Edit existing
      savedIns = {
        ...formData,
        id: targetId,
        createdAt: new Date().toISOString(), // Move to top on edit as requested
      } as Inspection;
      updatedList = inspections.map((ins) => {
        if (ins.id === targetId) {
          return savedIns;
        }
        return ins;
      });
    } else {
      // Create new
      savedIns = {
        ...formData,
        id: targetId,
        createdAt: new Date().toISOString(),
      } as Inspection;
      updatedList = [savedIns, ...inspections];
    }

    try {
      const savedList = await saveList(updatedList, targetId);
      setInspections(savedList);
      setEditingInspection(null);
      setCurrentModuleNumber("");
      setCurrentModuleType(null);
      setActiveTab("history");
      showToast(isEditing ? "État des lieux modifié avec succès !" : "Nouvel état des lieux enregistré !");
      return savedIns;
    } catch (error) {
      console.error("Save error:", error);
      alert("Le nombre ou le poids des photos est trop important pour un stockage temporaire sur cet appareil. Merci de supprimer quelques photos.");
      return null;
    }
  };

  const handleSaveAndShareInspection = async (formData: Omit<Inspection, "id" | "createdAt"> & { id?: string }) => {
    setIsSharing(true);
    try {
      const saved = await handleSaveInspection(formData);
      if (!saved) return;
      showToast("Génération du document PDF...");
      const result = await generateInspectionPDFBlob(saved, (msg) => showToast(msg));
      if (result) {
        const isNeuf = !!saved.isModuleNeuf;
        const modNum = saved.moduleNumber?.trim() || "Sans réf";
        const subject = getEDLSubject(saved);
        const fileName = isNeuf
          ? `EDL_Module_${modNum}_NEUF.pdf`
          : result.fileName;
        await shareOrEmailPDF({
          blob: result.blob,
          fileName,
          title: subject,
          text: `Veuillez trouver ci-joint l'état des lieux du module ${saved.moduleType} n° ${modNum}. Destinataire : contact@bungeco.fr`,
          subject,
          body: `Bonjour,\n\nVeuillez trouver ci-joint l'état des lieux du module ${saved.moduleType} n° ${modNum}.\n\nDestinataire : contact@bungeco.fr\n\nCordialement,\nL'équipe BUNG'ECO`,
          recipientEmail: "contact@bungeco.fr",
        });
      }
    } catch (err) {
      console.error("Save & share error:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveDeliveryControl = async (control: DeliveryControl): Promise<DeliveryControl | null> => {
    let updatedList: HistoryRecord[] = [];
    const targetId = control.id;
    const isEditing = inspections.some((rec) => rec.id === targetId);
    let savedControl: DeliveryControl;

    if (isEditing) {
      savedControl = {
        ...control,
        createdAt: new Date().toISOString(), // Move to top on edit as requested
      };
      updatedList = inspections.map((rec) => {
        if (rec.id === targetId) {
          return savedControl;
        }
        return rec;
      });
    } else {
      savedControl = {
        ...control,
        createdAt: new Date().toISOString()
      };
      updatedList = [savedControl, ...inspections];
    }

    try {
      const savedList = await saveList(updatedList, targetId);
      setInspections(savedList);
      setEditingDeliveryControl(null);
      setActiveTab("history");
      showToast(isEditing ? "Contrôle de livraison modifié avec succès !" : "Contrôle qualité de livraison enregistré !");
      return savedControl;
    } catch (error) {
      console.error("Save error:", error);
      alert("Le nombre ou le poids des photos est trop important pour un stockage temporaire sur cet appareil. Merci de supprimer quelques photos.");
      return null;
    }
  };

  const handleSaveAndShareDeliveryControl = async (control: DeliveryControl) => {
    setIsSharing(true);
    try {
      const saved = await handleSaveDeliveryControl(control);
      if (!saved) return;
      showToast("Génération du document PDF...");
      const result = await generateDeliveryControlPDFBlob(saved, (msg) => showToast(msg));
      if (result) {
        const subject = getDeliveryControlSubject(saved);
        await shareOrEmailPDF({
          blob: result.blob,
          fileName: result.fileName,
          title: subject,
          text: `Veuillez trouver ci-joint le rapport de contrôle qualité avant livraison pour le client ${saved.client}. Destinataire : contact@bungeco.fr`,
          subject,
          body: `Bonjour,\n\nVeuillez trouver ci-joint le rapport de contrôle qualité avant livraison pour le client ${saved.client}.\n\nDestinataire : contact@bungeco.fr\n\nCordialement,\nL'équipe BUNG'ECO`,
          recipientEmail: "contact@bungeco.fr",
        });
      }
    } catch (err) {
      console.error("Save & share error:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const record = inspections.find((r) => r.id === id);
    const label = record && "isDeliveryControl" in record && record.isDeliveryControl === true ? "ce contrôle de livraison" : "cet état des lieux";
    if (window.confirm(`Êtes-vous certain de vouloir supprimer définitivement ${label} ? Cette action est irréversible.`)) {
      const filtered = inspections.filter((ins) => ins.id !== id);
      try {
        const savedList = await saveList(filtered);
        setInspections(savedList);
        showToast("Rapport supprimé avec succès.");
      } catch (error) {
        console.error("Delete fail", error);
      }
    }
  };

  const handleSelectEdit = (record: HistoryRecord) => {
    if ("isDeliveryControl" in record && record.isDeliveryControl === true) {
      setEditingDeliveryControl(record as DeliveryControl);
      setEditingInspection(null);
      setActiveTab("delivery_check");
    } else {
      const inspection = record as Inspection;
      setEditingInspection(inspection);
      setEditingDeliveryControl(null);
      setCurrentModuleNumber(inspection.moduleNumber);
      setCurrentModuleType(inspection.moduleType);
      setActiveTab("new_edl");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Quick stats calculations
  const totalRecords = inspections.length;
  const activeBungalows = inspections.filter((ins) => {
    if ("isDeliveryControl" in ins) {
      return ins.modules.some((m) => ["B4", "B5", "B6"].includes(m.moduleType));
    }
    return ["B4", "B5", "B6"].includes(ins.moduleType);
  }).length;
  
  const requireWorks = inspections.filter((ins) => {
    if ("isDeliveryControl" in ins) {
      return ins.modules.some((m) => m.status === "reserves");
    }
    return ins.travauxPrevoir.trim().length > 0;
  }).length;

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-slate-900 flex flex-col font-sans">
      
      {/* Toast Alert popups */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-800 animate-slide-in select-none">
          <CheckCircle2 size={15} className="text-bungeco-orange" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header of Application */}
      <header className="sticky top-0 z-40 w-full bg-bungeco-dark text-white border-b border-bungeco-white/10 px-6 py-3.5 shadow-[0_2px_15px_rgba(0,0,0,0.15)] shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center justify-between xl:justify-start gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-bungeco-orange text-white flex items-center justify-center font-black text-xl shadow-[0_2px_8px_rgba(217,108,15,0.4)] select-none">
                B
              </span>
              <div>
                <h1 className="text-[14.5px] font-black text-white tracking-widest uppercase font-display leading-none">
                  BUNG'ECO
                </h1>
                <span className="text-[9.5px] text-bungeco-orange font-bold tracking-widest uppercase font-mono block mt-1 leading-none">
                  Logiciel Métier • EDL Manager Pro
                </span>
              </div>
            </div>

            {activeTab === "new_edl" && currentModuleNumber.trim() && (
              <div className="flex items-center gap-1.5 bg-bungeco-orange/25 text-white rounded-lg px-2.5 py-1 text-xs font-black border border-bungeco-orange/35 uppercase select-none font-sans font-mono shrink-0">
                <span className="text-bungeco-orange">🔖</span> N° : {currentModuleNumber.trim().toUpperCase()}
              </div>
            )}
          </div>

          {/* Navigation Tab Selector Bar */}
          <div className="bg-[#1C1C1D] p-1.5 rounded-xl inline-flex self-start md:self-center shadow-inner border border-white/5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingInspection(null);
                setEditingDeliveryControl(null);
                setActiveTab("history");
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-bungeco-orange text-white shadow-[0_2px_6px_rgba(217,108,15,0.3)] font-black"
                  : "text-slate-350 hover:text-white"
              }`}
            >
              <Database size={13} className={activeTab === "history" ? "text-white" : "text-slate-400"} />
              Historique des Fiches
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingInspection(null);
                setEditingDeliveryControl(null);
                setActiveTab("new_edl");
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide transition-all cursor-pointer ${
                activeTab === "new_edl"
                  ? "bg-bungeco-orange text-white shadow-[0_2px_6px_rgba(217,108,15,0.3)] font-black"
                  : "text-slate-350 hover:text-white"
              }`}
            >
              <PlusCircle size={13} className={activeTab === "new_edl" ? "text-white" : "text-slate-400"} />
              {editingInspection ? "Modifier l'EDL" : "Saisir un EDL"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingInspection(null);
                setEditingDeliveryControl(null);
                setActiveTab("delivery_check");
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide transition-all cursor-pointer ${
                activeTab === "delivery_check"
                  ? "bg-bungeco-orange text-white shadow-[0_2px_6px_rgba(217,108,15,0.3)] font-black"
                  : "text-slate-350 hover:text-white"
              }`}
            >
              <Package size={13} className={activeTab === "delivery_check" ? "text-white" : "text-slate-400"} />
              {editingDeliveryControl ? "Modifier le contrôle" : "Contrôle avant livraison"}
            </button>
          </div>

          {/* User Details & mail tag */}
          <div className="hidden xl:flex items-center gap-3 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 font-mono text-slate-300 font-bold select-all">
              <Mail size={12} className="text-bungeco-orange" />
              <span className="text-[10px] font-bold">contact@bungeco.fr</span>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-950/35 text-emerald-400 border border-emerald-500/10 rounded-lg px-3 py-1.5 font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[9.5px] font-black uppercase tracking-widest">Connecté</span>
            </div>
          </div>
        </div>
      </header>

      {/* Dynamic Module Identification Top Banner */}
      {activeTab === "new_edl" && (
        <section className="bg-[#D96C0F] text-white py-3 md:py-4 px-6 shadow-md rounded-2xl border-t border-white/10 shrink-0 max-w-7xl mx-auto w-full mt-4 select-none animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <span className="text-xl md:text-2xl">🔖</span>
              <div>
                <h2 className="text-sm md:text-base font-black tracking-widest uppercase font-display">
                  {currentModuleNumber.trim() ? (
                    <>
                      MODULE : <span className="bg-white/15 px-3 py-1 rounded border border-white/10 ml-1 font-mono tracking-normal">{currentModuleNumber.trim().toUpperCase()}</span>
                    </>
                  ) : (
                    "RENSEIGNER LA RÉFÉRENCE DU MODULE"
                  )}
                </h2>
                <p className="text-[10px] md:text-xs text-white/80 font-bold font-mono tracking-wider mt-0.5 uppercase">
                  {currentModuleType ? `Type : BUNG'ECO ${currentModuleType}` : "Saisie en cours, spécifier le type et la référence"}
                </p>
              </div>
            </div>
            <div className="text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-black/20 text-white border border-white/20 px-3 py-1.5 rounded-lg select-none font-sans shrink-0">
              {editingInspection ? "📝 MODE MODIFICATION" : "✨ NOUVELLE SAISIE EN DIRECT"}
            </div>
          </div>
        </section>
      )}

      {/* Hero Header & Quick Stats Row */}
      {activeTab === "history" && (
        <section className="bg-white border-b border-slate-200/80 py-4 px-4 shadow-3xs shrink-0 select-none">
          <div className="max-w-7xl mx-auto grid grid-cols-3 gap-3 md:gap-4">
            <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-150/80 flex items-center gap-3">
              <div className="p-2 bg-bungeco-orange/10 text-bungeco-orange rounded-md">
                <FileText size={14} />
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider leading-none">Total Fiches</div>
                <div className="text-xs font-black text-slate-800 tracking-tight mt-0.5">{totalRecords}</div>
              </div>
            </div>
            
            <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-150/80 flex items-center gap-3">
              <div className="p-2 bg-bungeco-orange/10 text-bungeco-orange rounded-md">
                <TrendingUp size={14} />
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider leading-none">Habitabilité</div>
                <div className="text-xs font-black text-slate-800 tracking-tight mt-0.5">{activeBungalows} cabines</div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-150/80 flex items-center gap-3">
              <div className="p-2 bg-amber-55/10 text-amber-600 rounded-md">
                <AlertCircle size={14} />
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider leading-none">Avis de Travaux</div>
                <div className="text-xs font-black text-slate-800 tracking-tight mt-0.5">{requireWorks} fiches</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Workspace Layout Wrapper */}
      <main className="w-full max-w-7xl mx-auto p-4 flex-1 mb-12">
        {activeTab === "delivery_check" ? (
          <div className="flex-1 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 bg-bungeco-orange/10 border border-bungeco-orange/20 text-bungeco-orange rounded select-none">EXPÉDITIONS</span>
                <ChevronRight size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold tracking-wider text-slate-450 uppercase font-mono">
                  {editingDeliveryControl ? "Modification du Contrôle Qualité" : "Dossier Qualité Avant Livraison"}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setEditingDeliveryControl(null);
                  setActiveTab("history");
                }}
                className="text-[11.5px] text-[#D96C0F] font-bold hover:text-[#c25e0b] hover:underline cursor-pointer"
              >
                Retour à l'Historique
              </button>
            </div>

            <div>
              <DeliveryControlForm
                initialControl={editingDeliveryControl}
                onSave={handleSaveDeliveryControl}
                onSaveAndShare={handleSaveAndShareDeliveryControl}
                isSharing={isSharing}
                onCancel={() => {
                  setEditingDeliveryControl(null);
                  setActiveTab("history");
                }}
              />
            </div>
          </div>
        ) : activeTab === "new_edl" ? (
          <div className="flex-1 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 bg-bungeco-orange/10 border border-bungeco-orange/20 text-bungeco-orange rounded select-none">WORKBENCH</span>
                <ChevronRight size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold tracking-wider text-slate-450 uppercase font-mono">
                  {editingInspection ? "Modification d'un constat" : "Saisie d'un nouvel EDL"}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setEditingInspection(null);
                  setActiveTab("history");
                }}
                className="text-[11.5px] text-bungeco-orange font-bold hover:text-bungeco-orange/80 hover:underline cursor-pointer"
              >
                Retour à l'Historique
              </button>
            </div>

            {/* EDL creator form (steps 1 to 8) - takes the remaining space */}
            <div>
              <EDLForm
                initialInspection={editingInspection}
                onSave={handleSaveInspection}
                onSaveAndShare={handleSaveAndShareInspection}
                isSharing={isSharing}
                onCancel={() => {
                  setEditingInspection(null);
                  setCurrentModuleNumber("");
                  setCurrentModuleType(null);
                  setActiveTab("history");
                }}
                onModuleNumberChange={setCurrentModuleNumber}
                onModuleTypeChange={setCurrentModuleType}
              />
            </div>
          </div>
        ) : (
          /* History logs listing workspace */
          <HistoryList
            inspections={inspections}
            onSelectEdit={handleSelectEdit}
            onDelete={handleDeleteRecord}
            highlightId={highlightId}
          />
        )}
      </main>

      {/* Footer Info Statement - Only show on history layout */}
      {activeTab === "history" && (
        <footer className="bg-white border-t border-slate-200 py-5 text-center text-[10px] text-slate-400 tracking-wide shrink-0">
          <p className="font-bold uppercase text-slate-500 font-mono">
            BUNG'ECO S.A.S. • EDL Manager Pro
          </p>
          <p className="mt-1">
            Support technique et base de données hors-ligne synchronisée localement dans votre explorateur.
          </p>
        </footer>
      )}
    </div>
  );
}
