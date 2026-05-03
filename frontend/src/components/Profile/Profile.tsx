import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface UserData {
  id: number;
  nombre: string;
  email: string;
  tipo: string;
  telefono?: string | null;
  biografia?: string | null;
  avatar?: string | null;
  created_at?: string;
}

const Profile: React.FC = () => {
  const { usuario, actualizarUsuario } = useAuth();
  const [data, setData] = useState<UserData | null>(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', biografia: '' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setForm({ nombre: d.nombre || '', telefono: d.telefono || '', biografia: d.biografia || '' });
      })
      .catch(() => {});
  }, []);

  const refreshLocal = (patch: Partial<UserData>) => {
    setData((prev) => (prev ? { ...prev, ...patch } : prev));
    if (usuario) actualizarUsuario({ ...usuario, ...patch } as any);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const r = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      setProfileMsg({ type: 'ok', text: 'Perfil actualizado' });
      refreshLocal(form as any);
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ type: 'err', text: 'Las contraseñas no coinciden' });
      return;
    }
    if (pwd.next.length < 6) {
      setPwdMsg({ type: 'err', text: 'Mínimo 6 caracteres' });
      return;
    }
    setSavingPwd(true);
    try {
      const r = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      setPwdMsg({ type: 'ok', text: 'Contraseña actualizada' });
      setPwd({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setPwdMsg({ type: 'err', text: err.message });
    } finally {
      setSavingPwd(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'err', text: 'La imagen no puede pesar más de 5MB' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || 'Error subiendo imagen');

      const r = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: upData.url }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || 'Error guardando avatar');
      }
      refreshLocal({ avatar: upData.url });
      setProfileMsg({ type: 'ok', text: 'Foto actualizada' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  const avatarSrc = data.avatar
    ? (data.avatar.startsWith('http') ? data.avatar : `${import.meta.env.VITE_API_URL || ''}${data.avatar}`)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi perfil</h1>

        <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-semibold border-2 border-gray-200">
                  {data.nombre[0]?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full shadow font-medium disabled:opacity-60"
              >
                {uploadingAvatar ? '...' : 'Cambiar'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{data.nombre}</h2>
              <p className="text-gray-600">{data.email}</p>
              <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">{data.tipo}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos personales</h2>
          {profileMsg && (
            <div className={`text-sm rounded-lg px-3 py-2 mb-4 ${profileMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {profileMsg.text}
            </div>
          )}
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Nombre">
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+54 11 xxxx-xxxx"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </Field>
            <Field label="Biografía">
              <textarea
                value={form.biografia}
                onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                rows={3}
                placeholder="Contanos algo sobre vos"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </Field>
            <button
              type="submit"
              disabled={savingProfile}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-2.5 rounded-lg"
            >
              {savingProfile ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cambiar contraseña</h2>
          {pwdMsg && (
            <div className={`text-sm rounded-lg px-3 py-2 mb-4 ${pwdMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {pwdMsg.text}
            </div>
          )}
          <form onSubmit={changePassword} className="space-y-4">
            <Field label="Contraseña actual">
              <input
                type="password"
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                required
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nueva contraseña">
                <input
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </Field>
              <Field label="Confirmar nueva">
                <input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={savingPwd}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-2.5 rounded-lg"
            >
              {savingPwd ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

export default Profile;
