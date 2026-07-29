const router = require('express').Router();
const notif = require('../controllers/notificationController');
const { requireAny } = require('../middleware/auth');

router.get('/', requireAny, notif.getNotifications);
router.put('/:id/read', requireAny, notif.markAsRead);
router.put('/read-all', requireAny, notif.markAllRead);
router.delete('/:id', requireAny, notif.deleteNotification);

module.exports = router;
