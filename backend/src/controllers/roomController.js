const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const { isValidCourse, STUDENT_COURSES } = require('../constants/courses');

async function resolveHostelId(hostelId) {
  if (hostelId) {
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return { error: 'Hostel not found' };
    return { hostelId: hostel._id };
  }
  const code = process.env.COURSE_ROOM_HOSTEL_CODE || 'VBH';
  let hostel = await Hostel.findOne({ code, isActive: true });
  if (!hostel) hostel = await Hostel.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (!hostel) return { error: 'No active hostel found. Create a hostel first or set COURSE_ROOM_HOSTEL_CODE.' };
  return { hostelId: hostel._id };
}

exports.createRoom = async (req, res) => {
  try {
    const { course, roomNumber, capacity, hostelId } = req.body;

    if (!isValidCourse(course)) {
      return res.status(400).json({
        success: false,
        message: `Course is required. Use one of: ${STUDENT_COURSES.join(', ')}.`,
      });
    }
    if (!roomNumber || !String(roomNumber).trim()) {
      return res.status(400).json({ success: false, message: 'Room number is required.' });
    }
    const cap = Number(capacity);
    if (!Number.isFinite(cap) || cap < 1) {
      return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
    }

    const resolved = await resolveHostelId(hostelId);
    if (resolved.error) return res.status(400).json({ success: false, message: resolved.error });

    const room = await Room.create({
      hostelId: resolved.hostelId,
      course,
      roomNumber: String(roomNumber).trim().toUpperCase(),
      floor: 0,
      type: cap >= 4 ? 'DORMITORY' : cap === 3 ? 'TRIPLE' : cap === 2 ? 'DOUBLE' : 'SINGLE',
      status: 'AVAILABLE',
      capacity: cap,
      occupants: [],
      monthlyRent: 5000,
      amenities: ['Bed', 'Desk', 'Wardrobe'],
    });

    await Hostel.findByIdAndUpdate(resolved.hostelId, { $inc: { totalRooms: 1, totalBeds: cap } });

    res.status(201).json({ success: true, message: 'Room created', data: { room } });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: 'A room with this number already exists for this course.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create room', error: e.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const { course } = req.query;
    const filter = { course: { $ne: null } };
    if (course) {
      if (!isValidCourse(course)) {
        return res.status(400).json({ success: false, message: 'Invalid course filter.' });
      }
      filter.course = course;
    }

    const rooms = await Room.find(filter)
      .populate('occupants', 'firstName lastName email studentProfile.rollNumber studentProfile.course')
      .sort({ course: 1, roomNumber: 1 });

    const rows = rooms.map((r) => ({
      ...r.toJSON(),
      occupied: r.occupants.length,
      available: r.capacity - r.occupants.length,
    }));

    res.status(200).json({ success: true, message: 'Rooms retrieved', data: { rooms: rows } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch rooms', error: e.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room || !room.course) {
      return res.status(404).json({ success: false, message: 'Course room not found' });
    }
    if (room.occupants.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a room with assigned students. Deallocate students first.',
      });
    }

    await Room.findByIdAndDelete(room._id);
    await Hostel.findByIdAndUpdate(room.hostelId, {
      $inc: { totalRooms: -1, totalBeds: -room.capacity },
    });

    res.status(200).json({ success: true, message: 'Room deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete room', error: e.message });
  }
};
