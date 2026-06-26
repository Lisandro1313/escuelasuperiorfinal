import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBookRaw from 'react-pageflip';

// Los tipos de react-pageflip marcan casi todas las props como requeridas;
// lo usamos con una firma permisiva.
const HTMLFlipBook = HTMLFlipBookRaw as unknown as React.FC<Record<string, unknown>>;

// Worker de pdf.js servido por Vite.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

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
      const env = Math.pow(1 - i / size, 2); // decae rápido
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

const PAGE_W = 430;
const PAGE_H = 600;

const Flipbook: React.FC<FlipbookProps> = ({ fileUrl, title, onClose }) => {
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/95 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white">
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
        {numPages > 0 && !error && (
          <HTMLFlipBook
            width={PAGE_W}
            height={PAGE_H}
            size="stretch"
            minWidth={280}
            maxWidth={520}
            minHeight={400}
            maxHeight={720}
            showCover
            mobileScrollSupport
            maxShadowOpacity={0.4}
            onFlip={playPageSound}
            className="shadow-2xl"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="bg-white overflow-hidden">
                <Page
                  pageNumber={i + 1}
                  width={PAGE_W}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div style={{ width: PAGE_W, height: PAGE_H }} className="bg-gray-100" />}
                />
              </div>
            ))}
          </HTMLFlipBook>
        )}
      </Document>

      {numPages > 0 && (
        <p className="absolute bottom-4 text-white/60 text-xs">
          {numPages} páginas · arrastrá o clickeá el borde para pasar la hoja
        </p>
      )}
    </div>
  );
};

export default Flipbook;
