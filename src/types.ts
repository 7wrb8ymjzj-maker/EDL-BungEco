/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ModuleType =
  | "B6"
  | "B5"
  | "B4"
  | "S1"
  | "SD1"
  | "SS1"
  | "SD2"
  | "SDU"
  | "SSU"
  | "Sanitaire 6m"
  | "C8'"
  | "C10'"
  | "C20'"
  | "C20' OS"
  | "Cuve 2500L"
  | "Cuve 6300L"
  | "Escalier R+1"
  | "Escalier 4 marches"
  | "autre";

export interface MobilierOption {
  table: number;
  chaise: number;
  casier: number;
  bancs: number;
  armoire: number;
  caisson: number;
  frigo: number;
  microondes: number;
  autre: number;
}

export interface InspectionCharacteristics {
  // B6, B5, B4
  gamme?: "Flex" | "Top" | "none"; // B6 only
  climTrappe?: "Clim" | "Trappe" | "none";
  climTaille?: "56cm" | "45cm" | "60cm" | "autre";
  climTailleAutre?: string;
  trappeTaille?: "56cm" | "45cm" | "60cm";
  cuisineType?: "Bois" | "Métal" | "none";
  cuisine120?: boolean;
  sanitaireType?: "WC" | "Douche" | "none";
  wcCount?: number;
  presenceDouche?: boolean;
  doucheCount?: number;
  configurationType?: "Pignon" | "Façade" | "Conquet" | "none";
  eclairageType?: "neons" | "led" | "none";
  commandeEclairage?: "interrupteur" | "detecteur" | "none";
  mobilier?: MobilierOption;
  mobilierAutreTexte?: string;
  cles?: number;
  couleurRAL?: "RAL 7016" | "RAL 9002" | "none";

  // S1, SS1, SD1
  chauffeEau?: boolean;
  typeWC?: "WC anglais" | "WC turc" | "none";

  // Sanitaire 6m
  configSanitaire?: "SX" | "DX" | "autre";
  commVestiaire?: boolean;

  // C20'
  clefCanne?: boolean;

  // Containers (C20', C8', C10', C20' OS)
  couleurContainer?: "RAL 9010" | "autre";

  // Cuve 2500L, Cuve 6300L
  vidangee?: boolean;
}

export interface Inspection {
  id: string;
  moduleType: ModuleType;
  moduleNumber: string;
  date: string;
  characteristics: InspectionCharacteristics;
  sketchDataUrl?: string; // Stored drawing
  travauxPrevoir: string; // Dynamic but hand-modifiable
  observations: string;
  photos?: string[]; // Base64 data URLs for EDL photos
  createdAt: string;
  status?: "conforme" | "reserves" | "non_conforme";
  nature?: "livraison" | "reprise" | "constat";
  chantier?: string;
  nomTechnicien?: string;
  nomClient?: string;
  signatureTechnicien?: string;
  signatureClient?: string;
  isModuleNeuf?: boolean;
}

export type ControlAnswer = "conforme" | "non_conforme" | "sans_objet";

export interface ModuleControl {
  id: string;
  moduleNumber: string;
  moduleType: ModuleType;
  
  // Questionnaire - Module Conformity (Contrôle complet)
  q1_labels: ControlAnswer;
  q2_keys: ControlAnswer;
  q3_lifting: ControlAnswer;
  q4_screws: ControlAnswer;
  q5_joints: ControlAnswer;
  q6_closed: ControlAnswer;
  q7_plugged: ControlAnswer;
  q8_parecloses: ControlAnswer;
  q9_transport: ControlAnswer;
  q10_profiles: ControlAnswer;
  q11_protection: ControlAnswer;
  q12_general: ControlAnswer;

  // Questionnaire - Order Conformity (Contrôle complet)
  qc1_serial_match: ControlAnswer;
  qc2_plan_match: ControlAnswer;
  qc3_variants_present: ControlAnswer;
  qc4_furniture_qty: ControlAnswer;
  qc5_atelier_match: ControlAnswer;

  // Questionnaire - Contrôle Simplifié
  qs1_labels_keys_lifting?: ControlAnswer; // Étiquettes, clefs et plaques de levage sont conformes
  qs2_holes_parecloses_closed?: ControlAnswer; // Trous bouchés, pare-closes OK et menuiseries fermées ?
  qs3_state_transport?: ControlAnswer; // État du module satisfaisant et transport possible sans problème ?
  qs4_serial_match?: ControlAnswer; // Les numéros correspondent à ceux de la fiche atelier ?
  qs5_variants_furniture?: ControlAnswer; // Les variantes prévues et le mobilier sont conformes à la commande ?

  // Questionnaire - Containers (C8', C10', C20', C20' OS)
  qc_container_labels?: ControlAnswer; // Étiquette présente ?
  qc_container_joints?: ControlAnswer; // Joints de porte OK ?
  qc_container_clef_canne?: ControlAnswer; // Clef-Canne présente ?

  refParticulieres?: string;
  observations: string;
  photos: string[]; // base64 images
  status: "conforme" | "reserves";
  isModuleNeuf?: boolean;
}

export interface DeliveryControl {
  id: string;
  isDeliveryControl: true;
  client: string;
  cmdRef?: string;
  date: string;
  controller: string;
  chantier?: string;
  createdAt: string;
  modules: ModuleControl[];
  status: "termine" | "attente";
  controlMode?: "complet" | "simplifie";
}

export type HistoryRecord = Inspection | DeliveryControl;

export const INITIAL_MOBILIER: MobilierOption = {
  table: 0,
  chaise: 0,
  casier: 0,
  bancs: 0,
  armoire: 0,
  caisson: 0,
  frigo: 0,
  microondes: 0,
  autre: 0,
};

export const ALL_MODULE_TYPES: ModuleType[] = [
  "B6",
  "B5",
  "B4",
  "S1",
  "SD1",
  "SS1",
  "SD2",
  "SDU",
  "SSU",
  "Sanitaire 6m",
  "C8'",
  "C10'",
  "C20'",
  "C20' OS",
  "Cuve 2500L",
  "Cuve 6300L",
  "Escalier R+1",
  "Escalier 4 marches",
  "autre",
];



