const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

class MercadoPagoService {
  constructor() {
    // Configurar MercadoPago
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
        idempotencyKey: 'abc'
      }
    });

    this.preference = new Preference(this.client);
    this.payment = new Payment(this.client);
  }

  // Crear preferencia de pago para un curso
  async createPreference(courseData, userData) {
    try {
      const preferenceData = {
        items: [
          {
            id: (courseData.id || 1).toString(),
            title: courseData.nombre || courseData.courseName || 'Curso',
            description: courseData.descripcion || 'Curso en Campus Norma',
            picture_url: courseData.imagen || '',
            category_id: courseData.categoria || 'education',
            quantity: 1,
            unit_price: parseFloat(courseData.precio || courseData.price || 0),
            currency_id: 'ARS' // Peso Argentino
          }
        ],
        payer: {
          name: userData.nombre,
          email: userData.email,
          identification: {
            type: 'DNI',
            number: userData.dni || '12345678'
          }
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success`,
          failure: `${process.env.FRONTEND_URL}/payment/failure`,
          pending: `${process.env.FRONTEND_URL}/payment/pending`
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        statement_descriptor: 'Campus Norma',
        external_reference: `course_${courseData.id}_user_${userData.id}_${Date.now()}`,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      };

      const preference = await this.preference.create({
        body: preferenceData
      });

      return {
        success: true,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point
      };
    } catch (error) {
      console.error('Error creating MercadoPago preference:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Crear preferencia para inscripción múltiple
  async createMultipleCoursePreference(courses, userData) {
    try {
      const items = courses.map(course => ({
        id: course.id.toString(),
        title: course.nombre,
        description: course.descripcion,
        picture_url: course.imagen || '',
        category_id: course.categoria,
        quantity: 1,
        unit_price: parseFloat(course.precio),
        currency_id: 'ARS'
      }));

      const totalAmount = courses.reduce((sum, course) => sum + parseFloat(course.precio), 0);

      const preferenceData = {
        items: items,
        payer: {
          name: userData.nombre,
          email: userData.email,
          identification: {
            type: 'DNI',
            number: userData.dni || '12345678'
          }
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success`,
          failure: `${process.env.FRONTEND_URL}/payment/failure`,
          pending: `${process.env.FRONTEND_URL}/payment/pending`
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        statement_descriptor: 'Campus Norma',
        external_reference: `courses_${courses.map(c => c.id).join('_')}_user_${userData.id}_${Date.now()}`,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const preference = await this.preference.create({
        body: preferenceData
      });

      return {
        success: true,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        totalAmount: totalAmount
      };
    } catch (error) {
      console.error('Error creating multiple course preference:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener información de un pago
  async getPayment(paymentId) {
    try {
      const payment = await this.payment.get({
        id: paymentId
      });

      return {
        success: true,
        payment: payment
      };
    } catch (error) {
      console.error('Error getting payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Procesar webhook de MercadoPago
  async processWebhook(body, headers) {
    try {
      const { type, data } = body;

      if (type === 'payment') {
        const paymentInfo = await this.getPayment(data.id);
        
        if (paymentInfo.success) {
          const payment = paymentInfo.payment;
          
          return {
            success: true,
            paymentStatus: payment.status,
            externalReference: payment.external_reference,
            paymentId: payment.id,
            transactionAmount: payment.transaction_amount,
            paymentMethod: payment.payment_method_id,
            dateCreated: payment.date_created
          };
        }
      }

      return {
        success: false,
        error: 'Invalid webhook type or data'
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Crear plan de suscripción
  async createSubscriptionPlan(planData) {
    try {
      // MercadoPago no maneja suscripciones directamente, 
      // pero podemos crear pagos recurrentes usando preapproval
      const subscriptionData = {
        reason: planData.nombre,
        auto_recurring: {
          frequency: planData.frequency || 1,
          frequency_type: planData.frequency_type || 'months',
          transaction_amount: parseFloat(planData.precio),
          currency_id: 'ARS'
        },
        back_url: `${process.env.FRONTEND_URL}/subscription/result`,
        payer_email: planData.userEmail
      };

      // Para suscripciones necesitarías el SDK de preapproval
      // Por ahora retornamos la estructura básica
      return {
        success: true,
        subscriptionId: `sub_${Date.now()}`,
        data: subscriptionData
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new MercadoPagoService();