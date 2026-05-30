"use client";

// import { useEffect } from "react";

// export function PrintAutoLauncher({ auto }: { auto: boolean }) {
//   useEffect(() => {
//     if (!auto) return;
//     // small delay so fonts/images settle
//     const t = window.setTimeout(() => {
//       window.print();
//     }, 600);
//     return () => clearTimeout(t);
//   }, [auto]);
//   return null;
// }

// export function PrintTriggerButton() {
//   return (
//     <button onClick={() => window.print()} className="btn-primary">
//       Print
//     </button>
//   );
// }


import { useEffect } from "react";

export function PrintAutoLauncher({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (!auto) return;

    // Wait for ALL images on the page (letterhead + signature) to fully
    // load before triggering print. If we call window.print() before the
    // letterhead backgroundImage is cached, the browser renders a blank
    // white background — which is exactly what Image 1 showed.
    const triggerPrint = () => {
      // Additional small buffer after images load so fonts settle too
      window.setTimeout(() => window.print(), 300);
    };

    const images = Array.from(document.querySelectorAll("img"));

    if (images.length === 0) {
      // No images at all — just wait for fonts
      window.setTimeout(() => window.print(), 400);
      return;
    }

    let loadedCount = 0;
    const onLoad = () => {
      loadedCount += 1;
      if (loadedCount >= images.length) triggerPrint();
    };

    images.forEach((img) => {
      if (img.complete) {
        // Already cached/loaded
        onLoad();
      } else {
        img.addEventListener("load", onLoad, { once: true });
        img.addEventListener("error", onLoad, { once: true }); // don't block on broken images
      }
    });

    // Hard fallback: if images take more than 5s, print anyway
    const fallback = window.setTimeout(() => window.print(), 5000);

    return () => clearTimeout(fallback);
  }, [auto]);

  return null;
}

export function PrintTriggerButton() {
  const handlePrint = () => {
    // Same logic for manual print button — wait for images first
    const images = Array.from(document.querySelectorAll("img"));
    const unloaded = images.filter((img) => !img.complete);

    if (unloaded.length === 0) {
      window.print();
      return;
    }

    let loadedCount = 0;
    const onLoad = () => {
      loadedCount += 1;
      if (loadedCount >= unloaded.length) window.print();
    };

    unloaded.forEach((img) => {
      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", onLoad, { once: true });
    });

    // Fallback after 5s
    window.setTimeout(() => window.print(), 5000);
  };

  return (
    <button onClick={handlePrint} className="btn-primary">
      Print
    </button>
  );
}
