import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

interface CertData {
  eligible: boolean;
  reason?: string;
  studentName?: string;
  courseName?: string;
  instructor?: string | null;
  date?: string;
  firma_url?: string | null;
  firmante?: string | null;
  firma2_url?: string | null;
  firmante2?: string | null;
}

const Signature: React.FC<{ url?: string | null; name?: string | null }> = ({ url, name }) => {
  if (!name && !url) return null;
  return (
    <div className="text-center px-4">
      <div className="h-14 flex items-end justify-center">
        {url ? <img src={url} alt="Firma" className="max-h-14 object-contain" /> : null}
      </div>
      <div className="border-t border-gray-400 pt-1 mt-1 min-w-[160px]">
        <p className="text-sm font-medium text-gray-800">{name}</p>
      </div>
    </div>
  );
};

const Certificate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${id}/certificate`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ eligible: false, reason: 'No se pudo cargar el certificado.' }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-b-4 border-blue-600 rounded-full" /></div>;
  }

  if (!data?.eligible) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-gray-900">Todavía no está disponible</h1>
        <p className="text-gray-500 max-w-sm">{data?.reason || 'Completá el curso para obtener tu certificado.'}</p>
        <Link to={`/course/${id}/aula`} className="text-blue-600 font-medium hover:underline">← Volver al curso</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 flex flex-col items-center">
      {/* Acciones (no se imprimen) */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 print:hidden">
        <Link to={`/course/${id}/aula`} className="text-gray-600 hover:text-gray-900 text-sm">← Volver al curso</Link>
        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow">
          🖨️ Descargar / Imprimir
        </button>
      </div>

      {/* Certificado */}
      <div className="w-full max-w-4xl bg-white shadow-2xl print:shadow-none" id="cert">
        <div className="border-[10px] border-double border-blue-900 m-3 p-8 sm:p-12 text-center relative">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="ESF" className="h-16 w-16 rounded-xl" />
          </div>
          <p className="text-emerald-700 font-semibold tracking-widest uppercase text-sm">Escuela Superior de Formación</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-900 mt-4 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Certificado de Finalización
          </h1>
          <p className="text-gray-500">Se otorga el presente certificado a</p>

          <p className="text-3xl sm:text-4xl font-bold text-gray-900 my-5" style={{ fontFamily: 'Georgia, serif' }}>
            {data.studentName}
          </p>

          <p className="text-gray-600 max-w-xl mx-auto">
            por haber completado satisfactoriamente el curso
          </p>
          <p className="text-xl font-bold text-gray-800 mt-1 mb-6">“{data.courseName}”</p>

          <p className="text-sm text-gray-500">Emitido el {data.date}</p>

          {/* Firmas */}
          <div className="flex flex-wrap justify-center gap-10 mt-10">
            <Signature url={data.firma_url} name={data.firmante} />
            <Signature url={data.firma2_url} name={data.firmante2} />
            {!data.firmante && !data.firmante2 && data.instructor && (
              <Signature name={data.instructor} />
            )}
          </div>
        </div>
      </div>

      <style>{`@media print { body { background: white; } @page { size: landscape; margin: 0; } }`}</style>
    </div>
  );
};

export default Certificate;
