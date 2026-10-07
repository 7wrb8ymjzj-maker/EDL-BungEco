import React, { useState, useRef } from "react";
import { Camera, Image as ImageIcon, X, Maximize2, Trash2, AlertCircle } from "lucide-react";
import { compressImage } from "../utils/compressor";

interface PhotoManagerProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  readOnly?: boolean;
}

export default function PhotoManager({ photos = [], onChange, readOnly = false }: PhotoManagerProps) {
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    setErrorMsg(null);

    const newPhotosBase64: string[] = [];
    let hasInvalidFiles = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        hasInvalidFiles = true;
        continue;
      }

      try {
        // Compress to 1600px Max, 0.78 JPEG Quality
        const compressedBase64 = await compressImage(file, 1600, 0.78);
        newPhotosBase64.push(compressedBase64);
      } catch (err) {
        console.error("Erreur de compression pour le fichier :", file.name, err);
        setErrorMsg("Échec du traitement de certaines images. Veuillez réessayer.");
      }
    }

    if (hasInvalidFiles) {
      setErrorMsg("Certains fichiers ont été ignorés car ils ne sont pas des images (formats acceptés : JPG, JPEG, PNG).");
    }

    if (newPhotosBase64.length > 0) {
      const updatedPhotos = [...photos];
      let hasAddedDuplicates = false;

      newPhotosBase64.forEach((b64) => {
        if (!updatedPhotos.includes(b64)) {
          updatedPhotos.push(b64);
        } else {
          hasAddedDuplicates = true;
        }
      });

      // Safety limit safeguard (IndexedDB handles ~25-50MB easily)
      const estimatedSize = updatedPhotos.reduce((sum, p) => sum + p.length, 0);
      const limitBytes = 25 * 1024 * 1024; // 25 MB safe buffer with IndexedDB

      if (estimatedSize > limitBytes) {
        setErrorMsg("Le nombre ou le poids des photos est trop important pour un stockage temporaire sur cet appareil. Merci de supprimer quelques photos.");
        setIsCompressing(false);
        return;
      }

      onChange(updatedPhotos);
      if (hasAddedDuplicates && !errorMsg) {
        setErrorMsg("Certaines photos déjà importées ont été ignorées.");
      }
    }
    setIsCompressing(false);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (e.target) e.target.value = "";
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (e.target) e.target.value = "";
  };

  const handleDeletePhoto = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    const updated = photos.filter((_, idx) => idx !== indexToDelete);
    onChange(updated);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-4 text-left">
      {/* Visual error alert */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in font-medium">
          <AlertCircle size={15} className="shrink-0" />
          <div className="flex-1">
            {errorMsg}
          </div>
          <button 
            type="button" 
            onClick={() => setErrorMsg(null)} 
            className="text-red-400 hover:text-red-600 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload & Capture Buttons Block */}
      {!readOnly && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* INPUT 1: TAKING REAL PHOTO WITH CAMERA */}
            <button
              type="button"
              id="camera-photo-btn"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isCompressing}
              className={`flex items-center justify-center gap-3.5 px-5 py-4 bungeco-touch-btn rounded-xl text-white font-bold transition-all shadow-md cursor-pointer ${
                isCompressing 
                  ? "bg-slate-400 cursor-not-allowed text-slate-100" 
                  : "bg-bungeco-orange hover:bg-bungeco-orange-light text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              <Camera size={20} className="stroke-[2.5px]" />
              <div className="text-left leading-tight">
                <span className="block text-sm">Prendre une photo</span>
                <span className="block text-[10px] font-normal opacity-90">Ouvrir l'appareil photo du chantier</span>
              </div>
            </button>

            {/* INPUT 2: IMPORTING PHOTO FROM STORAGE */}
            <button
              type="button"
              id="import-photo-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className={`flex items-center justify-center gap-3.5 px-5 py-4 bungeco-touch-btn rounded-xl font-bold transition-all shadow-md cursor-pointer border ${
                isCompressing 
                  ? "bg-slate-200 text-slate-400 border-slate-350 cursor-not-allowed" 
                  : "bg-white hover:bg-slate-100 border-bungeco-orange text-bungeco-orange hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              <ImageIcon size={20} className="stroke-[2px]" />
              <div className="text-left leading-tight">
                <span className="block text-sm text-bungeco-dark">Importer une photo</span>
                <span className="block text-[10px] text-slate-500 font-normal">Sélecteur de fichiers images</span>
              </div>
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleCameraChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportChange}
            accept="image/png, image/jpeg, image/jpg"
            multiple
            className="hidden"
          />

          {isCompressing && (
            <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-bungeco-orange font-bold font-mono">
              <span className="w-2.5 h-2.5 bg-bungeco-orange rounded-full animate-ping"></span>
              Optimisation et compression automatique en cours...
            </div>
          )}

          <div className="text-[10px] text-slate-400 text-center font-bold">
            💡 Photos compressées automatiquement pour le stockage et intégrées en haute définition dans le PDF.
          </div>
        </div>
      )}

      {/* Thumbnails list */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((src, index) => (
            <div
              key={index}
              onClick={() => setZoomedPhoto(src)}
              className="relative aspect-square group rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all bg-slate-100 cursor-zoom-in"
            >
              <img
                src={src}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-250"
                referrerPolicy="no-referrer"
              />
              
              {/* Overlay with zoom icon */}
              <div className="absolute inset-0 bg-bungeco-dark/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 size={18} className="text-white drop-shadow-md" />
              </div>

              {/* Delete button (only in edit/new mode) */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => handleDeletePhoto(index, e)}
                  title="Supprimer la photo"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md focus:outline-none transition-transform active:scale-90 cursor-pointer"
                >
                  <Trash2 size={13} className="stroke-[2.5px]" />
                </button>
              )}

              {/* Number tag */}
              <div className="absolute bottom-2 left-2 bg-bungeco-dark/85 px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold text-white shadow-xs">
                PHOTO #{index + 1}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-slate-400 text-[11px] font-bold">
          <ImageIcon size={24} className="mb-2 text-slate-300" />
          Aucun cliché photographique associé à cet EDL pour le moment.
        </div>
      )}

      {/* Zoom Modal overlay */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-bungeco-dark/95 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setZoomedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute -top-12 right-0 text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
            <img
              src={zoomedPhoto}
              alt="Aperçu agrandi"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
