import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface DiscountCode {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  max_uses?: number;
  times_used: number;
  expires_at?: string;
  active: boolean;
  created_at: string;
}

export interface PaymentHistory {
  id: number;
  user_id: number;
  course_id: number;
  amount: number;
  discount_code?: string;
  discount_amount?: number;
  final_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payment_method: string;
  mercadopago_id?: string;
  created_at: string;
  updated_at: string;
  course_title?: string;
}

export interface PaymentStats {
  total_spent: number;
  total_courses_purchased: number;
  total_discounts_used: number;
  total_saved: number;
  pending_payments: number;
}

/**
 * Crear preferencia de pago con MercadoPago (con descuento opcional)
 */
export const createPaymentPreference = async (data: {
  course_id: number;
  discount_code?: string;
}): Promise<{
  preference_id: string;
  init_point: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
}> => {
  const response = await axios.post(
    `${API_URL}/payments/create-preference`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Validar un código de descuento
 */
export const validateDiscountCode = async (
  code: string
): Promise<DiscountCode> => {
  const response = await axios.post(
    `${API_URL}/payments/validate-discount`,
    { code },
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Obtener mi historial de pagos
 */
export const getMyPaymentHistory = async (): Promise<PaymentHistory[]> => {
  const response = await axios.get(`${API_URL}/payments/my-history`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Obtener mis estadísticas de pagos
 */
export const getMyPaymentStats = async (): Promise<PaymentStats> => {
  const response = await axios.get(`${API_URL}/payments/my-stats`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Obtener detalles de un pago específico
 */
export const getPaymentById = async (id: number): Promise<PaymentHistory> => {
  const response = await axios.get(`${API_URL}/payments/${id}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// ==================== ADMIN ====================

/**
 * Crear un código de descuento (solo admin)
 */
export const createDiscountCode = async (data: {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  max_uses?: number;
  expires_at?: string;
}): Promise<DiscountCode> => {
  const response = await axios.post(`${API_URL}/payments/discount-codes`, data, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Listar todos los códigos de descuento (solo admin)
 */
export const getAllDiscountCodes = async (): Promise<DiscountCode[]> => {
  const response = await axios.get(`${API_URL}/payments/discount-codes`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Obtener todos los pagos (solo admin)
 */
export const getAllPayments = async (): Promise<PaymentHistory[]> => {
  const response = await axios.get(`${API_URL}/payments/all`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export default {
  createPaymentPreference,
  validateDiscountCode,
  getMyPaymentHistory,
  getMyPaymentStats,
  getPaymentById,
  createDiscountCode,
  getAllDiscountCodes,
  getAllPayments
};
