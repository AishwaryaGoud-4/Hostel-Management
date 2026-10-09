const Room = require('../models/Room');
const { isValidCourse } = require('../constants/courses');

/** @returns {RegExp} Matches room numbers like CSE001, ECE017 */
function courseRoomIdPattern(course) {
  return new RegExp(`^${course}(\\d{3})$`, 'i');
}

function formatCourseRoomId(course, sequence) {
  const n = Number(sequence);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error('Room sequence must be a positive integer.');
  }
  return `${course}${String(n).padStart(3, '0')}`.toUpperCase();
}

function parseCourseRoomSequence(roomNumber, course) {
  if (!roomNumber || !course) return null;
  const match = String(roomNumber).trim().toUpperCase().match(courseRoomIdPattern(course));
  if (!match) return null;
  return parseInt(match[1], 10);
}

function isValidCourseRoomId(roomNumber, course) {
  return parseCourseRoomSequence(roomNumber, course) !== null;
}

/**
 * Next available room ID for a course (independent per course).
 * Uses only roomNumber values matching COURSE + 3 digits.
 */
async function getNextCourseRoomId(course, session = null) {
  if (!isValidCourse(course)) {
    throw new Error('Invalid course.');
  }

  const q = Room.find({ course }).select('roomNumber');
  if (session) q.session(session);
  const rooms = await q.lean();

  let max = 0;
  for (const r of rooms) {
    const seq = parseCourseRoomSequence(r.roomNumber, course);
    if (seq !== null && seq > max) max = seq;
  }

  return formatCourseRoomId(course, max + 1);
}

module.exports = {
  courseRoomIdPattern,
  formatCourseRoomId,
  parseCourseRoomSequence,
  isValidCourseRoomId,
  getNextCourseRoomId,
};
