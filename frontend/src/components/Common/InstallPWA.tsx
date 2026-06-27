import React, { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

// Botón "Instalar app". Solo aparece cuando el navegador lo permite
// (Chrome/Edge en desktop y Android, app no instalada todavía).
const InstallPWA: React.FC = () => {
  const [evt, setEvt] = useState<BIPEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setEvt(null));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!evt) return null;

  return (
    <button
      onClick={async () => {
        await evt.prompt();
        await evt.userChoice;
        setEvt(null);
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
      title="Instalar la app en tu dispositivo"
    >
      📲 <span className="hidden sm:inline">Instalar app</span>
    </button>
  );
};

export default InstallPWA;
