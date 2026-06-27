import React, { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISS_KEY = 'install_banner_dismissed';

// Banner grande y claro para instalar la app. Aparece abajo cuando el navegador
// lo permite (Chrome/Edge en compu y Android). Se puede ocultar y recuerda la elección.
const InstallBanner: React.FC = () => {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setVisible(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!visible || !evt) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        <img src="/logo.png" alt="ESF" className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base">Instalá la app</p>
          <p className="text-sm text-gray-500">Entrás más rápido, como una app del celular. Es gratis.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={dismiss} className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2">
            Ahora no
          </button>
          <button
            onClick={async () => {
              await evt.prompt();
              await evt.userChoice;
              dismiss();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow"
          >
            📲 Instalar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
