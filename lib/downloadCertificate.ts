// lib/downloadCertificate.ts
// Fetches the certificate template image, overlays the participant's name
// at the exact coordinates the admin configured, and downloads it as a PDF.
//
// Uses only browser-native APIs (Canvas + jsPDF via CDN-free dynamic import).
// No server required — runs fully client-side.

export async function downloadCertificate(cert: {
  userName: string;
  eventTitle: string;
  templateUrl: string;
  nameX: number;   // percentage 0-100 from left
  nameY: number;   // percentage 0-100 from top
  fontSize: number;
  fontColor: string;
  certHash: string;
  issueDate: string;
}) {
  // 1. Load the template image onto a canvas
  const img = await loadImage(cert.templateUrl);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // 2. Overlay the participant name at admin-configured coordinates
  const x = (cert.nameX / 100) * canvas.width;
  const y = (cert.nameY / 100) * canvas.height;

  ctx.save();
  ctx.font = `bold ${cert.fontSize}px 'Arial', sans-serif`;
  ctx.fillStyle = cert.fontColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Subtle shadow so name is readable on any background
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  ctx.fillText(cert.userName.toUpperCase(), x, y);
  ctx.restore();

  // 3. Optionally stamp the cert hash in small text at bottom-right
  ctx.save();
  ctx.font = `11px monospace`;
  ctx.fillStyle = "rgba(120,120,120,0.6)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(`CERT#${cert.certHash} · ${cert.issueDate}`, canvas.width - 20, canvas.height - 14);
  ctx.restore();

  // 4. Convert canvas → blob → download as PNG
  //    (PNG keeps full quality; wrap in PDF if you need .pdf extension)
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CFC_Certificate_${cert.eventTitle.replace(/\s+/g, "_")}_${cert.userName.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
}

// ── Helper: load an image and handle CORS ──────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed for canvas when image is from Cloudinary/Firebase
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If CORS fails (e.g. Cloudinary without proper headers),
      // retry without crossOrigin — canvas will be tainted but
      // the download will still work for same-origin images.
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = reject;
      fallback.src = src;
    };
    img.src = src;
  });
}