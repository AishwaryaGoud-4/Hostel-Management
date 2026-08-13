const router = require('express').Router();
const hostel = require('../controllers/hostelController');
const { requireAdmin, requireWarden, requireAny } = require('../middleware/auth');

// Hostel routes
router.post('/', requireAdmin, hostel.createHostel);
router.get('/', requireAny, hostel.getAllHostels);
router.get('/stats', requireWarden, hostel.getHostelStats);
router.get('/:id', requireAny, hostel.getHostelById);
router.put('/:id', requireAdmin, hostel.updateHostel);
router.delete('/:id', requireAdmin, hostel.deleteHostel);

// Room routes
router.post('/rooms', requireAdmin, hostel.createRoom);
router.get('/:hostelId/rooms', requireAny, hostel.getRoomsByHostel);
router.put('/rooms/:id', requireWarden, hostel.updateRoom);
router.post('/rooms/allocate', requireWarden, hostel.allocateRoom);
router.post('/rooms/deallocate', requireWarden, hostel.deallocateRoom);
router.post('/rooms/auto-allocate', requireAdmin, hostel.autoAllocateRoom);
router.post('/rooms/reassign', requireWarden, hostel.reassignRoom);

// Student queries for room allocation
router.get('/students/unassigned', requireWarden, hostel.getUnassignedStudents);

// Seed rooms (admin only)
router.post('/rooms/seed', requireAdmin, hostel.seedRooms);

module.exports = router;
