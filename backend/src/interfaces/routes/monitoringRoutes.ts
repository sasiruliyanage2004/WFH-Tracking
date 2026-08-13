import express from 'express';
const router = express.Router();
import { authenticate, authorize } from '../middlewares/auth';
import {
  logScreenshot,
  getScreenshots,
  deleteBulkScreenshots,
  logActivity,
  getMyActivity,
  getActivity,
  registerDevice,
  getDeviceCount,
  logUsage,
  getUsage,
  getLeaderboard,
  getSummary
} from '../../controllers/monitoringController';

router.post('/monitoring/screenshot', authenticate, logScreenshot);
router.get('/monitoring/screenshots/:employeeId', authenticate, authorize(['Manager', 'SuperAdmin']), getScreenshots);
router.post('/monitoring/screenshots/delete-bulk', authenticate, authorize(['Manager', 'SuperAdmin']), deleteBulkScreenshots);
router.post('/monitoring/activity', authenticate, logActivity);
router.get('/monitoring/my-activity', authenticate, getMyActivity);
router.get('/monitoring/activity/:employeeId', authenticate, authorize(['Manager', 'SuperAdmin']), getActivity);
router.post('/devices/register', authenticate, registerDevice);
router.get('/devices/count', authenticate, authorize(['Manager', 'SuperAdmin']), getDeviceCount);
router.post('/monitoring/usage-log', authenticate, logUsage);
router.get('/monitoring/usage/:employeeId', authenticate, authorize(['Manager', 'SuperAdmin']), getUsage);
router.get('/monitoring/leaderboard', authenticate, authorize(['Manager', 'SuperAdmin']), getLeaderboard);
router.get('/monitoring/summary', authenticate, authorize(['Manager', 'SuperAdmin']), getSummary);

export default router;
