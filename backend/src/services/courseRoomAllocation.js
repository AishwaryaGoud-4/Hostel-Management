const mongoose = require('mongoose');
const Room = require('../models/Room');
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const { isValidCourse } = require('../constants/courses');

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Atomically assign a student to a random available room for their course.
 * Must be called inside an active MongoDB transaction session.
 */
async function allocateCourseRoom(course, studentId, session) {
  if (!isValidCourse(course)) {
    return { ok: false, message: 'Invalid course.' };
  }

  const studentOid = new mongoose.Types.ObjectId(studentId);

  const candidates = await Room.find({
    course,
    $expr: { $lt: [{ $size: '$occupants' }, '$capacity'] },
  }).session(session);

  if (candidates.length === 0) {
    return { ok: false, message: `No rooms available for ${course}.` };
  }

  for (const candidate of shuffle(candidates)) {
    const updated = await Room.findOneAndUpdate(
      {
        _id: candidate._id,
        course,
        $expr: { $lt: [{ $size: '$occupants' }, '$capacity'] },
      },
      { $addToSet: { occupants: studentOid } },
      { session, new: true }
    );

    if (!updated) continue;

    if (updated.occupants.length >= updated.capacity) {
      updated.status = 'OCCUPIED';
    } else if (updated.status === 'OCCUPIED') {
      updated.status = 'AVAILABLE';
    }
    await updated.save({ session });

    await User.findByIdAndUpdate(
      studentId,
      {
        'studentProfile.roomId': updated._id,
        'studentProfile.hostelId': updated.hostelId,
      },
      { session }
    );

    await Hostel.findByIdAndUpdate(updated.hostelId, { $inc: { occupiedBeds: 1 } }, { session });

    return { ok: true, room: updated };
  }

  return { ok: false, message: `No rooms available for ${course}.` };
}

module.exports = { allocateCourseRoom };
