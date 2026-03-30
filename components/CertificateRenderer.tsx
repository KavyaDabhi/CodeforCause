"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { jsPDF } from "jspdf"; // 🚀 Added jsPDF

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface CertConfig {
  userName: string;
  eventTitle: string;
  templateUrl: string;
  nameX?: number;   // 0-100 percent
  nameY?: number;   // 0-100 percent
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  certHash?: string;
  id?: string;
  issueDate?: string;
}

type RenderStatus = "idle" | "loading" | "ready" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Font loading utility
// ─────────────────────────────────────────────────────────────────────────────
async function ensureFontLoaded(
  family: string,
  weight = "bold",
  size = 48,
  timeoutMs = 6000
): Promise<boolean> {
  const descriptor = `${weight} ${size}px "${family}"`;

  const raceResult = await Promise.race([
    document.fonts.load(descriptor).then(() => "loaded"),
    new Promise<string>((res) => setTimeout(() => res("timeout"), timeoutMs)),
  ]);
  
  if (raceResult === "loaded") {
    const isReady = document.fonts.check(descriptor);
    if (isReady) return true;
  }

  try {
    const googleUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family
    ).replace(/%20/g, "+")}&display=swap`;
    
    if (!document.querySelector(`link[data-font="${family}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = googleUrl;
      link.setAttribute("data-font", family);
      document.head.appendChild(link);
    }
    
    await Promise.race([
      new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (document.fonts.check(descriptor)) {
            clearInterval(interval);
            resolve();
          }
        }, 80);
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("font timeout")), timeoutMs)
      ),
    ]);
    return true;
  } catch {
    console.warn(`[CertRenderer] Font "${family}" did not load in time — using fallback.`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Image loading utility
// ─────────────────────────────────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Core render function
// ─────────────────────────────────────────────────────────────────────────────
function renderCertToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  config: CertConfig
) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);

  const family = config.fontFamily || "Playfair Display";
  const size = config.fontSize || 48;
  const color = config.fontColor || "#ffffff";
  const x = ((config.nameX ?? 50) / 100) * img.naturalWidth;
  const y = ((config.nameY ?? 50) / 100) * img.naturalHeight;

  ctx.font = `bold ${size}px "${family}", "Georgia", serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  ctx.fillText(config.userName || "Recipient", x, y);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useCertReady
// ─────────────────────────────────────────────────────────────────────────────
export function useCertReady(config: CertConfig | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [loadingMessage, setLoadingMessage] = useState("Preparing certificate…");
  const loadedImgRef = useRef<HTMLImageElement | null>(null);
  const loadedFontRef = useRef<boolean>(false);

  const render = useCallback(async () => {
    if (!config?.templateUrl) { setStatus("error"); return; }
    setStatus("loading");

    try {
      setLoadingMessage("Loading template…");
      const img = await loadImage(config.templateUrl);
      loadedImgRef.current = img;

      setLoadingMessage(`Loading font: ${config.fontFamily || "Playfair Display"}…`);
      const fontOk = await ensureFontLoaded(config.fontFamily || "Playfair Display", "bold", config.fontSize || 48);
      loadedFontRef.current = fontOk;

      setLoadingMessage("Compositing certificate…");
      const canvas = canvasRef.current;
      if (!canvas) { setStatus("error"); return; }
      renderCertToCanvas(canvas, img, config);

      setStatus("ready");
    } catch (err) {
      console.error("[CertRenderer] Render failed:", err);
      setStatus("error");
    }
  }, [config]);

  useEffect(() => {
    if (config) {
      loadedImgRef.current = null;
      loadedFontRef.current = false;
      setStatus("idle");
      render();
    }
  }, [config, render]);

  // 🚀 PDF DOWNLOAD LOGIC
  const download = useCallback(async () => {
    if (!config) return;

    let canvas = document.createElement("canvas");
    let img = loadedImgRef.current;

    if (!img) {
      img = await loadImage(config.templateUrl);
    }
    const family = config.fontFamily || "Playfair Display";
    if (!loadedFontRef.current) {
      await ensureFontLoaded(family, "bold", config.fontSize || 48);
    }

    renderCertToCanvas(canvas, img, config);

    // Convert Canvas to perfectly scaled PDF
    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    
    const fileName = `${config.userName}_${config.eventTitle}.pdf`
      .replace(/[^a-z0-9_.-]/gi, "_")
      .toLowerCase();
      
    pdf.save(fileName);
  }, [config]);

  return { canvasRef, status, loadingMessage, download };
}

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) { document.body.style.overflow = ""; return; }
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [active]);
}

// ─────────────────────────────────────────────────────────────────────────────
// CertificatePreview modal
// ─────────────────────────────────────────────────────────────────────────────
export function CertificatePreview({
  cert,
  onClose,
}: {
  cert: CertConfig & { id?: string; issueDate?: string; eventTitle: string };
  onClose: () => void;
}) {
  const { canvasRef, status, loadingMessage, download } = useCertReady(cert);
  const [downloading, setDownloading] = useState(false);

  useScrollLock(true);

  const handleDownload = async () => {
    setDownloading(true);
    await download();
    setDownloading(false);
  };

  const hash = (cert.certHash || cert.id || "").slice(0, 16);

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/98 backdrop-blur-md p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-4xl flex flex-col cert-reveal" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#0a0d14] border border-[#50fa7b]/20 border-b-0 rounded-t-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: status === "ready" ? "#50fa7b" : status === "error" ? "#ff5555" : "#ffb86c",
                animation: status === "loading" ? "shimmer 1.8s ease-in-out infinite" : "none",
              }}
            />
            <span className="text-[#50fa7b] text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate">
              {status === "loading" ? "Loading_Certificate…" : status === "error" ? "Render_Failed" : "Certificate_Preview"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            {hash && <span className="text-[8px] text-gray-600 uppercase tracking-widest hidden md:block">HASH: {hash}…</span>}
            <button onClick={onClose} className="touch-target text-gray-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded text-sm font-bold">✕</button>
          </div>
        </div>

        <div className="bg-[#050608] border border-[#50fa7b]/20 border-y-0 relative overflow-hidden">
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#050608] z-10 min-h-[180px]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#50fa7b] rounded-full" style={{ animation: "progressPulse 1.4s ease-in-out infinite" }} />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-5 h-5 border-2 border-[#50fa7b]/30 border-t-[#50fa7b] rounded-full animate-spin" />
                  <span className="text-[#50fa7b] text-[9px] uppercase tracking-widest">{loadingMessage}</span>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center justify-center py-16 min-h-[180px]">
              <div className="text-center">
                <p className="text-[#ff5555] text-[10px] uppercase tracking-widest mb-2">[ RENDER_FAILED ]</p>
                <p className="text-gray-600 text-[9px]">Template image could not be loaded.</p>
              </div>
            </div>
          )}

          {/* 🚀 ONLY renders visible when status === "ready" */}
          <canvas
            ref={canvasRef}
            className="w-full h-auto block"
            style={{
              maxHeight: "55vh",
              objectFit: "contain",
              opacity: status === "ready" ? 1 : 0,
              transition: "opacity 0.4s ease",
              minHeight: status !== "error" ? "180px" : 0,
            }}
          />
        </div>

        <div className="bg-[#0a0d14] border border-[#50fa7b]/20 border-t-0 rounded-b-2xl px-4 py-3 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-white font-black uppercase tracking-wider text-xs sm:text-sm truncate">{cert.eventTitle}</p>
            <p className="text-gray-500 text-[9px] uppercase tracking-widest mt-0.5 truncate">
              Issued to {cert.userName} {cert.issueDate ? ` · ${cert.issueDate}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full xs:w-auto">
            <button onClick={onClose} className="touch-target flex-1 xs:flex-none text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-gray-400 border border-white/10 px-3 sm:px-4 py-2.5 rounded-lg hover:border-white/20 hover:text-white transition-all text-center">Close</button>
            <button
              onClick={handleDownload}
              disabled={status !== "ready" || downloading}
              className="touch-target flex-1 xs:flex-none text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-black bg-[#50fa7b] px-3 sm:px-5 py-2.5 rounded-lg hover:shadow-[0_0_20px_rgba(80,250,123,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {downloading ? <><span className="w-2 h-2 rounded-full bg-black animate-pulse inline-block" /> Generating PDF…</> : status !== "ready" ? <><span className="w-2 h-2 rounded-full bg-black/40 animate-pulse inline-block" /> Loading…</> : <>↓ Save PDF</>}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes progressPulse {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

export function CertificateCardDownloadButton({ cert }: { cert: CertConfig & { id: string } }) {
  const [downloading, setDownloading] = useState(false);
  const [config, setConfig] = useState<CertConfig | null>(null);
  const { download: doDownload, status: dlStatus } = useCertReady(config);

  const handleClick = async () => {
    if (downloading) return;
    setDownloading(true);
    setConfig(cert);
    
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (dlStatus === "ready" || dlStatus === "error") {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(interval); resolve(); }, 15000);
    });
    
    await doDownload();
    setDownloading(false);
    setConfig(null);
  };

  return (
    <button onClick={handleClick} disabled={downloading} className="touch-target text-[9px] uppercase font-bold tracking-widest text-black bg-[#50fa7b] px-3 py-2 rounded-lg hover:shadow-[0_0_12px_rgba(80,250,123,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
      {downloading ? <span className="w-2 h-2 rounded-full bg-black animate-pulse" /> : <>↓ Save PDF</>}
    </button>
  );
}