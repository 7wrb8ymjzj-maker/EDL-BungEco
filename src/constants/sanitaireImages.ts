import S1 from "../assets/sanitaires/S1.jpg";
import SS1 from "../assets/sanitaires/SS1.jpg";
import SD1 from "../assets/sanitaires/SD1.jpg";
import SD2 from "../assets/sanitaires/SD2.jpg";
import SDU from "../assets/sanitaires/SDU.jpg";
import SSU from "../assets/sanitaires/SSU.jpg";
import SANITAIRE_6M_SX from "../assets/sanitaires/SANITAIRE_6M_SX.jpg";
import SANITAIRE_6M_DX from "../assets/sanitaires/SANITAIRE_6M_DX.jpg";

export const SANITAIRE_IMAGE_PATHS: Record<string, string> = {
  S1,
  SS1,
  SD1,
  SD2,
  SDU,
  SSU,
  SANITAIRE_6M_SX,
  SANITAIRE_6M_DX,
};

export function getSanitaireImagePath(moduleType?: string): string | null {
  if (!moduleType) return null;

  const normalized = moduleType.trim().toUpperCase();

  return SANITAIRE_IMAGE_PATHS[normalized] ?? null;
}
