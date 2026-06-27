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
  const [mode, setMode] = useState<'book' | 'read'>('read');
  const [zoom, setZoom] = useState(1);

  // Calcula el tamaño de página a partir del aspecto real del PDF y la pantalla.
  const onFirstPage = (page: { width: number; height: number }) => {
    const aspect = page.width && page.height ? page.width / page.height : 0.72;
    const maxH = Math.min(window.innerHeight - 130, 860);
    const maxPageW = (window.innerWidth - 48) / (window.innerWidth >= 768 ? 2 : 1);
    let h = maxH;
    let w = Math.round(h * aspect);
    if (w > maxPageW) {
      w = Math.floor(maxPageW);
      h = Math.round(w / aspect);
    }
    setDims({ w, h });
  };

  // Ancho base para el modo lectura (una sola columna, más grande).
  const readBase = Math.min(window.innerWidth - 24, 820);
  const readWidth = Math.round(readBase * zoom);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/95 flex flex-col">
      {/* Barra de herramientas */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-950/80 text-white shrink-0">
        <span className="font-semibold text-sm truncate flex-1">{title || 'Material de clase'}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode((m) => (m === 'book' ? 'read' : 'book'))}
            className="bg-white/10 hover:bg-white/20 rounded-lg px-3 h-9 text-sm font-medium"
            title="Cambiar vista"
          >
            {mode === 'book' ? '📜 Lectura' : '📖 Librito'}
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} className="bg-white/10 hover:bg-white/20 rounded-lg w-9 h-9 text-lg" title="Alejar">−</button>
          <span className="text-xs w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))} className="bg-white/10 hover:bg-white/20 rounded-lg w-9 h-9 text-lg" title="Acercar">+</button>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 rounded-lg w-9 h-9 text-lg ml-1" aria-label="Cerrar">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex justify-center p-2 sm:p-4">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setError(true)}
          loading={
            <div className="text-white/80 flex flex-col items-center gap-3 mt-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
              Abriendo el material...
            </div>
          }
          error={<div className="text-white/80 mt-16">No se pudo abrir el PDF.</div>}
        >
          {/* Página oculta para medir el aspecto real del PDF (modo librito) */}
          {numPages > 0 && !dims && !error && (
            <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
              <Page pageNumber={1} width={300} onLoadSuccess={onFirstPage} renderTextLayer={false} renderAnnotationLayer={false} />
            </div>
          )}

          {/* Modo LECTURA: páginas apiladas, grandes y con zoom */}
          {numPages > 0 && !error && mode === 'read' && (
            <div className="flex flex-col items-center gap-4 my-auto">
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} className="bg-white shadow-2xl rounded overflow-hidden">
                  <Page pageNumber={i + 1} width={readWidth} renderTextLayer={false} renderAnnotationLayer={false}
                    loading={<div style={{ width: readWidth, height: readWidth * 1.3 }} className="bg-gray-100" />} />
                </div>
              ))}
            </div>
          )}

          {/* Modo LIBRITO: efecto de pasar hoja */}
          {numPages > 0 && dims && !error && mode === 'book' && (
            <div className="m-auto">
              <HTMLFlipBook
                width={Math.round(dims.w * zoom)}
                height={Math.round(dims.h * zoom)}
                size="fixed"
                showCover
                mobileScrollSupport
                maxShadowOpacity={0.5}
                onFlip={playPageSound}
                className="shadow-2xl"
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i} className="bg-white overflow-hidden">
                    <Page pageNumber={i + 1} width={Math.round(dims.w * zoom)} renderTextLayer={false} renderAnnotationLayer={false}
                      loading={<div style={{ width: Math.round(dims.w * zoom), height: Math.round(dims.h * zoom) }} className="bg-gray-100" />} />
                  </div>
                ))}
              </HTMLFlipBook>
            </div>
          )}
        </Document>
      </div>

      {numPages > 0 && (
        <p className="text-center text-white/50 text-xs py-1.5 shrink-0">
          {numPages} páginas · {mode === 'book' ? 'arrastrá el borde para pasar la hoja' : 'deslizá para leer'} · usá + / − para el zoom
        </p>
      )}
    </div>
  );
};

export default Flipbook;
