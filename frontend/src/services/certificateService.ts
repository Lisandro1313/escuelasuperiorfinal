import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Certificate {
  id: number;
  user_id: number;
  course_id: number;
  certificate_code: string;
  issued_at: string;
  pdf_path?: string;
  user_name?: string;
  course_title?: string;
  completion_percentage?: number;
  average_grade?: number;
}

export interface CertificateEligibility {
  eligible: boolean;
  completion_percentage: number;
  message: string;
  missing_requirements?: string[];
}

/**
 * Verificar si soy elegible para recibir un certificado
 */
export const checkEligibility = async (
  courseId: number
): Promise<CertificateEligibility> => {
  const response = await axios.get(
    `${API_URL}/certificates/eligibility/${courseId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Generar un certificado (automático al completar 100%)
 */
export const generateCertificate = async (
  courseId: number
): Promise<Certificate> => {
  const response = await axios.post(
    `${API_URL}/certificates/generate`,
    { course_id: courseId },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Obtener mis certificados
 */
export const getMyCertificates = async (): Promise<Certificate[]> => {
  const response = await axios.get(`${API_URL}/certificates/my-certificates`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Descargar un certificado en PDF
 */
export const downloadCertificate = async (certificateId: number): Promise<Blob> => {
  const response = await axios.get(
    `${API_URL}/certificates/${certificateId}/download`,
    {
      headers: getAuthHeader(),
      responseType: 'blob'
    }
  );
  return response.data;
};

/**
 * Verificar un certificado públicamente (sin autenticación)
 */
export const verifyCertificate = async (
  code: string
): Promise<{
  valid: boolean;
  certificate?: Certificate;
  message: string;
}> => {
  const response = await axios.get(`${API_URL}/certificates/verify/${code}`);
  return response.data;
};

/**
 * Descargar certificado y disparar descarga en navegador
 */
export const downloadCertificateFile = async (
  certificateId: number,
  fileName: string
): Promise<void> => {
  const blob = await downloadCertificate(certificateId);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `certificado_${certificateId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default {
  checkEligibility,
  generateCertificate,
  getMyCertificates,
  downloadCertificate,
  verifyCertificate,
  downloadCertificateFile
};
