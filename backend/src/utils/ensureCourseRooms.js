const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const User = require('../models/User');
const { STUDENT_COURSES } = require('../constants/courses');
const { formatCourseRoomId, parseCourseRoomSequence } = require('./courseRoomId');

const ROOMS_PER_COURSE = 20;
const DEFAULT_CAPACITY = 4;

async function createDefaultHostel(code) {
  const owner = await User.findOne({ role: { $in: ['WARDEN', 'SUPER_ADMIN'] }, isActive: true }).sort({ role: -1, createdAt: 1 });
  if (!owner) return null;
  try {
    return await Hostel.create({
      name: 'Main Hostel',
      code,
      type: 'CO_ED',
      address: 'Main Campus',
      totalFloors: 1,
      totalRooms: 1,
      totalBeds: 1,
      wardenId: owner._id,
      contactNumber: owner.phone || '0000000000',
      geoLocation: { latitude: 0, longitude: 0 },
    });
  } catch (err) {
    if (err.code === 11000) return Hostel.findOne({ code });
    throw err;
  }
}

async function resolveCourseHostelId() {
  const code = process.env.COURSE_ROOM_HOSTEL_CODE || 'VBH';
  let hostel = await Hostel.findOne({ code, isActive: true });
  if (!hostel) hostel = await Hostel.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (!hostel) hostel = await createDefaultHostel(code);
  return hostel?._id ?? null;
}

const MIN_FREE_BEDS = 4;
const EXPANSION_ROOMS = 10;

function roomDoc(hostelId, course, n) {
  return {
    hostelId,
    course,
    roomNumber: formatCourseRoomId(course, n),
    roomNo: String(100 + n),
    block: 'A',
    floor: Math.floor((n - 1) / ROOMS_PER_COURSE) + 1,
    type: 'DORMITORY',
    status: 'AVAILABLE',
    capacity: DEFAULT_CAPACITY,
    occupants: [],
    monthlyRent: 5000,
    amenities: ['Bed', 'Wi-Fi', 'Electricity', 'Study Table', 'Cupboard', 'Fan', 'Water'],
  };
}

async function freeBedsForCourse(course) {
  const [row] = await Room.aggregate([
    { $match: { course, status: { $nin: ['MAINTENANCE', 'RESERVED'] } } },
    { $group: { _id: null, free: { $sum: { $max: [0, { $subtract: ['$capacity', { $size: '$occupants' }] }] } } } },
  ]);
  return row?.free || 0;
}

/** Adds the next batch of rooms (e.g. CSE021–CSE030) when a course is nearly full. */
async function ensureCourseCapacity(course, hostelId) {
  if (!STUDENT_COURSES.includes(course)) return 0;
  if ((await freeBedsForCourse(course)) >= MIN_FREE_BEDS) return 0;

  const existing = await Room.find({ course }).select('roomNumber').lean();
  let max = 0;
  for (const r of existing) {
    const seq = parseCourseRoomSequence(r.roomNumber, course);
    if (seq !== null && seq > max) max = seq;
  }
  if (max + EXPANSION_ROOMS > 999) return 0;

  const docs = [];
  for (let n = max + 1; n <= max + EXPANSION_ROOMS; n += 1) docs.push(roomDoc(hostelId, course, n));
  let inserted = docs.length;
  try {
    await Room.insertMany(docs, { ordered: false });
  } catch (err) {
    // Parallel registrations may race to create the same batch; whichever lands first wins.
    if (err.code !== 11000 && !err.writeErrors) throw err;
    inserted = err.insertedDocs?.length ?? err.result?.insertedCount ?? 0;
  }
  if (inserted > 0) {
    await Hostel.findByIdAndUpdate(hostelId, { $inc: { totalRooms: inserted, totalBeds: inserted * DEFAULT_CAPACITY } });
  }
  return inserted;
}

/**
 * Idempotent: creates CSE001–CSE020 (etc.) only when a course has zero rooms.
 * With `course`, also grows that course's rooms so a new student always gets a bed.
 */
async function ensureCourseRooms(course) {
  const hostelId = await resolveCourseHostelId();
  if (!hostelId) {
    return {
      ok: false,
      message: 'The hostel is not set up yet. Ask the administrator to run "npm run seed" in the backend, or create a warden and hostel first.',
    };
  }

  let created = 0;

  for (const c of STUDENT_COURSES) {
    const existing = await Room.countDocuments({ course: c });
    if (existing > 0) continue;

    const docs = [];
    for (let n = 1; n <= ROOMS_PER_COURSE; n += 1) docs.push(roomDoc(hostelId, c, n));

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

  if (course) created += await ensureCourseCapacity(course, hostelId);

  return { ok: true, created };
}

module.exports = { ensureCourseRooms, ensureCourseCapacity, ROOMS_PER_COURSE };
