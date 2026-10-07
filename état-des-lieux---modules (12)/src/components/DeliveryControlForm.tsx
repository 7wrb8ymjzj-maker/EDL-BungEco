/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Upload, 
  ArrowLeft, 
  Save, 
  ClipboardCheck, 
  Package, 
  AlertCircle,
  Mail
} from "lucide-react";
import { DeliveryControl, ModuleControl, ModuleType, ALL_MODULE_TYPES } from "../types";
import { compressImage } from "../utils/compressor";
import { getModuleQuestions, getOrderQuestions } from "../utils";

// Complete Control: Section I (Qualité)
const MODULE_QUESTIONS = [
  { id: "q1_labels", text: "Toutes les étiquettes sont présentes ?" },
  { id: "q2_keys", text: "Les 2 clés sont sur le barillet ?" },
  { id: "q3_lifting", text: "Les 4 plaques de levage sont présentes ?" },
  { id: "q4_screws", text: "Toutes les vis sont présentes ?" },
  { id: "q5_joints", text: "Les joints intérieurs sont corrects ?" },
  { id: "q6_closed", text: "Les fenêtres sont fermées et les portes verrouillées ?" },
  { id: "q7_plugged", text: "Les trous sont bouchés ?" },
  { id: "q8_parecloses", text: "Les parecloses sont-elles toutes présentes sur les menuiseries ?" },
  { id: "q9_transport", text: "Le module peut être transporté sans problème ?" },
  { id: "q10_profiles", text: "Tous les profils d'assemblage sont présents ?" },
  { id: "q11_protection", text: "Filet de protection mis en place ?" },
  { id: "q12_general", text: "État général du module satisfaisant ?" },
] as const;

// Complete Control: Section II (Commande)
const ORDER_QUESTIONS = [
  { id: "qc1_serial_match", text: "Les numéros correspondent à ceux de la fiche atelier ?" },
  { id: "qc2_plan_match", text: "Les modules sont conformes au plan ?" },
  { id: "qc3_variants_present", text: "Les variantes prévues sont présentes ? (clim, cuisinette, etc.)" },
  { id: "qc4_furniture_qty", text: "Le quantitatif du mobilier est respecté ?" },
  { id: "qc5_atelier_match", text: "Le module est conforme à la fiche atelier ?" },
] as const;

// Simplified Control: 5 questions
const SIMPLIFIED_QUESTIONS = [
  { id: "qs1_labels_keys_lifting", text: "Étiquettes, clefs et plaques de levage sont conformes" },
  { id: "qs2_holes_parecloses_closed", text: "Trous bouchés, pare-closes OK et menuiseries fermées ?" },
  { id: "qs3_state_transport", text: "État du module satisfaisant et transport possible sans problème ?" },
  { id: "qs4_serial_match", text: "Les numéros correspondent à ceux de la fiche atelier ?" },
  { id: "qs5_variants_furniture", text: "Les variantes prévues et le mobilier sont conformes à la commande ?" },
] as const;

// Containers: 3 questions only
const CONTAINER_QUESTIONS = [
  { id: "qc_container_labels", text: "Étiquette présente ?" },
  { id: "qc_container_joints", text: "Joints de porte OK ?" },
  { id: "qc_container_clef_canne", text: "Clef-Canne présente ?" },
] as const;

export function isContainerModule(type: ModuleType): boolean {
  return type === "C8'" || type === "C10'" || type === "C20'" || type === "C20' OS" || (type as string) === "C20'OS";
}

interface DeliveryControlFormProps {
  initialControl: DeliveryControl | null;
  onSave: (control: DeliveryControl) => void;
  onSaveAndShare?: (control: DeliveryControl) => void;
  onCancel: () => void;
  isSaving?: boolean;
  isSharing?: boolean;
}

function createBlankModule(num: string = ""): ModuleControl {
  return {
    id: `mod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    moduleNumber: num,
    moduleType: "B6",
    
    // Complete questions defaults
    q1_labels: "sans_objet",
    q2_keys: "sans_objet",
    q3_lifting: "sans_objet",
    q4_screws: "sans_objet",
    q5_joints: "sans_objet",
    q6_closed: "sans_objet",
    q7_plugged: "sans_objet",
    q8_parecloses: "sans_objet",
    q9_transport: "sans_objet",
    q10_profiles: "sans_objet",
    q11_protection: "sans_objet",
    q12_general: "sans_objet",
    q_chauffe_eau_vidange: "sans_objet",

    qc1_serial_match: "sans_objet",
    qc2_plan_match: "sans_objet",
    qc3_variants_present: "sans_objet",
    qc4_furniture_qty: "sans_objet",
    qc5_atelier_match: "sans_objet",

    // Simplified questions defaults
    qs1_labels_keys_lifting: "sans_objet",
    qs2_holes_parecloses_closed: "sans_objet",
    qs3_state_transport: "sans_objet",
    qs4_serial_match: "sans_objet",
    qs5_variants_furniture: "sans_objet",

    // Container questions defaults
    qc_container_labels: "sans_objet",
    qc_container_joints: "sans_objet",
    qc_container_clef_canne: "sans_objet",

    observations: "",
    photos: [],
    status: "conforme",
    isModuleNeuf: false,
  };
}

export default function DeliveryControlForm({
  initialControl,
  onSave,
  onSaveAndShare,
  onCancel,
  isSaving = false,
  isSharing = false,
}: DeliveryControlFormProps) {
  // General details state (cmdRef removed per request)
  const [client, setClient] = useState("");
  const [date, setDate] = useState("");
  const [controller, setController] = useState("");
  const [chantier, setChantier] = useState("");
  const [controlMode, setControlMode] = useState<"complet" | "simplifie">("complet");

  // List of module controls
  const [modules, setModules] = useState<ModuleControl[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const shouldScrollToTopRef = useRef(false);

  const performScrollToTop = () => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      document.documentElement.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      document.body.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      const topElem = document.getElementById("delivery-control-form-top");
      if (topElem) {
        topElem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  useEffect(() => {
    if (shouldScrollToTopRef.current) {
      shouldScrollToTopRef.current = false;
      const timer = setTimeout(() => {
        performScrollToTop();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeModuleId]);

  useEffect(() => {
    if (initialControl) {
      setClient(initialControl.client || "");
      setDate(initialControl.date || "");
      setController(initialControl.controller || "");
      setChantier(initialControl.chantier || "");
      setControlMode(initialControl.controlMode || "complet");
      setModules(initialControl.modules || []);
      if (initialControl.modules && initialControl.modules.length > 0) {
        setActiveModuleId(initialControl.modules[0].id);
      }
    } else {
      // Create defaults
      const today = new Date().toISOString().split("T")[0];
      setClient("");
      setDate(today);
      setController("");
      setChantier("");
      setControlMode("complet");
      
      const first = createBlankModule("");
      setModules([first]);
      setActiveModuleId(first.id);
    }
  }, [initialControl]);

  // Helpers to get and set active module
  const activeModuleIndex = modules.findIndex((m) => m.id === activeModuleId);
  const activeModule = activeModuleIndex !== -1 ? modules[activeModuleIndex] : null;

  const updateActiveModule = (updatedFields: Partial<ModuleControl>) => {
    if (activeModuleIndex === -1) return;
    
    setModules((prev) => {
      const copy = [...prev];
      const merged = { ...copy[activeModuleIndex], ...updatedFields };
      
      // Calculate auto status: has reservations if any "non_conforme" in active scope
      let isConforme = true;
      if (isContainerModule(merged.moduleType)) {
        const containerAnswers = [
          merged.qc_container_labels,
          merged.qc_container_joints,
          merged.qc_container_clef_canne,
        ];
        if (containerAnswers.some((ans) => ans === "non_conforme")) {
          isConforme = false;
        }
      } else if (controlMode === "simplifie") {
        const simplifiedAnswers = [
          merged.qs1_labels_keys_lifting,
          merged.qs2_holes_parecloses_closed,
          merged.qs3_state_transport,
          merged.qs4_serial_match,
          merged.qs5_variants_furniture,
        ];
        if (simplifiedAnswers.some((ans) => ans === "non_conforme")) {
          isConforme = false;
        }
      } else {
        const activeModQ = getModuleQuestions(merged.moduleType);
        const activeOrdQ = getOrderQuestions(merged.moduleType);
        const questionsToCheck = [...activeModQ, ...activeOrdQ];
        if (questionsToCheck.some((q) => (merged as any)[q.id] === "non_conforme")) {
          isConforme = false;
        }
      }
      
      merged.status = isConforme ? "conforme" : "reserves";
      copy[activeModuleIndex] = merged;
      return copy;
    });
  };

  const handleAddNewModule = () => {
    const newMod = createBlankModule("");
    shouldScrollToTopRef.current = true;
    setModules((prev) => [...prev, newMod]);
    setActiveModuleId(newMod.id);
    performScrollToTop();
  };

  const handleDeleteModule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (modules.length === 1) {
      alert("Une commande doit comporter au moins un module à contrôler.");
      return;
    }
    if (window.confirm("Voulez-vous supprimer ce module de la commande ?")) {
      const filtered = modules.filter((m) => m.id !== id);
      setModules(filtered);
      if (activeModuleId === id) {
        setActiveModuleId(filtered[0].id);
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeModule) return;
    const fileList = Array.from(e.target.files) as File[];
    
    setIsCompressingPhotos(true);
    const compressedList: string[] = [];
    
    for (const file of fileList) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const compressedBase64 = await compressImage(file, 1600, 0.78);
        compressedList.push(compressedBase64);
      } catch (err) {
        console.error("Compression error:", err);
      }
    }
    
    if (compressedList.length > 0) {
      const updatedPhotos = [...activeModule.photos, ...compressedList];
      updateActiveModule({ photos: updatedPhotos });
    }
    setIsCompressingPhotos(false);
  };

  const handleRemovePhoto = (photoIndex: number) => {
    if (!activeModule) return;
    const filtered = activeModule.photos.filter((_, idx) => idx !== photoIndex);
    updateActiveModule({ photos: filtered });
  };

  const validateForm = (): boolean => {
    if (!client.trim()) {
      alert("Veuillez renseigner le nom du Client.");
      return false;
    }
    if (!controller.trim()) {
      alert("Veuillez renseigner le nom du Contrôleur.");
      return false;
    }

    const invalidModule = modules.find((m) => !m.moduleNumber.trim());
    if (invalidModule) {
      alert(`Veuillez renseigner la référence pour tous les modules.`);
      setActiveModuleId(invalidModule.id);
      return false;
    }
    return true;
  };

  const buildPayload = (status: "termine" | "attente"): DeliveryControl => {
    return {
      id: initialControl?.id || `dlc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isDeliveryControl: true,
      client: client.trim(),
      date,
      controller: controller.trim(),
      chantier: chantier.trim() || undefined,
      createdAt: initialControl?.createdAt || new Date().toISOString(),
      modules,
      status,
      controlMode,
    };
  };

  const handleActionComplete = (status: "termine" | "attente") => {
    if (!validateForm()) return;
    const payload = buildPayload(status);
    onSave(payload);
  };

  const handleSaveAndShareAction = () => {
    if (!validateForm()) return;
    const payload = buildPayload("termine");
    if (onSaveAndShare) {
      onSaveAndShare(payload);
    } else {
      onSave(payload);
    }
  };

  const handleNextModuleAction = () => {
    if (!activeModule) return;
    if (!activeModule.moduleNumber.trim()) {
      alert("Saisissez d'abord la référence du module actuel.");
      return;
    }

    const currentNum = activeModule.moduleNumber.toUpperCase();
    const newMod = createBlankModule("");
    shouldScrollToTopRef.current = true;
    setModules((prev) => [...prev, newMod]);
    setActiveModuleId(newMod.id);
    alert(`Module "${currentNum}" enregistré ! Saisie du prochain module démarrée.`);
    performScrollToTop();
  };

  const isContainer = activeModule ? isContainerModule(activeModule.moduleType) : false;

  return (
    <div id="delivery-control-form-top" className="w-full flex flex-col space-y-6 font-sans">
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 transition-all cursor-pointer"
            title="Retour sans enregistrer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-black uppercase text-slate-800 tracking-wider">
              {initialControl ? "📝 MODIFICATION CONTRÔLE AVANT LIVRAISON" : "📦 NOUVEAU CONTRÔLE AVANT LIVRAISON"}
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-tight font-extrabold uppercase">
              Outil d'expédition multi-modules • BUNG'ECO Qualité
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSaving || isSharing}
            onClick={() => handleActionComplete("attente")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-150 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Save size={13} />
            Mettre en attente
          </button>
          <button
            type="button"
            disabled={isSaving || isSharing}
            onClick={() => handleActionComplete("termine")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <ClipboardCheck size={13} />
            Terminer la commande
          </button>
          <button
            type="button"
            disabled={isSaving || isSharing}
            onClick={handleSaveAndShareAction}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-bungeco-orange hover:bg-[#c25e0b] disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Mail size={13} />
            {isSharing ? "Envoi..." : "Enregistrer et envoyer par mail"}
          </button>
        </div>
      </div>

      {/* Grid: 1 General Info | 2 Multi-Module Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* General Info Form Section */}
        <div className="lg:col-span-4 space-y-5">
          {/* Section 1: General Client Details & Mode de Contrôle */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <span className="w-5.5 h-5.5 rounded bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</span>
              📦 COMMANDE CLIENT
            </h3>

            {/* Mode de contrôle : Contrôle complet vs Contrôle simplifié */}
            <div className="space-y-1.5 pb-2 border-b border-slate-100 text-left">
              <span className="block text-[10px] uppercase font-black text-slate-500 tracking-wider">
                Mode de contrôle
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setControlMode("complet")}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    controlMode === "complet"
                      ? "bg-bungeco-orange border-bungeco-orange text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Contrôle complet
                </button>
                <button
                  type="button"
                  onClick={() => setControlMode("simplifie")}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    controlMode === "simplifie"
                      ? "bg-bungeco-orange border-bungeco-orange text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Contrôle simplifié
                </button>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Client <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : ABC BTP"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white transition-all text-slate-800"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Contrôleur responsable <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nom du technicien"
                  value={controller}
                  onChange={(e) => setController(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white transition-all text-slate-850"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Chantier / Destination (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex : Chantier Grue C, Paris"
                  value={chantier}
                  onChange={(e) => setChantier(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white transition-all text-slate-850"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                  Date du contrôle
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-bungeco-orange/30 focus:border-bungeco-orange focus:bg-white transition-all text-slate-850"
                />
              </div>
            </div>
          </div>

          {/* Section 2: List of modules in this order */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <span className="w-5.5 h-5.5 rounded bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                MODULES DE CETTE COMMANDE
              </h3>
              <span className="px-2 py-0.5 bg-orange-100/70 border border-orange-200 rounded text-bungeco-orange font-mono font-bold text-[10px]">
                {modules.length} modules
              </span>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {modules.map((mod, index) => {
                const isActive = mod.id === activeModuleId;
                const statusColor = mod.status === "conforme" ? "text-emerald-500 bg-emerald-500" : "text-amber-500 bg-amber-500";
                
                return (
                  <div
                    key={mod.id}
                    onClick={() => setActiveModuleId(mod.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none text-left ${
                      isActive 
                        ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]" 
                        : "bg-slate-50 hover:bg-slate-100/70 text-slate-800 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                      <div>
                        <div className={`text-xs font-black uppercase font-mono flex items-center gap-1.5 ${isActive ? "text-white" : "text-slate-800"}`}>
                          <span>{mod.moduleNumber ? `Module ${mod.moduleNumber}` : `Module #${index + 1} (Sans réf)`}</span>
                          {mod.isModuleNeuf && (
                            <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-black rounded tracking-tight">
                              NEUF
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] font-semibold ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                          Type: {mod.moduleType} • {mod.status === "conforme" ? "🟢 Conforme" : "🟠 Avec réserves"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteModule(mod.id, e)}
                      className={`p-1.5 rounded-lg border hover:scale-105 transition-all text-red-500 ${
                        isActive 
                          ? "border-white/10 hover:bg-white/10" 
                          : "border-slate-200 hover:bg-slate-150"
                      }`}
                      title="Retirer de la liste"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddNewModule}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-bungeco-orange hover:bg-orange-50/30 text-slate-600 hover:text-bungeco-orange rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} />
              Ajouter un autre module à cette commande
            </button>
          </div>
        </div>

        {/* Multi-Module Detail Panel (span 8 on large screens) */}
        <div className="lg:col-span-8">
          {activeModule ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              
              {/* Module Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Module en cours d'inspection
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="N° DU MODULE"
                        value={activeModule.moduleNumber}
                        onChange={(e) => updateActiveModule({ moduleNumber: e.target.value.toUpperCase() })}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-black font-mono tracking-wider text-slate-900 w-44 outline-none focus:ring-2 focus:ring-bungeco-orange"
                      />
                      <select
                        value={activeModule.moduleType}
                        onChange={(e) => updateActiveModule({ moduleType: e.target.value as ModuleType })}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-bungeco-orange cursor-pointer"
                      >
                        {ALL_MODULE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>

                      {/* Case Module Neuf pour ce module */}
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50/70 hover:bg-orange-100/70 border border-bungeco-orange/30 rounded-lg cursor-pointer transition-all select-none shrink-0 h-[34px]">
                        <input
                          type="checkbox"
                          checked={!!activeModule.isModuleNeuf}
                          onChange={(e) => updateActiveModule({ isModuleNeuf: e.target.checked })}
                          className="w-4 h-4 text-bungeco-orange rounded border-slate-300 focus:ring-bungeco-orange accent-[#D96B00] cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800 tracking-tight whitespace-nowrap">
                          Module Neuf
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Verdict Badge */}
                <div>
                  {activeModule.status === "conforme" ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-500 text-white font-black text-[11px] rounded-xl shadow-xs uppercase tracking-wider">
                      <CheckCircle2 size={13} />
                      🟢 MODULE CONFORME
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 text-white font-black text-[11px] rounded-xl shadow-xs uppercase tracking-wider">
                      <AlertTriangle size={13} />
                      🟠 MODULE AVEC RÉSERVES
                    </div>
                  )}
                </div>
              </div>

              {/* QUESTIONNAIRES SECTION */}
              {isContainer ? (
                /* CONTAINER CHECKLIST: UNIQUEMENT LES 3 QUESTIONS SPÉCIFIQUES */
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10.5px] font-extrabold shrink-0">C</span>
                      CONTRÔLE DU CONTAINER ({activeModule.moduleType})
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">3 contrôles spécifiques</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {CONTAINER_QUESTIONS.map((q, idx) => {
                      const currentAns = activeModule[q.id as keyof ModuleControl];
                      return (
                        <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2.5 flex flex-col justify-between">
                          <p className="text-[11px] font-bold text-slate-800 leading-tight">
                            {idx + 1}. {q.text}
                          </p>
                          
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateActiveModule({ [q.id]: "conforme" })}
                              className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                currentAns === "conforme"
                                  ? "bg-emerald-600 text-white shadow-xs font-black"
                                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-855 hover:bg-slate-100/50"
                              }`}
                            >
                              Conforme
                            </button>
                            <button
                              type="button"
                              onClick={() => updateActiveModule({ [q.id]: "non_conforme" })}
                              className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                currentAns === "non_conforme"
                                  ? "bg-amber-500 text-white shadow-xs font-black"
                                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-855 hover:bg-slate-100/50"
                              }`}
                            >
                              Non Conf
                            </button>
                            <button
                              type="button"
                              onClick={() => updateActiveModule({ [q.id]: "sans_objet" })}
                              className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                currentAns === "sans_objet"
                                  ? "bg-slate-500 text-white shadow-xs font-black"
                                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                              }`}
                            >
                              Sans Objet
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : controlMode === "simplifie" ? (
                /* CONTRÔLE SIMPLIFIÉ: UNIQUEMENT LES 5 QUESTIONS SPÉCIFIÉES */
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10.5px] font-extrabold shrink-0">S</span>
                      POINTS DE CONTRÔLE SIMPLIFIÉ
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">5 vérifications essentielles</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SIMPLIFIED_QUESTIONS.map((q, idx) => {
                      const currentAns = activeModule[q.id as keyof ModuleControl];
                      return (
                        <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2.5">
                          <p className="text-[11px] font-bold text-slate-800 leading-tight">
                            {idx + 1}. {q.text}
                          </p>
                          
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateActiveModule({ [q.id]: "conforme" })}
                              className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                currentAns === "conforme"
                                  ? "bg-emerald-600 text-white shadow-xs font-black"
                                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-855 hover:bg-slate-100/50"
                              }`}
                            >
                              Conforme
                            </button>
                            <button
                              type="button"
                              onClick={() => updateActiveModule({ [q.id]: "non_conforme" })}
                              className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                currentAns === "non_conforme"
                                  ? "bg-amber-500 text-white shadow-xs font-black"
                                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-855 hover:bg-slate-100/50"
                              }`}
                            >
                              Non Conf
                            </button>
                            <button
                              type="button"
                              onClick={() => updateActiveModule({ [q.id]: "sans_objet" })}
                              className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                currentAns === "sans_objet"
                                  ? "bg-slate-500 text-white shadow-xs font-black"
                                  : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                              }`}
                            >
                              Sans Objet
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* CONTRÔLE COMPLET: CONFORMITÉ DU MODULE + CONFORMITÉ COMMANDE */
                (() => {
                  const currentModQuestions = getModuleQuestions(activeModule.moduleType);
                  const currentOrdQuestions = getOrderQuestions(activeModule.moduleType);
                  return (
                    <div className="space-y-6">
                      {/* 1. Questionnaire Module Conformity (uniquement si des questions existent) */}
                      {currentModQuestions.length > 0 && (
                        <div className="space-y-4 text-left">
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10.5px] font-extrabold shrink-0">I</span>
                            CONFORMITÉ DU MODULE (QUALITÉ)
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentModQuestions.map((q, idx) => {
                              const currentAns = activeModule[q.id as keyof ModuleControl];
                              return (
                                <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2.5">
                                  <p className="text-[11px] font-bold text-slate-800 leading-tight">
                                    {idx + 1}. {q.text}
                                  </p>
                                  
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateActiveModule({ [q.id]: "conforme" })}
                                      className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                        currentAns === "conforme"
                                          ? "bg-emerald-600 text-white shadow-xs font-black"
                                          : "bg-white border border-slate-200 text-slate-500 hover:text-slate-855 hover:bg-slate-100/50"
                                      }`}
                                    >
                                      Conforme
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateActiveModule({ [q.id]: "non_conforme" })}
                                      className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                        currentAns === "non_conforme"
                                          ? "bg-amber-500 text-white shadow-xs font-black"
                                          : "bg-white border border-slate-200 text-slate-500 hover:text-slate-855 hover:bg-slate-100/50"
                                      }`}
                                    >
                                      Non Conf
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateActiveModule({ [q.id]: "sans_objet" })}
                                      className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                        currentAns === "sans_objet"
                                          ? "bg-slate-500 text-white shadow-xs font-black"
                                          : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                                      }`}
                                    >
                                      Sans Objet
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Questionnaire Order Conformity */}
                      <div className="space-y-4 text-left">
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10.5px] font-extrabold shrink-0">
                            {currentModQuestions.length > 0 ? "II" : "I"}
                          </span>
                          CONFORMITÉ À LA COMMANDE CLIENT
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentOrdQuestions.map((q, idx) => {
                            const currentAns = activeModule[q.id as keyof ModuleControl];
                            return (
                              <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2.5">
                                <p className="text-[11px] font-bold text-slate-800 leading-tight">
                                  {idx + 1}. {q.text}
                                </p>
                                
                                <div className="grid grid-cols-3 gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateActiveModule({ [q.id]: "conforme" })}
                                    className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                      currentAns === "conforme"
                                        ? "bg-emerald-600 text-white shadow-xs font-black"
                                        : "bg-white border border-slate-200 text-slate-500 hover:text-slate-855 hover:bg-slate-100/50"
                                    }`}
                                  >
                                    Conforme
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateActiveModule({ [q.id]: "non_conforme" })}
                                    className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                      currentAns === "non_conforme"
                                        ? "bg-amber-500 text-white shadow-xs font-black"
                                        : "bg-white border border-slate-200 text-slate-500 hover:text-slate-855 hover:bg-slate-100/50"
                                    }`}
                                  >
                                    Non Conf
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateActiveModule({ [q.id]: "sans_objet" })}
                                    className={`py-2 px-1 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                      currentAns === "sans_objet"
                                        ? "bg-slate-500 text-white shadow-xs font-black"
                                        : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                                    }`}
                                  >
                                    Sans Objet
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Observations du contrôleur (RÉFÉRENCES PARTICULIÈRES RETIRÉES PER USER SPEC) */}
              <div className="text-left">
                <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-600 tracking-wider">
                    📝 OBSERVATIONS DU CONTRÔLEUR
                  </label>
                  <p className="text-[9.5px] text-slate-400 font-bold font-mono">
                    Remarques, anomalies constatées, alertes sur ce module...
                  </p>
                  <textarea
                    placeholder="Saisissez vos observations..."
                    value={activeModule.observations}
                    onChange={(e) => updateActiveModule({ observations: e.target.value })}
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-bungeco-orange"
                  />
                </div>
              </div>

              {/* Photo Manager Section */}
              <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl space-y-4 text-left">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    📷 PHOTOGRAPHIES DU CONTRÔLE SUR CE MODULE
                  </h4>
                  <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 rounded-md">
                    {activeModule.photos.length} photos
                  </span>
                </div>

                {/* Grid of Photo Thumbnails */}
                {activeModule.photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeModule.photos.map((ph, phIdx) => (
                      <div key={phIdx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-square shadow-sm">
                        <img 
                          src={ph} 
                          alt={`Aperçu ${phIdx + 1}`} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(phIdx)}
                          className="absolute top-1 right-1 bg-red-650 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition-all cursor-pointer"
                          title="Supprimer cette photo"
                        >
                          <Trash2 size={12} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload File Input controls */}
                <div className="flex flex-wrap gap-2.5 items-center">
                  <label className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-bungeco-orange/55 hover:border-bungeco-orange hover:bg-orange-50/20 text-bungeco-orange rounded-xl text-xs font-black uppercase cursor-pointer transition-all select-none text-center">
                    <Upload size={14} />
                    Importer photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <label className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-slate-350 hover:border-slate-500 hover:bg-slate-100/50 text-slate-600 rounded-xl text-xs font-black uppercase cursor-pointer transition-all select-none text-center">
                    <Camera size={14} />
                    Prendre photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {isCompressingPhotos && (
                  <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-bungeco-orange font-bold font-mono">
                    <span className="w-2.5 h-2.5 bg-bungeco-orange rounded-full animate-ping"></span>
                    Optimisation et compression automatique en cours...
                  </div>
                )}
              </div>

              {/* FIN DE CONTRÔLE ACTION PANEL */}
              <div className="pt-6 border-t border-slate-200 mt-4">
                <div className="flex flex-col gap-3">
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest text-center select-none mb-1">
                    🎯 ACTIONS DE FIN DE CONTRÔLE
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* BUTTON 1: Add/Control another module */}
                    <button
                      type="button"
                      onClick={handleNextModuleAction}
                      className="inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border-2 border-bungeco-orange/30 hover:border-bungeco-orange bg-orange-50/20 text-bungeco-orange font-black text-xs uppercase tracking-wider transition-all scale-[0.99] hover:scale-[1.01] active:scale-[0.98] cursor-pointer text-center"
                    >
                      <Plus size={14} />
                      Autre module
                    </button>

                    {/* BUTTON 2: Leave draft pending */}
                    <button
                      type="button"
                      disabled={isSaving || isSharing}
                      onClick={() => handleActionComplete("attente")}
                      className="inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-150 disabled:opacity-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all scale-[0.99] hover:scale-[1.01] active:scale-[0.98] cursor-pointer text-center"
                    >
                      <AlertCircle size={14} />
                      En attente
                    </button>

                    {/* BUTTON 3: Close control */}
                    <button
                      type="button"
                      disabled={isSaving || isSharing}
                      onClick={() => handleActionComplete("termine")}
                      className="inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all scale-[0.99] hover:scale-[1.01] active:scale-[0.98] cursor-pointer text-center"
                    >
                      <CheckCircle2 size={14} />
                      Terminer
                    </button>

                    {/* BUTTON 4: Enregistrer et envoyer par mail */}
                    <button
                      type="button"
                      disabled={isSaving || isSharing}
                      onClick={handleSaveAndShareAction}
                      className="inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-bungeco-orange hover:bg-[#c25e0b] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md scale-[0.99] hover:scale-[1.01] active:scale-[0.98] cursor-pointer text-center"
                    >
                      <Mail size={14} />
                      {isSharing ? "Envoi..." : "Enregistrer & Mail"}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-550 space-y-3">
              <Package size={42} className="mx-auto text-slate-350" />
              <p className="text-sm font-bold">Aucun module n'a été sélectionné.</p>
              <button
                type="button"
                onClick={handleAddNewModule}
                className="px-4 py-2 bg-bungeco-orange text-white text-xs font-black rounded-lg transition-all"
              >
                Créer un nouveau module
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
