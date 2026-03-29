// lib/downloadCertificate.ts
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const BASE_URL = "https://cfc-charusat.vercel.app";

export async function downloadCertificate(cert: {
  userName: string;
  eventTitle: string;
  templateUrl: string;
  nameX: number;
  nameY: number;
  fontSize: number;
  fontColor: string;
  fontFamily?: string;
  certHash: string;
  issueDate: string;
}) {
  const fontFamily = cert.fontFamily?.trim() || "monospace";

  // 1. Load font
  await loadFontForCanvas(fontFamily, cert.fontSize);

  // 2. Load template image
  const img = await loadImage(cert.templateUrl);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // 3. Draw participant name
  const x = (cert.nameX / 100) * canvas.width;
  const y = (cert.nameY / 100) * canvas.height;

  ctx.save();
  ctx.font = `normal ${cert.fontSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = cert.fontColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  ctx.fillText(cert.userName, x, y);
  ctx.restore();

  // 4. Cert hash text stamp (bottom-left)
  ctx.save();
  ctx.font = `normal 11px monospace`;
  ctx.fillStyle = "rgba(120,120,120,0.6)";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(`CERT#${cert.certHash} · ${cert.issueDate}`, 20, canvas.height - 14);
  ctx.restore();

  // 5. Generate & stamp QR code (bottom-right corner)
  await stampQRCode(ctx, canvas.width, canvas.height, cert.certHash);

  // 6. Export as PDF
  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  const orientation = canvas.width > canvas.height ? "landscape" : "portrait";

  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
  pdf.save(
    `CFC_Certificate_${cert.eventTitle.replace(/\s+/g, "_")}_${cert.userName.replace(/\s+/g, "_")}.pdf`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR Code stamper — bottom-right corner, subtle with white bg padding
// ─────────────────────────────────────────────────────────────────────────────
async function stampQRCode(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  certHash: string
): Promise<void> {
  const verifyUrl = `${BASE_URL}/verify/${certHash}`;

  // QR size: ~8% of the shorter dimension, min 80px
  const qrSize = Math.max(80, Math.round(Math.min(canvasWidth, canvasHeight) * 0.08));
  const margin = 18;        // gap from edges
  const padding = 6;        // white border around QR

  // Generate QR as a data URL
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: qrSize,
    margin: 1,
    color: {
      dark: "#1a1a2e",   // deep navy dots
      light: "#ffffff",  // white background
    },
    errorCorrectionLevel: "H",
  });

  const qrImg = await loadImage(qrDataUrl);

  // Position: bottom-right
  const x = canvasWidth - qrSize - margin - padding * 2;
  const y = canvasHeight - qrSize - margin - padding * 2;
  const totalSize = qrSize + padding * 2;

  // White rounded background box
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, totalSize, totalSize, 6);
  ctx.fill();
  ctx.restore();

  // Draw QR image inside the white box
  ctx.drawImage(qrImg, x + padding, y + padding, qrSize, qrSize);

  // Tiny "VERIFY" label below the QR
  ctx.save();
  ctx.font = `bold ${Math.max(8, Math.round(qrSize * 0.12))}px monospace`;
  ctx.fillStyle = "rgba(100,100,120,0.7)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("SCAN TO VERIFY", x + totalSize / 2, y + totalSize + 4);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: rounded rect (for QR background box)
// ─────────────────────────────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────────────────────
// Font loader — FontFace API (only method Canvas respects)
// ─────────────────────────────────────────────────────────────────────────────
async function loadFontForCanvas(fontFamily: string, fontSize: number): Promise<void> {
  const genericFonts = ["monospace", "sans-serif", "serif", "cursive", "fantasy"];
  if (genericFonts.includes(fontFamily.toLowerCase())) return;

  const fontSpec = `normal ${fontSize}px "${fontFamily}"`;
  if (document.fonts.check(fontSpec)) return;

  try {
    const apiUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}&display=swap`;
    const response = await fetch(apiUrl);
    const css = await response.text();
    const urlMatches = [...css.matchAll(/url\((['"]?)([^)'"]+\.(?:woff2?|ttf|otf))\1\)/gi)];
    if (urlMatches.length === 0) throw new Error("No font URLs in CSS");

    const fontUrl = urlMatches[0][2];
    const face = new FontFace(fontFamily, `url(${fontUrl})`, { style: "normal", weight: "400" });
    const loaded = await face.load();
    document.fonts.add(loaded);
    await document.fonts.load(fontSpec);
  } catch (err) {
    console.warn(`[CertFont] Failed for "${fontFamily}":`, err);
    await injectLinkFallback(fontFamily, fontSize);
  }

  // Canvas GPU warm-up
  const tmp = document.createElement("canvas");
  const tmpCtx = tmp.getContext("2d");
  if (tmpCtx) {
    tmpCtx.font = `normal ${fontSize}px "${fontFamily}"`;
    tmpCtx.fillStyle = "rgba(0,0,0,0)";
    tmpCtx.fillText("warmup", 0, fontSize);
  }
  await delay(150);
}

async function injectLinkFallback(fontFamily: string, fontSize: number): Promise<void> {
  const id = `gfont-${fontFamily.replace(/\s+/g, "-")}`;
  if (!document.getElementById(id)) {
    await new Promise<void>((resolve) => {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}&display=swap`;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
  }
  try { await document.fonts.load(`normal ${fontSize}px "${fontFamily}"`); } catch { }
  await delay(400);
}

// ─────────────────────────────────────────────────────────────────────────────
// Image loader with CORS fallback
// ─────────────────────────────────────────────────────────────────────────────
// ── Mobile-Proof Font Loader ────────────────────────────
async function forceFontLoad(fontFamily: string): Promise<void> {
  const genericFonts = ["monospace", "sans-serif", "serif", "cursive"];
  if (genericFonts.includes(fontFamily.toLowerCase())) return;

  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}&display=swap`;
    // We add a timestamp to the fetch to prevent Mobile Safari from using a broken cached version
    const response = await fetch(`${cssUrl}&t=${Date.now()}`); 
    const css = await response.text();

    const match = css.match(/url\((https:\/\/[^)]+)\)/);
    if (!match) throw new Error("Font URL not found");
    
    const fontUrl = match[1].replace(/['"]/g, ''); 

    const font = new FontFace(fontFamily, `url(${fontUrl})`);
    const loadedFont = await font.load();
    document.fonts.add(loadedFont);

    // Mobile GPUs need a bit more time to "wake up" the font
    await new Promise(r => setTimeout(r, 200));
    
  } catch (error) {
    console.error("Mobile font load failed:", error);
  }
}

// ── Mobile-Proof Image Loader ────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // 🚀 THE MOBILE FIX: Force anonymous cross-origin BEFORE setting src
    img.crossOrigin = "anonymous"; 
    
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If it fails, try one more time without the cross-origin flag (fallback)
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = reject;
      fallback.src = src;
    };

    // 🚀 THE CACHE FIX: Add a random string to the end of the URL 
    // This trick prevents mobile browsers from loading a "cached" version of the image without CORS
    const connector = src.includes('?') ? '&' : '?';
    img.src = `${src}${connector}nocache=${Date.now()}`;
  });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));