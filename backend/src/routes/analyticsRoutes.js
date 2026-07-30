const router = require('express').Router();
const an = require('../controllers/analyticsController');
const { requireAdmin, requireAny } = require('../middleware/auth');

router.get('/dashboard', requireAdmin, an.getDashboardAnalytics);
router.get('/predictions', requireAdmin, an.getAIPredictions);
router.get('/search', requireAny, an.globalSearch);
router.get('/activity', requireAdmin, an.getActivityTimeline);
router.get('/export/:type', requireAdmin, an.exportData);

module.exports = router;
