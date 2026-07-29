const router = require('express').Router();
const complaint = require('../controllers/complaintController');
const { requireAny, requireStaff, requireStudent } = require('../middleware/auth');

router.post('/', requireStudent, complaint.createComplaint);
router.get('/', requireAny, complaint.getComplaints);
router.get('/stats', requireStaff, complaint.getComplaintStats);
router.get('/:id', requireAny, complaint.getComplaintById);
router.put('/:id/status', requireStaff, complaint.updateComplaintStatus);
router.put('/:id/resolve', requireStaff, complaint.resolveComplaint);
router.put('/:id/rate', requireStudent, complaint.rateComplaint);

module.exports = router;
