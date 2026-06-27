import React, { useEffect, useRef, useState } from 'react';
import socketService from '../../services/socket';
import { fetchJSON } from '../../lib/fetchJSON';

interface ChatMessage {
  id: number;
  message: string;
  userId: number;
  userName: string;
  timestamp: string;
}

interface CourseChatProps {
  courseId: number;
  userId: number;
  userName: string;
}

const hora = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const CourseChat: React.FC<CourseChatProps> = ({ courseId, userId, userName }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState<{ userId: number; userName: string }[]>([]);
  const [connected, setConnected] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const token = localStorage.getItem('token') || undefined;
    socketService.connect(token);
    socketService.joinCourse(courseId, { userId, userName });
    fetchJSON<ChatMessage[]>(`/api/courses/${courseId}/messages`)
      .then((m) => setMessages(Array.isArray(m) ? m : []))
      .catch(() => {});

    const handler = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!openRef.current) setUnread((u) => u + 1);
    };
    socketService.onNewMessage(handler);
    socketService.onPresence((p) => setOnline(p.users || []));
    socketService.onConnectionChange(setConnected);
    return () => {
      socketService.offNewMessage();
      socketService.offPresence();
      socketService.offConnectionChange();
    };
  }, [courseId, userId, userName]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    }
  }, [messages, open]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    socketService.sendMessage(courseId, t, userId, userName);
    setText('');
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full h-14 px-5 shadow-xl flex items-center gap-2 font-semibold"
        aria-label="Chat del curso"
      >
        <span className="text-2xl leading-none">{open ? '✕' : '💬'}</span>
        {!open && <span className="hidden sm:inline">Chat</span>}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-80 max-w-[90vw] h-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Chat del curso</p>
              {connected ? (
                <span className="flex items-center gap-1 text-xs text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  {online.length} en línea
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                  Conectando…
                </span>
              )}
            </div>
            <p className="text-blue-200 text-xs truncate">
              {connected && online.length > 0 ? online.map((u) => u.userName).join(', ') : 'Consultá y charlá con profe y compañeros'}
            </p>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-8">Todavía no hay mensajes. ¡Arrancá vos! 👋</p>
            ) : (
              messages.map((m) => {
                const mine = m.userId === userId;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      {!mine && <p className="text-[11px] font-semibold text-blue-600 mb-0.5">{m.userName}</p>}
                      <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                      <p className={`text-[10px] mt-0.5 ${mine ? 'text-blue-200' : 'text-gray-400'}`}>{hora(m.timestamp)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-gray-100 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={connected ? 'Escribí un mensaje...' : 'Conectando con el chat…'}
              maxLength={1000}
              disabled={!connected}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 disabled:bg-gray-50"
            />
            <button
              onClick={send}
              disabled={!text.trim() || !connected}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-3 font-medium"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CourseChat;
