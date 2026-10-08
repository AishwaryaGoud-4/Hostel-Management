const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const { STUDENT_COURSES } = require('../constants/courses');
const { formatCourseRoomId } = require('./courseRoomId');

const ROOMS_PER_COURSE = 20;
const DEFAULT_CAPACITY = 4;

async function resolveCourseHostelId() {
  const code = process.env.COURSE_ROOM_HOSTEL_CODE || 'VBH';
  let hostel = await Hostel.findOne({ code, isActive: true });
  if (!hostel) hostel = await Hostel.findOne({ isActive: true }).sort({ createdAt: 1 });
  return hostel?._id ?? null;
}

/**
 * Idempotent: creates CSE001–CSE020 (etc.) only when a course has zero rooms.
 */
async function ensureCourseRooms() {
  const hostelId = await resolveCourseHostelId();
  if (!hostelId) {
    return { ok: false, message: 'No active hostel found to attach course rooms.' };
  }

  let created = 0;

  for (const course of STUDENT_COURSES) {
    const existing = await Room.countDocuments({ course });
    if (existing > 0) continue;

    const docs = [];
    for (let n = 1; n <= ROOMS_PER_COURSE; n += 1) {
      docs.push({
        hostelId,
        course,
        roomNumber: formatCourseRoomId(course, n),
        roomNo: String(100 + n),
        block: 'A',
        floor: 1,
        type: 'DORMITORY',
        status: 'AVAILABLE',
        capacity: DEFAULT_CAPACITY,
        occupants: [],
        monthlyRent: 5000,
        amenities: ['Bed', 'Wi-Fi', 'Electricity', 'Study Table', 'Cupboard', 'Fan', 'Water'],
      });
    }

    try {
      await Room.insertMany(docs, { ordered: false });
      created += docs.length;
      await Hostel.findByIdAndUpdate(hostelId, {
        $inc: { totalRooms: docs.length, totalBeds: docs.length * DEFAULT_CAPACITY },
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  return { ok: true, created };
}

module.exports = { ensureCourseRooms, ROOMS_PER_COURSE };
