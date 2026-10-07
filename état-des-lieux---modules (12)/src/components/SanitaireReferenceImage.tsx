import React from "react";
import { getSanitaireImagePath } from "../constants/sanitaireImages";

interface SanitaireReferenceImageProps {
  moduleType: string;
}

export default function SanitaireReferenceImage({ moduleType }: SanitaireReferenceImageProps) {
  const imagePath = getSanitaireImagePath(moduleType);

  console.log("MODULE TYPE =", moduleType);
  console.log("IMAGE PATH =", imagePath);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {imagePath ? (
        <img
          src={imagePath}
          alt={`Sanitaire ${moduleType}`}
          className="max-h-[340px] w-auto max-w-full object-contain rounded-lg border border-slate-200/90 shadow-sm bg-white"
          referrerPolicy="no-referrer"
        />
      ) : (
        <p className="text-xs font-bold text-slate-600">Image sanitaire non disponible pour : {moduleType}</p>
      )}
    </div>
  );
}

// For compatibility with utils.ts (re-export getSanitaireImagePath)
export { getSanitaireImagePath };
