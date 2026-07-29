const router = require('express').Router();
const att = require('../controllers/attendanceController');
const { requireWarden, requireAny, requireStudent } = require('../middleware/auth');

router.post('/qr/generate', requireWarden, att.generateQR);
router.post('/qr/mark', requireStudent, att.markAttendanceQR);
router.post('/manual', requireWarden, att.markAttendanceManual);
router.get('/student/:studentId', requireAny, att.getStudentAttendance);
router.get('/my', requireStudent, att.getStudentAttendance);
router.get('/hostel/:hostelId', requireWarden, att.getHostelAttendance);

module.exports = router;
