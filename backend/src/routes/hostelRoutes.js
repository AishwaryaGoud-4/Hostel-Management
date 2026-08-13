const router = require('express').Router();
const hostel = require('../controllers/hostelController');
const { requireAdmin, requireWarden, requireAny } = require('../middleware/auth');

// ── Static routes MUST come before /:id to avoid Express treating path segments as IDs ──

// Student queries for room allocation
router.get('/students/unassigned', requireWarden, hostel.getUnassignedStudents);

// Hostel stats
router.get('/stats', requireWarden, hostel.getHostelStats);

// Room routes (static paths)
router.post('/rooms', requireAdmin, hostel.createRoom);
router.put('/rooms/:id', requireWarden, hostel.updateRoom);
router.post('/rooms/allocate', requireWarden, hostel.allocateRoom);
router.post('/rooms/deallocate', requireWarden, hostel.deallocateRoom);
router.post('/rooms/auto-allocate', requireAdmin, hostel.autoAllocateRoom);
router.post('/rooms/reassign', requireWarden, hostel.reassignRoom);
router.post('/rooms/seed', requireAdmin, hostel.seedRooms);

// Hostel CRUD
router.post('/', requireAdmin, hostel.createHostel);
router.get('/', requireAny, hostel.getAllHostels);
router.get('/:id', requireAny, hostel.getHostelById);
router.put('/:id', requireAdmin, hostel.updateHostel);
router.delete('/:id', requireAdmin, hostel.deleteHostel);

// Room routes (parameterized — must be after static routes)
router.get('/:hostelId/rooms', requireAny, hostel.getRoomsByHostel);

module.exports = router;
