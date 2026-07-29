const router = require('express').Router();
const fee = require('../controllers/feeController');
const { requireAdmin, requireWarden, requireAny } = require('../middleware/auth');

router.post('/invoices', requireAdmin, fee.createInvoice);
router.get('/invoices', requireWarden, fee.getAllInvoices);
router.get('/stats', requireWarden, fee.getFeeStats);
router.get('/student/:studentId', requireAny, fee.getStudentFees);
router.get('/my', requireAny, fee.getStudentFees);
router.post('/:id/pay', requireAny, fee.makePayment);

module.exports = router;
