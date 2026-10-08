const mongoose = require('mongoose');
const Room = require('../models/Room');
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const { isValidCourse, NO_ROOMS_MESSAGE } = require('../constants/courses');
const {
  syncOccupancyStatus,
  studentRoomAssignment,
  clearedStudentRoom,
  courseRoomCode,
} = require('../utils/roomHelpers');

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

async function resolveRoom(roomRef, session) {
  if (!roomRef) return null;
  const value = String(roomRef);
  if (mongoose.isValidObjectId(value)) {
    const byId = await Room.findById(value).session(session);
    if (byId) return byId;
  }
  return Room.findOne({
    $or: [{ roomNumber: value.toUpperCase() }, { roomNo: value }],
  }).session(session);
}

async function studentAlreadyPlaced(studentId, session) {
  const student = await User.findById(studentId).session(session);
  if (!student || student.role !== 'STUDENT') {
    return { student: null, placed: false, message: 'Student not found.' };
  }
  const placed = Boolean(student.studentProfile?.roomId);
  return { student, placed };
}

/**
 * Atomically assign a student to a random available room for their course.
 * Must be called inside an active MongoDB transaction session.
 */
async function allocateCourseRoom(course, studentId, session) {
  if (!isValidCourse(course)) {
    return { ok: false, status: 400, message: 'Invalid course.' };
  }

  const { student, placed, message } = await studentAlreadyPlaced(studentId, session);
  if (!student) return { ok: false, status: 404, message };
  if (placed) {
    return { ok: false, status: 409, message: 'Student already has a room.' };
  }
  if (student.studentProfile?.course && student.studentProfile.course !== course) {
    return { ok: false, status: 400, message: 'Student course does not match the allocation course.' };
  }

  const studentOid = new mongoose.Types.ObjectId(studentId);
  const candidates = await Room.find({
    course,
    status: { $nin: ['MAINTENANCE', 'RESERVED'] },
    $expr: { $lt: [{ $size: '$occupants' }, '$capacity'] },
  }).session(session);

  if (candidates.length === 0) {
    return { ok: false, status: 400, message: NO_ROOMS_MESSAGE };
  }

  for (const candidate of shuffle(candidates)) {
    const updated = await Room.findOneAndUpdate(
      {
        _id: candidate._id,
        course,
        occupants: { $ne: studentOid },
        $expr: { $lt: [{ $size: '$occupants' }, '$capacity'] },
      },
      { $addToSet: { occupants: studentOid } },
      { session, new: true }
    );

    if (!updated) continue;

    syncOccupancyStatus(updated);
    await updated.save({ session });

    await User.findByIdAndUpdate(studentId, studentRoomAssignment(updated), { session });
    await Hostel.findByIdAndUpdate(updated.hostelId, { $inc: { occupiedBeds: 1 } }, { session });

    return { ok: true, room: updated };
  }

  return { ok: false, status: 400, message: NO_ROOMS_MESSAGE };
}

async function assignSpecificRoom({ studentId, roomId, session, mode = 'allocate' }) {
  const { student, placed, message } = await studentAlreadyPlaced(studentId, session);
  if (!student) return { ok: false, status: 404, message };

  const course = student.studentProfile?.course;
  if (!isValidCourse(course)) {
    return { ok: false, status: 400, message: 'Course is required for room allocation.' };
  }

  if (mode === 'allocate' && placed) {
    return {
      ok: false,
      status: 409,
      message: 'Student already has a room. Change the room instead of creating another allocation.',
    };
  }

  const room = await resolveRoom(roomId, session);
  if (!room || !room.course) {
    return { ok: false, status: 404, message: 'Course room not found.' };
  }
  if (room.course !== course) {
    return { ok: false, status: 400, message: 'Students can only be allocated to rooms for their own course.' };
  }
  if (room.status === 'MAINTENANCE' || room.status === 'RESERVED') {
    return { ok: false, status: 400, message: 'This room is not available for allocation.' };
  }

  const studentOid = new mongoose.Types.ObjectId(studentId);
  const currentRoomId = student.studentProfile?.roomId?.toString();
  if (currentRoomId && currentRoomId === room._id.toString()) {
    return { ok: false, status: 409, message: 'Student is already assigned to this room.' };
  }

  if (mode === 'change' && currentRoomId) {
    const oldRoom = await Room.findById(currentRoomId).session(session);
    if (oldRoom) {
      const before = oldRoom.occupants.length;
      oldRoom.occupants = oldRoom.occupants.filter((id) => id.toString() !== studentId.toString());
      if (oldRoom.occupants.length < before) {
        syncOccupancyStatus(oldRoom);
        await oldRoom.save({ session });
        await Hostel.findByIdAndUpdate(oldRoom.hostelId, { $inc: { occupiedBeds: -1 } }, { session });
      }
    }
  }

  const updated = await Room.findOneAndUpdate(
    {
      _id: room._id,
      course,
      occupants: { $ne: studentOid },
      $expr: { $lt: [{ $size: '$occupants' }, '$capacity'] },
    },
    { $addToSet: { occupants: studentOid } },
    { session, new: true }
  );

  if (!updated) {
    return { ok: false, status: 400, message: 'This room is full.' };
  }

  syncOccupancyStatus(updated);
  await updated.save({ session });
  await User.findByIdAndUpdate(studentId, studentRoomAssignment(updated), { session });
  await Hostel.findByIdAndUpdate(updated.hostelId, { $inc: { occupiedBeds: 1 } }, { session });

  return { ok: true, room: updated, previousRoomId: currentRoomId || null };
}

async function vacateStudentRoom(studentId, session) {
  const student = await User.findById(studentId).session(session);
  if (!student || student.role !== 'STUDENT') {
    return { ok: false, status: 404, message: 'Student not found.' };
  }
  const currentRoomId = student.studentProfile?.roomId;
  if (!currentRoomId) {
    return { ok: false, status: 400, message: 'Student does not have a room assignment.' };
  }

  const room = await Room.findById(currentRoomId).session(session);
  if (room) {
    const before = room.occupants.length;
    room.occupants = room.occupants.filter((id) => id.toString() !== studentId.toString());
    if (room.occupants.length < before) {
      syncOccupancyStatus(room);
      await room.save({ session });
      await Hostel.findByIdAndUpdate(room.hostelId, { $inc: { occupiedBeds: -1 } }, { session });
    }
  }

  await User.findByIdAndUpdate(studentId, { $set: clearedStudentRoom() }, { session });
  return { ok: true, room, course: student.studentProfile?.course, roomCode: courseRoomCode(room) };
}

module.exports = {
  allocateCourseRoom,
  assignSpecificRoom,
  vacateStudentRoom,
  resolveRoom,
};
