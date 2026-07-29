const router = require('express').Router();
const gp = require('../controllers/gatePassController');
const { requireStudent, requireWarden, requireAny, requireStaff } = require('../middleware/auth');

router.post('/', requireStudent, gp.createGatePass);
router.get('/', requireAny, gp.getGatePasses);
router.put('/:id/approve', requireWarden, gp.approveGatePass);
router.put('/:id/reject', requireWarden, gp.rejectGatePass);
router.post('/verify', requireStaff, gp.verifyGatePass);

module.exports = router;
