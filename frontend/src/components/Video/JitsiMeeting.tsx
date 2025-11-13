import React, { useEffect, useRef, useState } from 'react';

interface JitsiMeetProps {
  roomName: string;
  displayName: string;
  email?: string;
  password?: string;
  onMeetingEnd?: () => void;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participant: any) => void;
  config?: any;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const JitsiMeeting: React.FC<JitsiMeetProps> = ({
  roomName,
  displayName,
  email,
  password,
  onMeetingEnd,
  onParticipantJoined,
  onParticipantLeft,
  config = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Cargar el script de Jitsi Meet
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://8x8.vc/vpaas-magic-cookie-23d06a47f90b429ba2e2b7bccfaef6bd/external_api.js';
        script.async = true;
        script.onload = () => resolve(window.JitsiMeetExternalAPI);
        script.onerror = () => reject(new Error('Failed to load Jitsi Meet API'));
        document.body.appendChild(script);
      });
    };

    // Inicializar Jitsi Meet
    const initializeJitsi = async () => {
      try {
        await loadJitsiScript();
        setIsLoading(false);

        if (!containerRef.current) return;

        const domain = '8x8.vc';
        const options = {
          roomName: `vpaas-magic-cookie-23d06a47f90b429ba2e2b7bccfaef6bd/${roomName}`,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: {
            email: email || '',
            displayName: displayName
          },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false,
            disableInviteFunctions: false,
            ...config
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'profile',
              'chat',
              'recording',
              'livestreaming',
              'etherpad',
              'sharedvideo',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'feedback',
              'stats',
              'shortcuts',
              'tileview',
              'videobackgroundblur',
              'download',
              'help',
              'mute-everyone'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participante'
          }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        setJitsiApi(api);

        // Event listeners
        api.addEventListener('videoConferenceJoined', () => {
          console.log('📹 Usuario se unió a la videollamada');
        });

        api.addEventListener('videoConferenceLeft', () => {
          console.log('👋 Usuario salió de la videollamada');
          if (onMeetingEnd) onMeetingEnd();
        });

        api.addEventListener('participantJoined', (participant: any) => {
          console.log('👤 Nuevo participante:', participant);
          if (onParticipantJoined) onParticipantJoined(participant);
        });

        api.addEventListener('participantLeft', (participant: any) => {
          console.log('👤 Participante salió:', participant);
          if (onParticipantLeft) onParticipantLeft(participant);
        });

        // Si hay contraseña, establecerla
        if (password) {
          api.executeCommand('password', password);
        }

      } catch (err: any) {
        console.error('Error al inicializar Jitsi:', err);
        setError('Error al cargar la videollamada');
        setIsLoading(false);
      }
    };

    initializeJitsi();

    // Cleanup
    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
      }
    };
  }, [roomName, displayName, email, password]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-red-800 mb-2">Error al cargar la videollamada</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-800 font-medium">Cargando videollamada...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
};

export default JitsiMeeting;
