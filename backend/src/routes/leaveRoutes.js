const router = require('express').Router();
const lv = require('../controllers/leaveController');
const { requireStudent, requireWarden, requireAny } = require('../middleware/auth');

router.post('/', requireStudent, lv.createLeave);
router.get('/', requireAny, lv.getLeaveRequests);
router.put('/:id/approve', requireWarden, lv.approveLeave);
router.put('/:id/reject', requireWarden, lv.rejectLeave);
router.put('/:id/cancel', requireStudent, lv.cancelLeave);

module.exports = router;
