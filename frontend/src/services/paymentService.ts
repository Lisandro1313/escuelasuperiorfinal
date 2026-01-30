class PaymentService {
  private apiUrl = import.meta.env.VITE_API_URL || '/api';

  // Crear pago para un curso
  async createCoursePayment(courseId: number) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${this.apiUrl}/payments/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: courseId,
          type: 'single_course'
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear la preferencia de pago');
      }

      const data = await response.json();
      
      return {
        success: true,
        preference_id: data.preference_id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        demo: false
      };
    } catch (error) {
      console.error('Error creando pago:', error);
      
      // En caso de error, usar modo demo
      return {
        success: false,
        demo: true,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Crear pago para múltiples cursos
  async createMultipleCoursePayment(courseIds: number[]) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${this.apiUrl}/payments/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseIds: courseIds,
          type: 'multiple_courses'
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear la preferencia de pago');
      }

      const data = await response.json();
      
      return {
        success: true,
        preference_id: data.preference_id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        demo: false
      };
    } catch (error) {
      console.error('Error creando pago múltiple:', error);
      
      return {
        success: false,
        demo: true,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Procesar pago demo (para pruebas)
  async processDemoPayment() {
    // Simular procesamiento de pago
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          payment_id: 'demo_' + Date.now(),
          status: 'approved',
          message: 'Pago procesado exitosamente en modo demo'
        });
      }, 2000);
    });
  }

  // Obtener información de un pago
  async getPaymentInfo(paymentId: string) {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${this.apiUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información del pago');
      }

      return await response.json();
    } catch (error) {
      console.error('Error obteniendo información del pago:', error);
      throw error;
    }
  }

  // Formatear precio en moneda local
  formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  }

  // Redireccionar a MercadoPago
  redirectToMercadoPago(initPoint: string) {
    window.location.href = initPoint;
  }

  // Obtener configuración de pagos
  getPaymentConfig() {
    return {
      demo: true, // Modo demo habilitado
      currency: 'ARS',
      supportedMethods: ['credit_card', 'debit_card', 'ticket', 'bank_transfer'],
      mercadopago: {
        public_key: 'TEST-8011d68481be952963a23ec9fc710d69-080914-2591968924'
      }
    };
  }

  // Validar estado del pago
  validatePaymentStatus(status: string) {
    const validStatuses = ['pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back'];
    return validStatuses.includes(status);
  }

  // Obtener mensaje de estado del pago
  getPaymentStatusMessage(status: string) {
    const messages = {
      'pending': 'Tu pago está siendo procesado',
      'approved': '¡Pago aprobado! Ya tienes acceso al curso',
      'authorized': 'Pago autorizado',
      'in_process': 'Tu pago está en proceso',
      'in_mediation': 'Tu pago está en mediación',
      'rejected': 'Tu pago fue rechazado',
      'cancelled': 'El pago fue cancelado',
      'refunded': 'Tu pago fue reembolsado',
      'charged_back': 'Se realizó una contracargo'
    };
    
    return messages[status as keyof typeof messages] || 'Estado de pago desconocido';
  }
}

export default new PaymentService();