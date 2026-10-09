const router = require('express').Router();
const room = require('../controllers/roomController');
const { requireAdmin, requireAny, requireStudent, requireWarden } = require('../middleware/auth');

router.get('/me', requireStudent, room.getMyRoom);
router.post('/me/allocate', requireStudent, room.requestRoomAllocation);
router.post('/seed', requireAdmin, room.seedCourseRooms);
router.post('/allocate', requireWarden, room.manualAllocate);
router.post('/change', requireWarden, room.changeRoom);
router.post('/vacate', requireWarden, room.vacateRoom);
router.post('/', requireAdmin, room.createRoom);
router.get('/', requireAny, room.getRooms);
router.put('/:id', requireAdmin, room.updateRoom);
router.delete('/:id', requireAdmin, room.deleteRoom);

module.exports = router;
