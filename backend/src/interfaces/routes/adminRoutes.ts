import express from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import * as adminController from '../../controllers/adminController';

const router = express.Router();

// 0. EMPLOYEE LIST ROUTES (SuperAdmin and Manager)
router.post('/api/users/employees', authenticate, authorize(['SuperAdmin', 'Manager']), adminController.createEmployee);
router.get('/api/users/employees', authenticate, authorize(['SuperAdmin', 'Manager']), adminController.getEmployees);
router.put('/api/users/employees/:id/status', authenticate, authorize(['SuperAdmin', 'Manager']), adminController.toggleEmployeeStatus);
router.delete('/api/users/employees/:id', authenticate, authorize(['SuperAdmin', 'Manager']), adminController.deleteEmployee);

// Create Admin/Manager (SuperAdmin only)
router.post('/api/users/admins', authenticate, authorize('SuperAdmin'), adminController.createAdmin);
router.get('/api/users/admins', authenticate, authorize('SuperAdmin'), adminController.getAdmins);
router.delete('/api/users/admins/:id', authenticate, authorize('SuperAdmin'), adminController.deleteAdmin);
router.put('/api/users/admins/:id/status', authenticate, authorize('SuperAdmin'), adminController.toggleAdminStatus);

// GET SuperAdmins
router.get('/api/users/superadmins', authenticate, authorize('SuperAdmin'), adminController.getSuperAdmins);
router.post('/api/users/superadmins', authenticate, authorize('SuperAdmin'), adminController.createSuperAdmin);
router.delete('/api/users/superadmins/:id', authenticate, authorize('SuperAdmin'), adminController.deleteSuperAdmin);

// 6. NOTIFICATION ROUTING
router.get('/api/notifications', authenticate, adminController.getNotifications);
router.put('/api/notifications/:id/read', authenticate, adminController.markNotificationRead);
router.delete('/api/notifications/all', authenticate, adminController.deleteAllNotifications);

router.get('/api/settings/warning-emails', authenticate, authorize(['SuperAdmin']), adminController.getWarningEmails);
router.post('/api/settings/warning-emails', authenticate, authorize(['SuperAdmin']), adminController.saveWarningEmails);

// --- Custom SMTP Settings ---
router.get('/api/settings/smtp', authenticate, authorize(['SuperAdmin']), adminController.getSmtpConfig);
router.post('/api/settings/smtp', authenticate, authorize(['SuperAdmin']), adminController.saveSmtpConfig);
router.post('/api/settings/smtp/test', authenticate, authorize(['SuperAdmin']), adminController.testSmtpConfig);

router.get('/api/settings/screenshot-rules', authenticate, adminController.getScreenshotRules);
router.post('/api/settings/screenshot-rules', authenticate, authorize(['SuperAdmin', 'Manager']), adminController.saveScreenshotRules);

// --- SETTINGS: PRODUCTIVITY APPS ---
router.get('/api/settings/productivity', authenticate, authorize(['SuperAdmin', 'Manager']), adminController.getProductivitySettings);
router.put('/api/settings/productivity', authenticate, authorize(['SuperAdmin']), adminController.saveProductivitySettings);

// 10. SYSTEM ADMIN ROUTES
router.post('/api/system/companies', authenticate, authorize(['SystemAdmin']), adminController.createCompany);
router.get('/api/system/companies', authenticate, authorize(['SystemAdmin']), adminController.getCompanies);
router.put('/api/system/companies/:id/status', authenticate, authorize(['SystemAdmin']), adminController.updateCompanyStatus);
router.delete('/api/system/companies/:id', authenticate, authorize(['SystemAdmin']), adminController.deleteCompany);

// --- Analytics Endpoint ---
router.get('/api/system/analytics', authenticate, authorize(['SystemAdmin']), adminController.getAnalytics);

// --- Announcements Endpoints ---
router.post('/api/system/announcements', authenticate, authorize(['SystemAdmin']), adminController.createAnnouncement);
router.delete('/api/system/announcements/:id', authenticate, authorize(['SystemAdmin']), adminController.deleteAnnouncement);
router.get('/api/system/announcements', authenticate, authorize(['SystemAdmin']), adminController.getAnnouncements);
router.get('/api/announcements/latest', authenticate, adminController.getLatestAnnouncement);

export default router;
