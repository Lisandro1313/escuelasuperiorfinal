// Service exports for easy importing
export { default as assignmentService } from './assignmentService';
export { default as progressService } from './progressService';
export { default as enhancedPaymentService } from './enhancedPaymentService';
export { default as notificationService } from './notificationService';
export { default as certificateService } from './certificateService';

// Type exports
export type { Assignment, AssignmentSubmission } from './assignmentService';
export type { 
  CourseProgress, 
  ModuleProgress, 
  LessonProgress, 
  StudentStats 
} from './progressService';
export type { 
  DiscountCode, 
  PaymentHistory, 
  PaymentStats 
} from './enhancedPaymentService';
export type { 
  Notification, 
  NotificationPreferences 
} from './notificationService';
export type { 
  Certificate, 
  CertificateEligibility 
} from './certificateService';
