import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBookRaw from 'react-pageflip';

// Worker de pdf.js servido por Vite.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Los tipos de react-pageflip marcan casi todas las props como requeridas.
const HTMLFlipBook = HTMLFlipBookRaw as unknown as React.FC<Record<string, unknown>>;

// "Ruido de hoja": ráfaga corta de ruido filtrado (sin archivo de audio).
function playPageSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const duration = 0.2;
    const size = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      const env = Math.pow(1 - i / size, 2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1500;
    const gain = ctx.createGain();
    gain.gain.value = 0.3;
    src.connect(hp).connect(gain).connect(ctx.destination);
    src.start();
    src.onended = () => ctx.close();
  } catch {
    /* sin audio, no pasa nada */
  }
}

interface FlipbookProps {
  fileUrl: string;
  title?: string;
  onClose: () => void;
}

const Flipbook: React.FC<FlipbookProps> = ({ fileUrl, title, onClose }) => {
  const [numPages, setNumPages] = useState(0);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState(false);

  // Calcula el tamaño de página a partir del aspecto real del PDF y la pantalla.
  const onFirstPage = (page: { width: number; height: number }) => {
    const aspect = page.width && page.height ? page.width / page.height : 0.72;
    const maxH = Math.min(window.innerHeight - 130, 860);
    // En desktop se muestran 2 páginas: el ancho total no debe pasar la pantalla.
    const maxPageW = (window.innerWidth - 48) / (window.innerWidth >= 768 ? 2 : 1);
    let h = maxH;
    let w = Math.round(h * aspect);
    if (w > maxPageW) {
      w = Math.floor(maxPageW);
      h = Math.round(w / aspect);
    }
    setDims({ w, h });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/95 flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-white">
        <span className="font-semibold text-sm truncate">{title || 'Material de clase'}</span>
        <button
          onClick={onClose}
          className="bg-white/15 hover:bg-white/25 rounded-lg w-9 h-9 flex items-center justify-center text-lg"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={() => setError(true)}
        loading={
          <div className="text-white/80 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            Abriendo el material...
          </div>
        }
        error={<div className="text-white/80">No se pudo abrir el PDF.</div>}
      >
        {/* Página oculta para medir el aspecto real del PDF */}
        {numPages > 0 && !dims && !error && (
          <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
            <Page pageNumber={1} width={300} onLoadSuccess={onFirstPage} renderTextLayer={false} renderAnnotationLayer={false} />
          </div>
        )}

        {numPages > 0 && dims && !error && (
          <HTMLFlipBook
            width={dims.w}
            height={dims.h}
            size="fixed"
            showCover
            mobileScrollSupport
            maxShadowOpacity={0.5}
            onFlip={playPageSound}
            className="shadow-2xl"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="bg-white overflow-hidden">
                <Page
                  pageNumber={i + 1}
                  width={dims.w}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div style={{ width: dims.w, height: dims.h }} className="bg-gray-100" />}
                />
              </div>
            ))}
          </HTMLFlipBook>
        )}
      </Document>

      {numPages > 0 && (
        <p className="absolute bottom-3 text-white/60 text-xs">
          {numPages} páginas · arrastrá o clickeá el borde para pasar la hoja
        </p>
      )}
    </div>
  );
};

export default Flipbook;
