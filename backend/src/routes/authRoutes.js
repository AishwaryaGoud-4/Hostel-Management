const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const { requireAny, requireAdmin } = require('../middleware/auth');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many attempts. Try again later.' } });

router.post('/register', authLimiter, auth.register);
router.post('/login', authLimiter, auth.login);
router.post('/refresh', auth.refreshToken);
router.post('/logout', requireAny, auth.logout);
router.get('/me', requireAny, auth.getMe);
router.post('/reset-password-request', authLimiter, auth.resetPasswordRequest);
router.post('/reset-password', authLimiter, auth.resetPassword);
router.get('/users', requireAdmin, auth.getAllUsers);
router.put('/users/:id', requireAdmin, auth.updateUser);
router.delete('/users/:id', requireAdmin, auth.deleteUser);

module.exports = router;
