// lib/downloadCertificate.ts
import { jsPDF } from "jspdf";

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

  // 1. Load font properly into canvas context
  await loadFontForCanvas(fontFamily, cert.fontSize);

  // 2. Load the template image
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

  // 4. Cert hash stamp
  ctx.save();
  ctx.font = `normal 11px monospace`;
  ctx.fillStyle = "rgba(120,120,120,0.6)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(`CERT#${cert.certHash} · ${cert.issueDate}`, canvas.width - 20, canvas.height - 14);
  ctx.restore();

  // 5. Export as PDF
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
// THE ACTUAL FIX:
// Fetch Google Fonts CSS → parse woff2 URL → load via FontFace API →
// document.fonts.add(). This is the ONLY method Canvas actually respects.
// ─────────────────────────────────────────────────────────────────────────────
async function loadFontForCanvas(fontFamily: string, fontSize: number): Promise<void> {
  const genericFonts = ["monospace", "sans-serif", "serif", "cursive", "fantasy"];
  if (genericFonts.includes(fontFamily.toLowerCase())) return;

  const fontSpec = `normal ${fontSize}px "${fontFamily}"`;
  if (document.fonts.check(fontSpec)) return; // already loaded

  try {
    // Request CSS from Google Fonts — browser sends correct UA so we get woff2
    const apiUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}&display=swap`;
    const response = await fetch(apiUrl);
    const css = await response.text();

    // Extract ALL font file URLs from @font-face blocks
    const urlMatches = [...css.matchAll(/url\((['"]?)([^)'"]+\.(?:woff2?|ttf|otf))\1\)/gi)];

    if (urlMatches.length === 0) throw new Error("No font URLs in CSS");

    const fontUrl = urlMatches[0][2];

    // Load font binary and register with FontFace API
    const face = new FontFace(fontFamily, `url(${fontUrl})`, {
      style: "normal",
      weight: "400",
    });

    const loaded = await face.load();
    document.fonts.add(loaded);
    await document.fonts.load(fontSpec);

  } catch (err) {
    console.warn(`[CertFont] Primary method failed for "${fontFamily}":`, err);
    await loadFontViaArrayBuffer(fontFamily, fontSize);
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

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK: fetch font as ArrayBuffer directly
// ─────────────────────────────────────────────────────────────────────────────
async function loadFontViaArrayBuffer(fontFamily: string, fontSize: number): Promise<void> {
  // Try common gstatic URL patterns
  const slug = fontFamily.replace(/\s+/g, "").toLowerCase();
  const urls = [
    `https://fonts.gstatic.com/s/${slug}/v1/${fontFamily.replace(/\s+/g, "")}-Regular.ttf`,
    `https://fonts.gstatic.com/s/${slug}/v2/${fontFamily.replace(/\s+/g, "")}-Regular.ttf`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      const face = new FontFace(fontFamily, buffer, { style: "normal", weight: "400" });
      const loaded = await face.load();
      document.fonts.add(loaded);
      await document.fonts.load(`normal ${fontSize}px "${fontFamily}"`);
      return;
    } catch {
      continue;
    }
  }

  // Absolute last resort: CSS link tag
  await injectLinkFallback(fontFamily, fontSize);
}

// ─────────────────────────────────────────────────────────────────────────────
// LAST RESORT: <link> tag (may not work for canvas but better than crashing)
// ─────────────────────────────────────────────────────────────────────────────
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
  try {
    await document.fonts.load(`normal ${fontSize}px "${fontFamily}"`);
  } catch { /* ignore */ }
  await delay(500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Image loader with CORS fallback
// ─────────────────────────────────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = reject;
      fallback.src = src;
    };
    img.src = src;
  });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));