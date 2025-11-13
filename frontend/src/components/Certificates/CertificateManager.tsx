import React, { useState, useEffect } from 'react';
import {
  getMyCertificates,
  checkEligibility,
  generateCertificate,
  downloadCertificateFile,
  verifyCertificate,
  type Certificate,
  type CertificateEligibility
} from '../../services/certificateService';

interface Props {
  studentView?: boolean;
}

export const CertificateManager: React.FC<Props> = ({ studentView = true }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    if (studentView) {
      loadMyCertificates();
    }
  }, [studentView]);

  const loadMyCertificates = async () => {
    try {
      setLoading(true);
      const data = await getMyCertificates();
      setCertificates(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar certificados');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificate: Certificate) => {
    try {
      setLoading(true);
      await downloadCertificateFile(
        certificate.id,
        `certificado_${certificate.course_title?.replace(/\s+/g, '_')}_${certificate.certificate_code}.pdf`
      );
      setSuccess('¡Certificado descargado!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al descargar certificado');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError('Ingresa un código de certificado');
      return;
    }

    try {
      setLoading(true);
      const result = await verifyCertificate(verificationCode);
      setVerificationResult(result);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al verificar certificado');
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
        <button
          onClick={() => {
            setShowVerification(false);
            setVerificationResult(null);
            setVerificationCode('');
          }}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Volver
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">🔍 Verificar Certificado</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código del Certificado
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
              placeholder="ABC-DEF-123456"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleVerify}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </div>

        {verificationResult && (
          <div className={`p-6 rounded-lg ${
            verificationResult.valid ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'
          }`}>
            {verificationResult.valid ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-800">Certificado Válido</h3>
                    <p className="text-sm text-green-600">Este certificado es auténtico</p>
                  </div>
                </div>

                <div className="space-y-3 bg-white p-4 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-600">Estudiante:</span>
                    <p className="font-semibold text-gray-800">{verificationResult.certificate.user_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Curso:</span>
                    <p className="font-semibold text-gray-800">{verificationResult.certificate.course_title}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Fecha de emisión:</span>
                    <p className="font-semibold text-gray-800">
                      {new Date(verificationResult.certificate.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                  {verificationResult.certificate.completion_percentage && (
                    <div>
                      <span className="text-sm text-gray-600">Porcentaje de finalización:</span>
                      <p className="font-semibold text-gray-800">
                        {verificationResult.certificate.completion_percentage}%
                      </p>
                    </div>
                  )}
                  {verificationResult.certificate.average_grade && (
                    <div>
                      <span className="text-sm text-gray-600">Calificación promedio:</span>
                      <p className="font-semibold text-gray-800">
                        {verificationResult.certificate.average_grade.toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl">✗</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-800">Certificado No Válido</h3>
                    <p className="text-sm text-red-600">{verificationResult.message}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🎓 Mis Certificados</h2>
        <button
          onClick={() => setShowVerification(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Verificar Certificado
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {loading && <p className="text-center text-gray-500">Cargando certificados...</p>}

      {!loading && certificates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📜</div>
          <p className="text-gray-600 text-lg mb-2">No tienes certificados aún</p>
          <p className="text-gray-500 text-sm">
            Completa al 100% un curso para obtener tu certificado
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {certificates.map((certificate) => (
          <div
            key={certificate.id}
            className="border-2 border-blue-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50 hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">🏆</div>
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                Certificado
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {certificate.course_title}
            </h3>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estudiante:</span>
                <span className="font-medium text-gray-800">{certificate.user_name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de emisión:</span>
                <span className="font-medium text-gray-800">
                  {new Date(certificate.issued_at).toLocaleDateString()}
                </span>
              </div>

              {certificate.completion_percentage && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Finalización:</span>
                  <span className="font-medium text-green-600">
                    {certificate.completion_percentage}%
                  </span>
                </div>
              )}

              {certificate.average_grade && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Promedio:</span>
                  <span className="font-medium text-blue-600">
                    {certificate.average_grade.toFixed(1)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-300">
                <span className="text-xs text-gray-500">Código de verificación:</span>
                <p className="font-mono text-sm font-bold text-gray-800">
                  {certificate.certificate_code}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleDownload(certificate)}
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-semibold"
            >
              📥 Descargar PDF
            </button>
          </div>
        ))}
      </div>

      {certificates.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            💡 <strong>Tip:</strong> Puedes verificar la autenticidad de cualquier certificado usando el código
            de verificación en la opción "Verificar Certificado".
          </p>
        </div>
      )}
    </div>
  );
};

export default CertificateManager;
