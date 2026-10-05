const router = require('express').Router();
const room = require('../controllers/roomController');
const { requireAdmin, requireAny } = require('../middleware/auth');

router.post('/', requireAdmin, room.createRoom);
router.get('/', requireAny, room.getRooms);
router.delete('/:id', requireAdmin, room.deleteRoom);

module.exports = router;
