/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Client-side image compression using Canvas to resize and convert to JPEG
 * Max dimension: 1600px, quality: 0.78
 */
export const compressImage = (file: File, maxDim: number = 1600, quality: number = 0.78): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Impossible de créer le contexte de dessin 2D."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Erreur de rendu de l'image."));
    };
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
  });
};
