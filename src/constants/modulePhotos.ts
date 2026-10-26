/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModuleType } from "../types";

export interface ModulePhotoConfig {
  filename: string;
  label: string;
}

/**
 * Mapping between ModuleType and the real photograph located in public/modules/
 */
export const MODULE_PHOTOS: Partial<Record<ModuleType, ModulePhotoConfig>> = {
  "C20'": {
    filename: "container-de-stockage.jpg",
    label: "Container 20 pieds standard",
  },
  "C20' OS": {
    filename: "container-open-side.jpg",
    label: "Container 20 pieds Open-Side",
  },
  "C8'": {
    filename: "conteneur-de-stockage-8-pieds.jpg",
    label: "Container C8' (8 pieds)",
  },
  "Cuve 2500L": {
    filename: "cuve-2500l.JPG",
    label: "Cuve 2500 L",
  },
  "Cuve 6300L": {
    filename: "cuve-6300l.JPEG",
    label: "Cuve 6300 L",
  },
  "Escalier 4 marches": {
    filename: "escalier-4-marches.JPG",
    label: "Escalier 4 marches",
  },
  "Escalier R+1": {
    filename: "escalier-r1.JPG",
    label: "Escalier R+1",
  },
};

/**
 * Checks if a given module type has an associated reference photo
 */
export function isModuleWithPhoto(moduleType?: string): boolean {
  if (!moduleType) return false;
  return Boolean(MODULE_PHOTOS[moduleType as ModuleType]);
}

/**
 * Returns the absolute URL or base-prefixed path to the photo in public/modules/,
 * fully compatible with GitHub Pages and Vite base paths.
 */
export function getModulePhotoPath(moduleType?: string): string | null {
  if (!moduleType) return null;
  const config = MODULE_PHOTOS[moduleType as ModuleType];
  if (!config) return null;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/modules/${config.filename}`;
}

/**
 * Returns the display label for the module type
 */
export function getModulePhotoLabel(moduleType?: string): string {
  if (!moduleType) return "";
  const config = MODULE_PHOTOS[moduleType as ModuleType];
  return config ? config.label : moduleType;
}
