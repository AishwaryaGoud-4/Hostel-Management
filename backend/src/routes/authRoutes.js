const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const { requireAny, requireAdmin } = require('../middleware/auth');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, validate: { trustProxy: false }, message: { success: false, message: 'Too many attempts. Try again later.' } });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  validate: { trustProxy: false },
  message: { success: false, message: 'Too many failed login attempts. Try again in 15 minutes.' },
});

router.post('/register', authLimiter, auth.register);
router.post('/register/warden', authLimiter, auth.registerWarden);
router.put('/users/:id/review', requireAdmin, auth.reviewUser);
router.post('/students', requireAdmin, auth.createStudent);
router.post('/login', loginLimiter, auth.login);
router.post('/refresh', auth.refreshToken);
router.post('/logout', auth.logout);
router.get('/me', requireAny, auth.getMe);
router.post('/reset-password-request', authLimiter, auth.resetPasswordRequest);
router.post('/reset-password', authLimiter, auth.resetPassword);
router.get('/users', requireAdmin, auth.getAllUsers);
router.put('/users/:id', requireAdmin, auth.updateUser);
router.delete('/users/:id', requireAdmin, auth.deleteUser);

module.exports = router;
