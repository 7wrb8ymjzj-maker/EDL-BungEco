/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inspection, ModuleType, InspectionCharacteristics, DeliveryControl, ModuleControl } from "./types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getSanitaireImagePath } from "./components/SanitaireReferenceImage";

/**
 * Calculates recommended repairs / works based on selected options and module type.
 */
export function calculateAutomaticTravaux(
  type: ModuleType,
  chars: InspectionCharacteristics
): string {
  const list: string[] = [];

  // Keys rules
  // "Si 2 clefs sont présentes lorsque nous le demandons, rien ne se passe. Si 1 clef est présente, noter "double des clefs" dans travaux à prévoir. Si 0 clef présente, noter "Barillet" dans travaux à prévoir."
  const hasKeyField =
    type === "B6" ||
    type === "B5" ||
    type === "B4" ||
    type === "SD2" ||
    type === "SDU" ||
    type === "SSU" ||
    type === "Sanitaire 6m";

  if (hasKeyField && chars.cles !== undefined) {
    if (chars.cles === 1) {
      list.push("- Double des clefs à prévoir");
    } else if (chars.cles === 0) {
      list.push("- Remplacement du barillet de serrure à prévoir");
    }
  }

  // Cuves rules
  if ((type === "Cuve 2500L" || type === "Cuve 6300L") && chars.vidangee === false) {
    list.push("- Vidange de la cuve obligatoire (cuve pleine)");
  }

  // Container clef-canne rules
  if (type === "C20'" && chars.clefCanne === false) {
    list.push("- Fournir une clef-canne manquante");
  }

  return list.join("\n");
}

/**
 * Generates an elegant PDF document from an inspection report and triggers a direct download.
 */
export async function buildInspectionPDFDoc(
  inspection: Inspection,
  onProgress?: (msg: string) => void
): Promise<{ pdf: jsPDF; fileName: string } | null> {
  try {
    onProgress?.("Préparation de la mise en page...");

    // Create the master container for pages
    const pagesContainer = document.createElement("div");
    pagesContainer.style.position = "absolute";
    pagesContainer.style.left = "-9999px";
    pagesContainer.style.top = "-9999px";
    pagesContainer.style.width = "794px";
    pagesContainer.style.backgroundColor = "#94a3b8"; // elegant slate backup separating visual blocks

    // Formatted date string
    const formattedDate = new Date(inspection.date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const currentDateTimeStr = new Date().toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(",", " à");

    // Subcontract characteristics info HTML
    let charsHtml = "";
    const c = inspection.characteristics;

    if (
      inspection.moduleType === "B6" ||
      inspection.moduleType === "B5" ||
      inspection.moduleType === "B4"
    ) {
      let climTrappeText = "Non configuré";
      if (c.climTrappe === "Clim") {
        const sizeStr = c.climTaille === "autre" ? (c.climTailleAutre || "Autre") : (c.climTaille || "");
        climTrappeText = `Climatiseur (${sizeStr})`;
      } else if (c.climTrappe === "Trappe") {
        climTrappeText = `Trappe (${c.trappeTaille || ""})`;
      }

      let sanitaireText = "Aucun";
      const sanParts: string[] = [];
      if (c.wcCount && c.wcCount > 0) {
        sanParts.push(`${c.wcCount} WC`);
      }
      if (c.doucheCount && c.doucheCount > 0) {
        sanParts.push(`${c.doucheCount} Douche(s)`);
      } else if (c.presenceDouche) {
        sanParts.push(`Douche`);
      }
      if (sanParts.length > 0) {
        sanitaireText = sanParts.join(" / ");
      }

      let eclairageText = "N/A";
      if (c.eclairageType && c.eclairageType !== "none") {
        const typeLabel = c.eclairageType === "neons" ? "Néons" : "Dalles LED";
        const controlLabel = c.commandeEclairage === "interrupteur" 
          ? "Interrupteur" 
          : c.commandeEclairage === "detecteur" 
            ? "Détecteur" 
            : "";
        eclairageText = `${typeLabel}${controlLabel ? ` (${controlLabel})` : ""}`;
      }

      charsHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.5; color: #2F2F2F;">
          <tr>
            <td style="padding: 4px 6px; width: 50%;"><strong>Gamme :</strong> ${c.gamme || "N/A"}</td>
            <td style="padding: 4px 6px; width: 50%;"><strong>Implantation :</strong> ${c.configurationType || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px;"><strong>Confort thermique :</strong> ${climTrappeText}</td>
            <td style="padding: 4px 6px;"><strong>Éclairage :</strong> ${eclairageText}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px;" colspan="2"><strong>Commande d'éclairage :</strong> ${c.commandeEclairage === "detecteur" ? "Détecteur de présence" : "Interrupteur"}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px;"><strong>Cuisine :</strong> ${
              c.cuisineType && c.cuisineType !== "none"
                ? `Cuisine ${c.cuisineType === "Bois" ? "Bois" : "Métal"} (${c.cuisine120 ? "120cm" : "80cm"})`
                : "Aucune"
            }</td>
            <td style="padding: 4px 6px;"><strong>Équipement Sanitaire :</strong> ${sanitaireText}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px;"><strong>Clés présentes :</strong> ${c.cles ?? 0}</td>
            <td style="padding: 4px 6px;"><strong>Couleur ext. :</strong> ${
              c.couleurRAL || "Standard / Non choisie"
            }</td>
          </tr>
        </table>
      `;
    } else if (inspection.moduleType === "S1" || inspection.moduleType === "SS1") {
      charsHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.5; color: #2F2F2F;">
          <tr>
            <td style="padding: 4px 6px; width: 50%;"><strong>Chauffe-eau :</strong> ${
              c.chauffeEau ? "Présence (Oui)" : "Non"
            }</td>
            <td style="padding: 4px 6px; width: 50%;"><strong>Type WC :</strong> ${c.typeWC || "Aucun"}</td>
          </tr>
        </table>
      `;
    } else if (inspection.moduleType === "SD1") {
      charsHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.5; color: #2F2F2F;">
          <tr>
            <td style="padding: 4px 6px;"><strong>Type WC :</strong> ${c.typeWC || "Aucun"}</td>
          </tr>
        </table>
      `;
    } else if (
      inspection.moduleType === "SD2" ||
      inspection.moduleType === "SDU" ||
      inspection.moduleType === "SSU"
    ) {
      charsHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.5; color: #2F2F2F;">
          <tr>
            <td style="padding: 4px 6px;"><strong>Clés présentes :</strong> ${c.cles ?? 0}</td>
          </tr>
        </table>
      `;
    } else if (inspection.moduleType === "Sanitaire 6m") {
      charsHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.5; color: #2F2F2F;">
          <tr>
            <td style="padding: 4px 6px; width: 50%;"><strong>Configuration :</strong> ${
              c.configSanitaire || "N/A"
            }</td>
            <td style="padding: 4px 6px; width: 50%;"><strong>Comm. Vestiaires :</strong> ${
              c.commVestiaire ? "Prévu (Oui)" : "Non"
            }</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px;" colspan="2"><strong>Clés présentes :</strong> ${c.cles ?? 0}</td>
          </tr>
        </table>
      `;
    } else if (inspection.moduleType === "C20'") {
      charsHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.5; color: #2F2F2F;">
          <tr>
            <td style="padding: 4px 6px; width: 50%;"><strong>Couleur :</strong> ${
              c.couleurContainer || "N/A"
            }</td>
            <td style="padding: 4px 6px; width: 50%;"><strong>Clef-Canne :</strong> ${
              c.clefCanne ? "Oui" : "Non"
            }</td>
          </tr>
        </table>
      `;
    } else if (
      inspection.moduleType === "C8'" ||
      inspection.moduleType === "C10'" ||
      inspection.moduleType === "C20' OS"
    ) {
      charsHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.5; color: #2F2F2F;">
          <tr>
            <td style="padding: 4px 6px;"><strong>Couleur :</strong> ${
              c.couleurContainer || "N/A"
            }</td>
          </tr>
        </table>
      `;
    } else if (
      inspection.moduleType === "Cuve 2500L" ||
      inspection.moduleType === "Cuve 6300L"
    ) {
      charsHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.5; color: #2F2F2F;">
          <tr>
            <td style="padding: 4px 6px;"><strong>État de vidange :</strong> ${
              c.vidangee ? "Vidangée (Vide)" : "Non vidangée (Pleine)"
            }</td>
          </tr>
        </table>
      `;
    } else {
      charsHtml = `<div style="color: #64748b; font-style: italic; padding: 4px 6px; font-size: 11px;">Aucune caractéristique optionnelle spécifique disponible pour ce matériel.</div>`;
    }

    // Mobilier quantities table if present
    let furnitureHtml = "";
    if (
      c.mobilier &&
      Object.values(c.mobilier).some((qty) => qty > 0) &&
      ["B6", "B5", "B4"].includes(inspection.moduleType)
    ) {
      furnitureHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; line-height: 1.4; color: #2F2F2F;">
          <thead>
            <tr style="border-bottom: 2px solid #D96B00; color: #2F2F2F; font-weight: bold;">
              <th style="text-align: left; padding: 2px 4px; font-size: 10px; text-transform: uppercase;">Équipement Mobilier</th>
              <th style="text-align: center; padding: 2px 4px; width: 45px; font-size: 10px; text-transform: uppercase;">Qté</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(c.mobilier)
              .filter(([_, qty]) => qty > 0)
              .map(
                ([name, qty]) => `
              <tr style="border-bottom: 1px dashed #e2e8f0;">
                <td style="padding: 4px 4px; text-transform: capitalize; color: #2F2F2F; font-weight: 500;">
                  ${name === "microondes" ? "Micro-ondes" : name === "frigo" ? "Réfrigérateur" : name === "caisson" ? "Caisson roulant" : name === "autre" && c.mobilierAutreTexte ? `Autre (${c.mobilierAutreTexte})` : name}
                </td>
                <td style="padding: 4px 4px; text-align: center; font-weight: bold; color: #D96B00;">${qty}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    // Drawing / Layout Box representation
    let drawingsHtml = "";
    if (["S1", "SD1", "SS1", "SD2", "SDU", "SSU", "Sanitaire 6m"].includes(inspection.moduleType)) {
      const configSanitaire = inspection.characteristics.configSanitaire;
      const targetType = inspection.moduleType === "Sanitaire 6m"
        ? (configSanitaire === "DX" ? "SANITAIRE_6M_DX" : "SANITAIRE_6M_SX")
        : inspection.moduleType;
      const imagePath = getSanitaireImagePath(targetType);
      const label = inspection.moduleType === "Sanitaire 6m"
        ? `Sanitaire 6m — ${configSanitaire || "SX"}`
        : inspection.moduleType;

      if (imagePath) {
        drawingsHtml = `
          <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background-color: #ffffff; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 180px; box-sizing: border-box;">
            <img src="${imagePath}" style="max-height: 145px; max-width: 100%; object-fit: contain;" />
            <div style="font-size: 8px; font-family: monospace; color: #D96B00; text-align: center; margin-top: 5px; font-weight: bold;">
              Plan certifié de référence : ${label}.jpg
            </div>
          </div>
        `;
      } else {
        drawingsHtml = `
          <div style="border: 1px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc; padding: 10px; text-align: center; color: #64748b; font-size: 10px; height: 180px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
            Image de référence non disponible pour ce type.
          </div>
        `;
      }
    } else {
      const sketchImgTag = inspection.sketchDataUrl
        ? `<img src="${inspection.sketchDataUrl}" style="max-height: 160px; max-width: 100%; object-fit: contain;" />`
        : `<div style="color: #94a3b8; font-size: 10px; font-weight: 500;">Aucun croquis manuel dessiné</div>`;
      
      drawingsHtml = `
        <div style="border: 1px dashed #cbd5e1; border-radius: 8px; background-color: #ffffff; padding: 10px; display: flex; align-items: center; justify-content: center; height: 180px; box-sizing: border-box;">
          ${sketchImgTag}
        </div>
      `;
    }

    // Signatures blocks HTML
    const signaturesHtml = `
      <div style="margin-top: 15px; border-top: 1.5px solid #E2E8F0; padding-top: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 12px;">
              <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; background-color: #F8F9FA; min-height: 125px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 3px;">👤 LE TECHNICIEN BUNG'ECO</div>
                  <div style="font-size: 11px; font-weight: 800; color: #2F2F2F;">${inspection.nomTechnicien || "Non renseigné"}</div>
                </div>
                <div style="text-align: center; margin-top: 8px;">
                  ${inspection.signatureTechnicien ? `
                    <div style="font-size: 8px; color: #166534; font-weight: bold; margin-bottom: 2px;">✓ SIGNÉ ÉLECTRONIQUEMENT</div>
                    <img src="${inspection.signatureTechnicien}" style="max-height: 55px; max-width: 100%; object-fit: contain; background: #ffffff; border: 1px dashed #CBD5E1; padding: 2px; border-radius: 4px;" />
                  ` : `
                    <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px 6px; color: #94a3b8; font-size: 9px; font-style: italic; font-weight: 600;">
                      Signature non renseignée
                    </div>
                  `}
                </div>
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 12px;">
              <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; background-color: #F8F9FA; min-height: 125px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 3px;">🤝 REPRÉSENTANT CLIENT</div>
                  <div style="font-size: 11px; font-weight: 800; color: #2F2F2F;">${inspection.nomClient || "Non renseigné"}</div>
                </div>
                <div style="text-align: center; margin-top: 8px;">
                  ${inspection.signatureClient ? `
                    <div style="font-size: 8px; color: #166534; font-weight: bold; margin-bottom: 2px;">✓ SIGNÉ ÉLECTRONIQUEMENT</div>
                    <img src="${inspection.signatureClient}" style="max-height: 55px; max-width: 100%; object-fit: contain; background: #ffffff; border: 1px dashed #CBD5E1; padding: 2px; border-radius: 4px;" />
                  ` : `
                    <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px 6px; color: #94a3b8; font-size: 9px; font-style: italic; font-weight: 600;">
                      Signature non renseignée
                    </div>
                  `}
                </div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    // Determine total pages count
    const numPhotos = inspection.photos ? inspection.photos.length : 0;
    const totalPages = 1 + Math.ceil(numPhotos / 4);

    // --- PAGE 1: FULL TECHNICAL SYNTHESIS REPORT SHEET ---
    const page1Div = document.createElement("div");
    page1Div.className = "pdf-page";
    page1Div.style.width = "794px";
    page1Div.style.height = "1123px";
    page1Div.style.padding = "40px";
    page1Div.style.boxSizing = "border-box";
    page1Div.style.position = "relative";
    page1Div.style.backgroundColor = "#ffffff";
    page1Div.style.fontFamily = "'Inter', system-ui, sans-serif";
    page1Div.style.color = "#2F2F2F";

    const hasTravaux = inspection.travauxPrevoir && inspection.travauxPrevoir.trim();
    const travauxHighlightBox = hasTravaux ? `
      <div style="border: 1.5px solid #FCA5A5; border-radius: 8px; overflow: hidden; background-color: #FEF2F2; margin-bottom: 15px; box-sizing: border-box;">
        <div style="background-color: #FCA5A5; color: #991B1B; padding: 4px 10px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
          ⚠️ TRAVAUX À PRÉVOIR
        </div>
        <div style="padding: 10px 12px; font-size: 10.5px; line-height: 1.45; font-family: monospace; color: #991B1B; font-weight: bold; min-height: 25px;">
          ${inspection.travauxPrevoir.trim()}
        </div>
      </div>
    ` : `
      <div style="border: 1.5px solid #BBF7D0; border-radius: 8px; overflow: hidden; background-color: #F0FDF4; margin-bottom: 15px; box-sizing: border-box;">
        <div style="background-color: #BBF7D0; color: #166534; padding: 4px 10px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
          ✓ SITUATION DE TRANSFERT
        </div>
        <div style="padding: 10px 12px; font-size: 10.5px; line-height: 1.45; font-family: sans-serif; color: #166534; font-weight: bold; min-height: 25px;">
          AUCUN TRAVAUX À PRÉVOIR
        </div>
      </div>
    `;

    page1Div.innerHTML = `
      <!-- a1. header block with SVG logo -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 3px solid #D96B00; padding-bottom: 8px;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg width="40" height="40" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                <path d="M60 10L110 32.5V67.5L60 90L10 67.5V32.5L60 10Z" fill="#FFFFFF" stroke="#2F2F2F" stroke-width="5" stroke-linejoin="round"/>
                <path d="M60 55L110 32.5V47.5L60 70V55Z" fill="#D96B00"/>
                <path d="M10 32.5L60 55V70L10 47.5V32.5Z" fill="#F28C28"/>
                <path d="M60 10V90" stroke="#2F2F2F" stroke-width="4"/>
                <path d="M10 32.5L60 55L110 32.5" stroke="#2F2F2F" stroke-width="4"/>
                <path d="M75 48L90 41.25V66.25L75 73V48Z" fill="#FFFFFF" stroke="#2F2F2F" stroke-width="3" stroke-linejoin="round"/>
                <path d="M25 46L40 52.75V62.75L25 56V46Z" fill="#FFFFFF" stroke="#2F2F2F" stroke-width="3" stroke-linejoin="round"/>
              </svg>
              <div style="text-align: left; line-height: 1;">
                <span style="font-size: 21px; font-weight: 900; color: #2F2F2F; letter-spacing: 0.04em;">BUNG<span style="color: #D96B00;">'ECO</span></span>
                <span style="font-size: 18px; font-weight: 300; color: #64748b; margin-left: 3px;">| EDL</span>
              </div>
            </div>
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <div style="background-color: #2F2F2F; color: #ffffff; display: inline-block; padding: 5px 12px; font-weight: 800; font-size: 10px; border-radius: 5px; letter-spacing: 0.05em; text-transform: uppercase;">
              CONSTAT D'ÉTAT DES LIEUX DE CHANTIER
            </div>
          </td>
        </tr>
      </table>

      <!-- a2. module number badge -->
      <div style="text-align: center; margin-bottom: 15px; margin-top: 5px;">
        <div style="display: inline-block; background-color: #2F2F2F; color: #ffffff; padding: 6px 28px; border-radius: 30px; font-size: 15px; font-weight: 900; letter-spacing: 0.08em; border: 2px solid #D96B00; box-shadow: 0 3px 8px rgba(0,0,0,0.12);">
          MODULE N°${inspection.moduleNumber}
        </div>
      </div>

      <!-- a3. travaux highlights row -->
      ${travauxHighlightBox}

      <!-- a4. general informations & specs -->
      <div style="margin-bottom: 15px;">
        <div style="font-size: 10px; font-weight: 800; color: #2F2F2F; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; border-bottom: 2px solid #D96B00; padding-bottom: 2px;">
          📋 Informations Générales & Spécifications
        </div>

        <!-- Synthesis cards -->
        <div style="display: grid; grid-template-columns: repeat(${inspection.nature === "constat" ? 4 : 3}, 1fr); gap: 10px; margin-bottom: 10px;">
          <div style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 5px 10px; text-align: center; box-sizing: border-box;">
            <div style="font-size: 7.5px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 0.02em;">Gamme Module</div>
            <div style="font-size: 11px; font-weight: 850; color: #2F2F2F; margin-top: 1px;">BUNG'ECO ${inspection.moduleType}</div>
          </div>
          <div style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 5px 10px; text-align: center; box-sizing: border-box;">
            <div style="font-size: 7.5px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 0.02em;">Date du constat</div>
            <div style="font-size: 11px; font-weight: 850; color: #2F2F2F; margin-top: 1px;">${formattedDate}</div>
          </div>
          <div style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 5px 10px; text-align: center; box-sizing: border-box;">
            <div style="font-size: 7.5px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 0.02em;">Opération / Nature</div>
            <div style="font-size: 11px; font-weight: 850; color: #2F2F2F; margin-top: 1px; text-transform: uppercase;">
              ${inspection.nature === "reprise" ? "Fin location" : inspection.nature === "constat" ? "Sur chantier" : "Avant livraison"}
            </div>
          </div>
          ${inspection.nature === "constat" ? `
          <div style="background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 5px 10px; text-align: center; box-sizing: border-box; overflow: hidden;">
            <div style="font-size: 7.5px; text-transform: uppercase; color: #64748b; font-weight: 800; letter-spacing: 0.02em;">Chantier</div>
            <div style="font-size: 10.5px; font-weight: 850; color: #2F2F2F; margin-top: 1px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${inspection.chantier || "Non spécifié"}
            </div>
          </div>
          ` : ""}
        </div>

        <!-- Specs and Furniture side by side table grid -->
        <table style="width: 100%; border-collapse: collapse; box-sizing: border-box;">
          <tr>
            <td style="width: ${furnitureHtml ? "55%" : "100%"}; vertical-align: top; padding-right: ${furnitureHtml ? "10px" : "0px"};">
              <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 6px 10px; background-color: #ffffff; box-sizing: border-box; min-height: 85px;">
                ${charsHtml}
              </div>
            </td>
            ${furnitureHtml ? `
            <td style="width: 45%; vertical-align: top; padding-left: 10px;">
              <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 6px 10px; background-color: #ffffff; box-sizing: border-box; min-height: 85px;">
                ${furnitureHtml}
              </div>
            </td>
            ` : ""}
          </tr>
        </table>
      </div>

      <!-- a5. drawing and observations side by side -->
      <div style="margin-bottom: 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Column drawing -->
            <td style="width: 50%; vertical-align: top; padding-right: 12px;">
              <div style="font-size: 10px; font-weight: 800; color: #2F2F2F; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; border-bottom: 2px solid #D96B00; padding-bottom: 2px;">
                📐 Croquis ou plan technique
              </div>
              ${drawingsHtml}
            </td>
            <!-- Column Observations -->
            <td style="width: 50%; vertical-align: top; padding-left: 12px;">
              <div style="font-size: 10px; font-weight: 800; color: #2F2F2F; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; border-bottom: 2px solid #D96B00; padding-bottom: 2px;">
                📝 Observations du technicien
              </div>
              <div style="padding: 12px; background-color: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 10px; line-height: 1.45; height: 180px; box-sizing: border-box; overflow: hidden; color: #2F2F2F; word-break: break-all; overflow-y: auto;">
                ${inspection.observations.trim() ? inspection.observations.replace(/\n/g, "<br/>") : "Aucune observation particulière consignée sur ce document d'inspection."}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- a6. Signatures block -->
      ${signaturesHtml}

      <!-- a7. footer at bottom -->
      <div style="position: absolute; bottom: 20px; left: 40px; right: 40px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 8px; font-family: monospace; color: #64748b; font-weight: bold; box-sizing: border-box;">
        <div>BUNG'ECO – EDL MANAGER PRO</div>
        <div>PDF généré le ${currentDateTimeStr}</div>
        <div>Page 1 / ${totalPages}</div>
      </div>
    `;

    pagesContainer.appendChild(page1Div);

    // --- PHOTO PAGES: GENERATE PAGES OF 4 PHOTOS MAX ---
    if (numPhotos > 0) {
      for (let photoPageIdx = 0; photoPageIdx < Math.ceil(numPhotos / 4); photoPageIdx++) {
        const pageIndex = photoPageIdx + 2;
        const photoDiv = document.createElement("div");
        photoDiv.className = "pdf-page";
        photoDiv.style.width = "794px";
        photoDiv.style.height = "1123px";
        photoDiv.style.padding = "40px";
        photoDiv.style.boxSizing = "border-box";
        photoDiv.style.position = "relative";
        photoDiv.style.backgroundColor = "#ffffff";
        photoDiv.style.fontFamily = "'Inter', system-ui, sans-serif";
        photoDiv.style.color = "#2F2F2F";

        let photosInsideHtml = "";
        const slicePhotos = inspection.photos.slice(photoPageIdx * 4, photoPageIdx * 4 + 4);

        photosInsideHtml += `<table style="width: 100%; border-collapse: collapse;"><tr>`;
        slicePhotos.forEach((src, idx) => {
          const globalIdx = photoPageIdx * 4 + idx;
          if (idx > 0 && idx % 2 === 0) {
            photosInsideHtml += `</tr><tr>`;
          }
          photosInsideHtml += `
            <td style="width: 50%; padding: 10px; text-align: center; vertical-align: top; box-sizing: border-box;">
              <div style="border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 10px; background-color: #F8F9FA; box-shadow: 0 2px 6px rgba(0,0,0,0.03); display: block;">
                <div style="width: 310px; height: 210px; overflow: hidden; border-radius: 6px; border: 1.5px solid #E2E8F0; background-color: #FFFFFF; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-sizing: border-box;">
                  <img src="${src}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;" />
                </div>
                <div style="font-size: 10px; color: #2F2F2F; font-weight: 800; margin-top: 8px;">
                  Photo #${globalIdx + 1} du constat
                </div>
                <div style="font-size: 8.5px; color: #64748b; font-family: monospace; font-weight: bold; margin-top: 2px;">
                  Prise le ${formattedDate}
                </div>
              </div>
            </td>
          `;
        });
        if (slicePhotos.length % 2 !== 0) {
          photosInsideHtml += `<td style="width: 50%; padding: 10px;"></td>`;
        }
        photosInsideHtml += `</tr></table>`;

        photoDiv.innerHTML = `
          <!-- header standard smaller version -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2.5px solid #D96B00; padding-bottom: 8px;">
            <tr>
              <td style="vertical-align: middle;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 15px; font-weight: 900; color: #2F2F2F; letter-spacing: 0.04em;">BUNG'ECO</span>
                  <span style="font-size: 13px; font-style: italic; color: #64748b;">• MODULE N°${inspection.moduleNumber}</span>
                </div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="font-size: 9px; font-weight: bold; color: #D96B00; text-transform: uppercase; letter-spacing: 0.05em;">
                  PHOTOGRAPHIES DU CONSTAT — Page ${photoPageIdx + 1}
                </div>
              </td>
            </tr>
          </table>

          <div style="margin-top: 25px;">
            ${photosInsideHtml}
          </div>

          <!-- footer -->
          <div style="position: absolute; bottom: 20px; left: 40px; right: 40px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 8px; font-family: monospace; color: #64748b; font-weight: bold; box-sizing: border-box;">
            <div>BUNG'ECO – EDL MANAGER PRO</div>
            <div>PDF généré le ${currentDateTimeStr}</div>
            <div>Page ${pageIndex} / ${totalPages}</div>
          </div>
        `;

        pagesContainer.appendChild(photoDiv);
      }
    }

    document.body.appendChild(pagesContainer);

    onProgress?.("Génération des pages PDF de l'état des lieux...");
    const pageDivs = Array.from(pagesContainer.children) as HTMLDivElement[];
    
    // Create final landscape/portrait jsPDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageDivs.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      onProgress?.(`Traitement graphique de la page ${i + 1}/${pageDivs.length}...`);
      const canvas = await html2canvas(pageDivs[i], {
        scale: 2, // High DPI density
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    }

    onProgress?.("Finalisation du document...");
    let fileFormattedDate = inspection.date || ""; 
    if (fileFormattedDate.includes("-")) {
      const parts = fileFormattedDate.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        fileFormattedDate = `${parts[2]}_${parts[1]}_${parts[0]}_`;
      } else {
        fileFormattedDate = fileFormattedDate.replace(/-/g, "_") + "_";
      }
    } else if (fileFormattedDate.includes("/")) {
      fileFormattedDate = fileFormattedDate.replace(/\//g, "_") + "_";
    } else {
      fileFormattedDate = fileFormattedDate + "_";
    }

    const fileName = `EDL-${inspection.moduleNumber || "MODULE"}-${fileFormattedDate}.pdf`;

    // Remove print element from the DOM
    document.body.removeChild(pagesContainer);
    return { pdf, fileName };
  } catch (err) {
    console.error("Failed to generate PDF:", err);
    return null;
  }
}

export async function generateInspectionPDF(
  inspection: Inspection,
  onProgress?: (msg: string) => void
): Promise<boolean> {
  const result = await buildInspectionPDFDoc(inspection, onProgress);
  if (!result) return false;
  result.pdf.save(result.fileName);
  return true;
}

export async function generateInspectionPDFBlob(
  inspection: Inspection,
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; fileName: string } | null> {
  const result = await buildInspectionPDFDoc(inspection, onProgress);
  if (!result) return null;
  const blob = result.pdf.output("blob");
  return { blob, fileName: result.fileName };
}

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

const ORDER_QUESTIONS = [
  { id: "qc1_serial_match", text: "Les numéros correspondent à ceux de la fiche atelier ?" },
  { id: "qc2_plan_match", text: "Les modules sont conformes au plan ?" },
  { id: "qc3_variants_present", text: "Les variantes prévues sont présentes ? (clim, cuisinette, etc.)" },
  { id: "qc4_furniture_qty", text: "Le quantitatif du mobilier est respecté ?" },
  { id: "qc5_atelier_match", text: "Le module est conforme à la fiche atelier ?" },
] as const;

// Questionnaire spécifique pour les containers (C8', C10', C20', C20'OS)
export const CONTAINER_QUESTIONS = [
  { id: "qc_container_labels", text: "Étiquette présente ?" },
  { id: "qc_container_joints", text: "Joints de porte OK ?" },
  { id: "qc_container_clef_canne", text: "Clef-Canne présente ?" },
] as const;

// Questionnaire pour le mode de contrôle simplifié
export const SIMPLIFIED_QUESTIONS = [
  { id: "qs1_labels_keys_lifting", text: "Étiquettes, clefs et plaques de levage sont conformes" },
  { id: "qs2_holes_parecloses_closed", text: "Trous bouchés, pare-closes OK et menuiseries fermées ?" },
  { id: "qs3_state_transport", text: "État du module satisfaisant et transport possible sans problème ?" },
  { id: "qs4_serial_match", text: "Les numéros correspondent à ceux de la fiche atelier ?" },
  { id: "qs5_variants_furniture", text: "Les variantes prévues et le mobilier sont conformes à la commande ?" },
] as const;

export const isContainerModule = (type: string): boolean => {
  return type === "C8'" || type === "C10'" || type === "C20'" || type === "C20' OS" || type === "C20'OS";
};

/**
 * Builds the Delivery Control PDF document.
 */
export async function buildDeliveryControlPDFDoc(
  control: DeliveryControl,
  onProgress?: (msg: string) => void
): Promise<{ pdf: jsPDF; fileName: string } | null> {
  try {
    onProgress?.("Préparation du rapport de contrôle...");

    const printContainer = document.createElement("div");
    printContainer.style.position = "absolute";
    printContainer.style.left = "-9999px";
    printContainer.style.top = "-9999px";
    printContainer.style.width = "790px"; // A4 Standard responsive width
    printContainer.style.backgroundColor = "#ffffff";
    printContainer.style.padding = "25px";
    printContainer.style.fontFamily = "'Inter', system-ui, sans-serif";
    printContainer.style.color = "#1e293b";

    const formattedDate = new Date(control.date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const questionLabels: Record<string, string> = {
      q1_labels: "Toutes les étiquettes sont présentes ?",
      q2_keys: "Les 2 clés sont sur le barillet ?",
      q3_lifting: "Les 4 plaques de levage sont présentes ?",
      q4_screws: "Toutes les vis sont présentes ?",
      q5_joints: "Les joints intérieurs sont corrects ?",
      q6_closed: "Les fenêtres sont fermées et les portes verrouillées ?",
      q7_plugged: "Les trous sont bouchés ?",
      q8_parecloses: "Les parecloses sont-elles toutes présentes sur les menuiseries ?",
      q9_transport: "Le module peut être transporté sans problème ?",
      q10_profiles: "Tous les profils d'assemblage sont présents ?",
      q11_protection: "Filet de protection mis en place ?",
      q12_general: "État général du module satisfaisant ?",
      qc1_serial_match: "Les numéros correspondent à ceux de la fiche atelier ?",
      qc2_plan_match: "Les modules sont conformes au plan ?",
      qc3_variants_present: "Les variantes prévues sont présentes ? (clim, cuisinette, etc.)",
      qc4_furniture_qty: "Le quantitatif du mobilier est respecté ?",
      qc5_atelier_match: "Le module est conforme à la fiche atelier ?",
    };

    const formatAnswer = (ans: string) => {
      if (ans === "conforme") return `<span style="color: #10b981; font-weight: bold;">✔ CONFORME</span>`;
      if (ans === "non_conforme") return `<span style="color: #ea580c; font-weight: bold;">✖ NON CONFORME</span>`;
      return `<span style="color: #64748b; font-weight: 500;">Ø SANS OBJET</span>`;
    };

    // --- PAGE 1: GLOBAL CONTROL SUMMARY ---
    let htmlContent = `
      <!-- HEADER HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #d96c0f; padding-bottom: 20px; margin-bottom: 25px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <svg width="42" height="42" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <path d="M60 10L110 32.5V67.5L60 90L10 67.5V32.5L60 10Z" fill="#FFFFFF" stroke="#2F2F2F" stroke-width="5" stroke-linejoin="round"/>
            <path d="M60 55L110 32.5V47.5L60 70V55Z" fill="#D96B00"/>
            <path d="M10 32.5L60 55V70L10 47.5V32.5Z" fill="#F28C28"/>
            <path d="M60 10V90" stroke="#2F2F2F" stroke-width="4"/>
            <path d="M10 32.5L60 55L110 32.5" stroke="#2F2F2F" stroke-width="4"/>
            <path d="M75 48L90 41.25V66.25L75 73V48Z" fill="#FFFFFF" stroke="#2F2F2F" stroke-width="3" stroke-linejoin="round"/>
            <path d="M25 46L40 52.75V62.75L25 56V46Z" fill="#FFFFFF" stroke="#2F2F2F" stroke-width="3" stroke-linejoin="round"/>
          </svg>
          <div style="text-align: left; line-height: 1.1;">
            <div style="font-size: 19px; font-weight: 900; letter-spacing: 0.04em; color: #2F2F2F;">BUNG<span style="color: #D96B00;">'ECO</span></div>
            <div style="font-size: 9px; font-weight: 800; color: #d96c0f; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 2px;">CONTRÔLE DES MODULES AVANT EXPÉDITION</div>
          </div>
        </div>
        <div style="text-align: right; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 14px; border-radius: 8px;">
          <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">STATUT DE COMMANDE</div>
          <div style="font-size: 13px; font-weight: 900; color: #1e293b; margin-top: 2px;">
            ${control.status === "termine" ? "✅ SYNTHÈSE TERMINÉE" : "⏸ EN ATTENTE"}
          </div>
        </div>
      </div>

      <!-- MAIN TITLE BOX -->
      <div style="background-color: #1e293b; border-radius: 12px; padding: 22px; color: white; text-align: left; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <span style="font-size: 10px; font-weight: 900; background-color: #d96c0f; color: white; padding: 4px 8px; border-radius: 4px; letter-spacing: 0.05em; text-transform: uppercase;">
          Fiche de Suivi Qualité
        </span>
        <h1 style="font-size: 20px; font-weight: 900; margin: 10px 0 2px 0; letter-spacing: -0.02em; text-transform: uppercase;">
          📦 CONTRÔLE AVANT LIVRAISON
        </h1>
        <p style="font-size: 11px; color: #94a3b8; font-weight: 500; margin: 0;">
          Rapport complet de conformité globale de la commande client avant départ de l'atelier.
        </p>
      </div>

      <!-- GENERAL DETAILS GRID -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; text-align: left;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
          <div style="font-size: 9px; font-weight: 800; color: #d96c0f; text-transform: uppercase; tracking-wider: 0.05em; margin-bottom: 4px;">👤 Client destinataire</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${control.client}</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
          <div style="font-size: 9px; font-weight: 800; color: #d96c0f; text-transform: uppercase; tracking-wider: 0.05em; margin-bottom: 4px;">📅 Date du contrôle</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${formattedDate}</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
          <div style="font-size: 9px; font-weight: 800; color: #d96c0f; text-transform: uppercase; tracking-wider: 0.05em; margin-bottom: 4px;">🕵️ Contrôleur</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${control.controller}</div>
        </div>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
          <div style="font-size: 9px; font-weight: 800; color: #d96c0f; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">⚙️ Mode de contrôle</div>
          <div style="font-size: 13px; font-weight: 805; color: #0f172a;">${control.controlMode === "simplifie" ? "Contrôle simplifié" : "Contrôle complet"}</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
          <div style="font-size: 9px; font-weight: 800; color: #d96c0f; text-transform: uppercase; tracking-wider: 0.05em; margin-bottom: 4px;">📍 Destination</div>
          <div style="font-size: 13px; font-weight: 805; color: #0f172a;">${control.chantier || "Non renseignée"}</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px;">
          <div style="font-size: 9px; font-weight: 800; color: #d96c0f; text-transform: uppercase; tracking-wider: 0.05em; margin-bottom: 4px;">📦 Volumes contrôlés</div>
          <div style="font-size: 13px; font-weight: 805; color: #0f172a;">${control.modules.length} module(s)</div>
        </div>
      </div>

      <!-- TABLE SUMMARY OF CONTROLLED MODULES -->
      <div style="text-align: left; margin-bottom: 40px;">
        <div style="background-color: #1e293b; color: white; padding: 12px 18px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 8px 8px 0 0;">
          🧾 INVENTAIRE ET SYNTHÈSE DES MODULES DE LA COMMANDE
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1; border-top: none;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px 15px; text-align: left; font-weight: 800; color: #334155; width: 33%;">Référence Module</th>
              <th style="padding: 10px 15px; text-align: left; font-weight: 800; color: #334155; width: 33%;">Type de Module</th>
              <th style="padding: 10px 15px; text-align: center; font-weight: 800; color: #334155; width: 34%;">Verdict Qualité</th>
            </tr>
          </thead>
          <tbody>
            ${control.modules.map((m) => `
              <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 12px 15px; font-weight: 950; font-family: monospace; color: #0f172a;">
                  ${m.moduleNumber} ${m.isModuleNeuf ? '<span style="background-color: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 900; margin-left: 6px; border: 1px solid #fde68a;">NEUF</span>' : ''}
                </td>
                <td style="padding: 12px 15px; font-weight: bold; color: #334155;">BUNG'ECO ${m.moduleType}</td>
                <td style="padding: 12px 15px; text-align: center;">
                  ${
                    m.status === "conforme" 
                      ? `<span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-size: 9px; font-weight: bold; border: 1px solid #a7f3d0;">🟢 MODULE CONFORME</span>`
                      : `<span style="background-color: #ffedd5; color: #9a3412; padding: 4px 10px; border-radius: 9999px; font-size: 9px; font-weight: bold; border: 1px solid #fed7aa;">🟠 AVEC RÉSERVES</span>`
                  }
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <!-- FOOTER FIRST PAGE -->
      <div style="text-align: center; font-size: 8px; color: #64748b; margin-top: 80px; font-family: monospace; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 15px;">
        Page 1 • Synthèse Générale • EDL Manager Pro — BUNG'ECO S.A.S.
      </div>
    `;

    // --- DETAILED PAGE FOR EACH MODULE ---
    control.modules.forEach((m, mIdx) => {
      const isContainer = isContainerModule(m.moduleType);
      const isSimplifieMode = control.controlMode === "simplifie";

      let checklistContentHtml = "";

      if (isContainer) {
        // Containers: Uniquement les 3 questions spécifiques
        const containerRowsHtml = CONTAINER_QUESTIONS.map((q) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; text-align: left; width: 75%; color: #344155; font-weight: 500;">${q.text}</td>
            <td style="padding: 8px 12px; text-align: right; width: 25%; font-size: 9.5px; font-family: monospace;">${formatAnswer(m[q.id as keyof ModuleControl] as any)}</td>
          </tr>
        `).join("");

        checklistContentHtml = `
          <div style="margin-bottom: 15px;">
            <div style="background-color: #334155; color: white; padding: 8px 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 6px 6px 0 0;">
              CONTRÔLE DU CONTAINER (${m.moduleType})
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e2e8f0; border-top: none;">
              <tbody>
                ${containerRowsHtml}
              </tbody>
            </table>
          </div>
        `;
      } else if (isSimplifieMode) {
        // Mode Contrôle simplifié: Uniquement les 5 questions simplifiées
        const simplifieRowsHtml = SIMPLIFIED_QUESTIONS.map((q) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; text-align: left; width: 75%; color: #344155; font-weight: 500;">${q.text}</td>
            <td style="padding: 8px 12px; text-align: right; width: 25%; font-size: 9.5px; font-family: monospace;">${formatAnswer(m[q.id as keyof ModuleControl] as any)}</td>
          </tr>
        `).join("");

        checklistContentHtml = `
          <div style="margin-bottom: 15px;">
            <div style="background-color: #334155; color: white; padding: 8px 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 6px 6px 0 0;">
              CONTRÔLE SIMPLIFIÉ DU MODULE
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e2e8f0; border-top: none;">
              <tbody>
                ${simplifieRowsHtml}
              </tbody>
            </table>
          </div>
        `;
      } else {
        // Mode Contrôle complet standard
        const mChecklistHtml = MODULE_QUESTIONS.map((q) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 12px; text-align: left; width: 75%; color: #344155; font-weight: 500;">${q.text}</td>
            <td style="padding: 6px 12px; text-align: right; width: 25%; font-size: 9.5px; font-family: monospace;">${formatAnswer(m[q.id])}</td>
          </tr>
        `).join("");

        const oChecklistHtml = ORDER_QUESTIONS.map((q) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 12px; text-align: left; width: 75%; color: #344155; font-weight: 500;">${q.text}</td>
            <td style="padding: 6px 12px; text-align: right; width: 25%; font-size: 9.5px; font-family: monospace;">${formatAnswer(m[q.id])}</td>
          </tr>
        `).join("");

        checklistContentHtml = `
          <div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <div style="background-color: #334155; color: white; padding: 6px 12px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 6px 6px 0 0;">
                I. EXAMEN DU MODULE EN ATELIER 
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #e2e8f0; border-top: none;">
                <tbody>
                  ${mChecklistHtml}
                </tbody>
              </table>
            </div>

            <div style="margin-top: 5px;">
              <div style="background-color: #475569; color: white; padding: 6px 12px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 6px 6px 0 0;">
                II. CONFORMITÉ AU CAHIER DES CHARGES / COMMANDE
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #e2e8f0; border-top: none;">
                <tbody>
                  ${oChecklistHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // Photos section inside detailed page
      let photosHtml = "";
      if (m.photos && m.photos.length > 0) {
        photosHtml = `
          <div style="margin-top: 15px;">
            <div style="background-color: #475569; color: white; padding: 8px 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 6px 6px 0 0; text-align: left;">
              📷 CLICHÉS DU CONTRÔLE (MODULE ${m.moduleNumber})
            </div>
            <div style="padding: 10px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 6px 6px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start; background-color: #f8fafc;">
              ${m.photos.map((ph) => `
                <div style="width: 215px; height: 145px; display: flex; align-items: center; justify-content: center; background: #ffffff; border-radius: 4px; border: 1px solid #cbd5e1; overflow: hidden; box-sizing: border-box; padding: 4px;">
                  <img src="${ph}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;" />
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }

      htmlContent += `
        <div style="page-break-before: always; text-align: left; margin-top: 10px;">
          
          <!-- HEADING OF SPECIFIC MODULE -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="font-size: 20px;">📦</div>
              <div>
                <h2 style="font-size: 15px; font-weight: 900; color: #1e293b; margin: 0; text-transform: uppercase;">
                  RAPPORT MODULE ${m.moduleNumber} ${m.isModuleNeuf ? '- NEUF' : ''}
                </h2>
                <div style="font-size: 9px; color: #64748b; font-weight: bold; font-family: monospace;">
                  INDEX COMMANDES : ${mIdx + 1} SUR ${control.modules.length} • TYPE : BUNG'ECO ${m.moduleType}
                </div>
              </div>
            </div>

            <!-- RESULT BANNER -->
            <div>
              ${
                m.status === "conforme"
                  ? `<div style="background-color: #d1fae5; color: #065f46; font-size: 9.5px; font-weight: 900; padding: 6px 12px; border-radius: 6px; border: 1.5px solid #10b981;">🟢 MODULE CONFORME</div>`
                  : `<div style="background-color: #ffedd5; color: #9a3412; font-size: 9.5px; font-weight: 900; padding: 6px 12px; border-radius: 6px; border: 1.5px solid #ea580c;">🟠 MODULE AVEC RÉSERVES</div>`
              }
            </div>
          </div>

          <!-- CHECKLISTS -->
          ${checklistContentHtml}

          <!-- REMARKS SECTION (Références particulières retirées de cette partie) -->
          <div style="margin-bottom: 15px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
              <div style="font-size: 8.5px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">📝 Observations du contrôleur</div>
              <div style="font-size: 9.5px; color: #0f172a; font-weight: bold; min-height: 25px; font-family: sans-serif;">
                ${m.observations ? m.observations.replace(/\n/g, "<br />") : "Aucune observation rédigée"}
              </div>
            </div>
          </div>

          <!-- PHOTOS SECTION IF ANY -->
          ${photosHtml}

          <!-- FOOTER DETAIL PAGE -->
          <div style="text-align: center; font-size: 8px; color: #64748b; margin-top: 30px; font-family: monospace; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 15px;">
            Rapport Module ${m.moduleNumber} • Commande ${control.client} • Page ${mIdx + 2} — BUNG'ECO EDL Manager Pro
          </div>
        </div>
      `;
    });

    printContainer.innerHTML = htmlContent;
    document.body.appendChild(printContainer);

    onProgress?.("Prise des clichés du rapport de contrôle...");
    const canvas = await html2canvas(printContainer, {
      scale: 2, // High resolution retina rendering
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    onProgress?.("Génération des pages PDF de la livraison...");
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    const scale = pdfWidth / imgWidth;
    const scaledImgHeight = imgHeight * scale;

    let currentY = 0;
    let pageCount = 0;
    while (currentY < scaledImgHeight) {
      if (pageCount > 0) {
        pdf.addPage();
      }
      
      pdf.addImage(imgData, "JPEG", 0, -currentY, pdfWidth, scaledImgHeight);
      currentY += pdfHeight;
      pageCount++;
    }

    let fileFormattedDate = control.date || "";
    fileFormattedDate = fileFormattedDate.replace(/-/g, "_");
    
    const fileName = `CONTROL-LIVRAISON-${control.client.replace(/\s+/g, "_")}-${fileFormattedDate}.pdf`;

    // Remove print element
    document.body.removeChild(printContainer);
    return { pdf, fileName };
  } catch (err) {
    console.error("Failed to generate Delivery Control PDF:", err);
    return null;
  }
}

export async function generateDeliveryControlPDF(
  control: DeliveryControl,
  onProgress?: (msg: string) => void
): Promise<boolean> {
  const result = await buildDeliveryControlPDFDoc(control, onProgress);
  if (!result) return false;
  result.pdf.save(result.fileName);
  return true;
}

export async function generateDeliveryControlPDFBlob(
  control: DeliveryControl,
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; fileName: string } | null> {
  const result = await buildDeliveryControlPDFDoc(control, onProgress);
  if (!result) return null;
  const blob = result.pdf.output("blob");
  return { blob, fileName: result.fileName };
}

/**
 * Downloads a Blob directly to the client disk.
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Returns formatted subject/title for EDL based on module number and Neuf status.
 * e.g. "EDL - Module 4587" or "EDL - Module 4587 - NEUF"
 */
export function getEDLSubject(inspection: { moduleNumber: string; isModuleNeuf?: boolean }): string {
  const num = inspection.moduleNumber?.trim() || "Sans réf";
  return inspection.isModuleNeuf ? `EDL - Module ${num} - NEUF` : `EDL - Module ${num}`;
}

/**
 * Returns formatted subject/title for Delivery Control based on module numbers and Neuf status.
 * e.g. "Contrôle avant livraison - Module 4587" or "Contrôle avant livraison - Module 4587 - NEUF"
 * or "Contrôle avant livraison - Modules 4587 (NEUF), 4588"
 */
export function getDeliveryControlSubject(control: DeliveryControl): string {
  const mods = control.modules || [];
  if (mods.length === 0) {
    return "Contrôle avant livraison";
  }
  if (mods.length === 1) {
    const num = mods[0].moduleNumber?.trim() || "Sans réf";
    return mods[0].isModuleNeuf
      ? `Contrôle avant livraison - Module ${num} - NEUF`
      : `Contrôle avant livraison - Module ${num}`;
  }
  const desc = mods
    .map((m) => {
      const num = m.moduleNumber?.trim() || "Sans réf";
      return m.isModuleNeuf ? `${num} (NEUF)` : num;
    })
    .join(", ");
  return `Contrôle avant livraison - Modules ${desc}`;
}

/**
 * Shares a PDF file using the Web Share API (with file attachment) if supported,
 * or falls back to downloading the file and opening a mailto: link to contact@bungeco.fr.
 */
export async function shareOrEmailPDF({
  blob,
  fileName,
  title,
  text,
  subject,
  body,
  recipientEmail = "contact@bungeco.fr",
}: {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
  subject: string;
  body: string;
  recipientEmail?: string;
}): Promise<{ shared: boolean; method: "share" | "mailto" }> {
  try {
    const file = new File([blob], fileName, { type: "application/pdf" });

    // Check if navigator.share with files is supported
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        const shareText = text.includes(recipientEmail)
          ? text
          : `${text}\nDestinataire : ${recipientEmail}`;
        await navigator.share({
          title,
          text: shareText,
          files: [file],
        });
        return { shared: true, method: "share" };
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // User closed the share sheet
          return { shared: false, method: "share" };
        }
        console.warn("navigator.share failed, using mailto fallback:", err);
      }
    }
  } catch (err) {
    console.warn("File creation or share check failed, using fallback:", err);
  }

  // Fallback:
  // 1. Download file so user has it on their device
  downloadBlob(blob, fileName);

  // 2. Open mailto to recipientEmail (contact@bungeco.fr)
  const mailtoBody = `${body}\n\n(Le document PDF "${fileName}" a été téléchargé sur votre appareil. Veuillez l'ajouter en pièce jointe à cet e-mail.)`;
  const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`;
  window.location.href = mailtoUrl;

  return { shared: true, method: "mailto" };
}

