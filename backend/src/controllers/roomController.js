const mongoose = require('mongoose');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const User = require('../models/User');
const { isValidCourse, STUDENT_COURSES, NO_ROOMS_MESSAGE } = require('../constants/courses');
const { buildMyRoomResponse, serializeRoomListItem, syncOccupancyStatus } = require('../utils/roomHelpers');
const { allocateCourseRoom, assignSpecificRoom, vacateStudentRoom } = require('../services/courseRoomAllocation');
const { getNextCourseRoomId, isValidCourseRoomId, parseCourseRoomSequence } = require('../utils/courseRoomId');
const { ensureCourseRooms } = require('../utils/ensureCourseRooms');
const { emitRoomSync } = require('../utils/roomEvents');

const ROOM_POPULATE = 'firstName lastName email studentProfile.rollNumber studentProfile.course';

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

async function loadStudentRoomPayload(user) {
  if (!user?.studentProfile?.roomId) return null;
  const room = await Room.findById(user.studentProfile.roomId).populate('occupants', ROOM_POPULATE);
  if (!room) return null;
  const hostel = await Hostel.findById(room.hostelId);
  return buildMyRoomResponse({
    room,
    hostel,
    user,
    studentUserId: user._id,
  });
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function finishAllocation(req, res, { studentId, message }) {
  const updatedUser = await User.findById(studentId)
    .populate('studentProfile.hostelId', 'name code')
    .populate('studentProfile.roomId', 'roomNumber roomNo floor type course capacity block status');
  const payload = updatedUser ? await loadStudentRoomPayload(updatedUser) : null;
  emitRoomSync(req.app.get('io'), {
    type: 'room:allocated',
    user: updatedUser,
    room: payload,
    hostelId: updatedUser?.studentProfile?.hostelId,
  });
  return res.status(200).json({
    success: true,
    message,
    room: payload,
    data: { room: payload, user: updatedUser },
  });
}

exports.createRoom = async (req, res) => {
  try {
    const { course, roomNumber, roomId, roomNo, capacity, hostelId } = req.body;

    if (!isValidCourse(course)) {
      return res.status(400).json({
        success: false,
        message: `Course is required. Use one of: ${STUDENT_COURSES.join(', ')}.`,
      });
    }
    const cap = Number(capacity);
    if (!Number.isFinite(cap) || cap < 1) {
      return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
    }

    const requestedCode = roomId || roomNumber;
    let resolvedRoomNumber = requestedCode ? String(requestedCode).trim().toUpperCase() : null;
    if (resolvedRoomNumber && !isValidCourseRoomId(resolvedRoomNumber, course)) {
      return res.status(400).json({
        success: false,
        message: `Room ID must match ${course}001 format (e.g. ${course}001).`,
      });
    }
    if (!resolvedRoomNumber) {
      resolvedRoomNumber = await getNextCourseRoomId(course);
    }

    const seq = parseCourseRoomSequence(resolvedRoomNumber, course);
    const resolvedRoomNo = roomNo ? String(roomNo).trim() : String(100 + (seq || 1));

    const resolved = await resolveHostelId(hostelId);
    if (resolved.error) return res.status(400).json({ success: false, message: resolved.error });

    const room = await Room.create({
      hostelId: resolved.hostelId,
      course,
      roomNumber: resolvedRoomNumber,
      roomNo: resolvedRoomNo,
      block: 'A',
      floor: seq ? Math.ceil(seq / 20) : 1,
      type: cap >= 4 ? 'DORMITORY' : cap === 3 ? 'TRIPLE' : cap === 2 ? 'DOUBLE' : 'SINGLE',
      status: 'AVAILABLE',
      capacity: cap,
      occupants: [],
      monthlyRent: 5000,
      amenities: ['Bed', 'Desk', 'Wardrobe'],
    });

    await Hostel.findByIdAndUpdate(resolved.hostelId, { $inc: { totalRooms: 1, totalBeds: cap } });

    const dto = serializeRoomListItem(room);
    emitRoomSync(req.app.get('io'), { type: 'room:updated', room: dto, hostelId: room.hostelId });

    res.status(201).json({ success: true, message: 'Room created', data: { room: dto } });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: 'A room with this Room ID already exists for this course.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create room', error: e.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room || !room.course) {
      return res.status(404).json({ success: false, message: 'Course room not found' });
    }

    const { roomNo, capacity, roomNumber, roomId } = req.body;
    if (roomNo !== undefined) {
      const nextNo = String(roomNo).trim();
      if (!nextNo) return res.status(400).json({ success: false, message: 'Room number cannot be empty.' });
      room.roomNo = nextNo;
    }

    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (!Number.isFinite(cap) || cap < 1) {
        return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
      }
      if (cap < room.occupants.length) {
        return res.status(400).json({
          success: false,
          message: `Capacity cannot be lower than occupied beds (${room.occupants.length}).`,
        });
      }
      const delta = cap - room.capacity;
      room.capacity = cap;
      room.type = cap >= 4 ? 'DORMITORY' : cap === 3 ? 'TRIPLE' : cap === 2 ? 'DOUBLE' : 'SINGLE';
      if (delta !== 0) {
        await Hostel.findByIdAndUpdate(room.hostelId, { $inc: { totalBeds: delta } });
      }
    }

    const requestedCode = roomId || roomNumber;
    if (requestedCode && String(requestedCode).toUpperCase() !== room.roomNumber) {
      if (room.occupants.length > 0) {
        return res.status(400).json({ success: false, message: 'Cannot change the Room ID while students are assigned.' });
      }
      const nextCode = String(requestedCode).trim().toUpperCase();
      if (!isValidCourseRoomId(nextCode, room.course)) {
        return res.status(400).json({
          success: false,
          message: `Room ID must match ${room.course}001 format.`,
        });
      }
      room.roomNumber = nextCode;
    }

    syncOccupancyStatus(room);
    await room.save();

    if (room.roomNo) {
      await User.updateMany(
        { 'studentProfile.roomId': room._id },
        { $set: { 'studentProfile.roomNumber': room.roomNo, 'studentProfile.roomCode': room.roomNumber } }
      );
    }

    const populated = await Room.findById(room._id).populate('occupants', ROOM_POPULATE);
    const dto = serializeRoomListItem(populated);
    emitRoomSync(req.app.get('io'), { type: 'room:updated', room: dto, hostelId: room.hostelId });
    res.status(200).json({ success: true, message: 'Room updated', data: { room: dto } });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: 'A room with this Room ID already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to update room', error: e.message });
  }
};

exports.getMyRoom = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'STUDENT') {
      return res.status(403).json({ success: false, message: 'Students only.' });
    }

    const course = user.studentProfile?.course;
    const roomRef = user.studentProfile?.roomId;

    if (!roomRef) {
      return res.status(200).json({
        success: true,
        room: null,
        message: 'No room assigned',
        data: { room: null, course: course || null },
      });
    }

    const payload = await loadStudentRoomPayload(user);
    if (!payload) {
      return res.status(200).json({
        success: true,
        room: null,
        message: 'Room record not found',
        data: { room: null, course: course || null },
      });
    }

    return res.status(200).json({
      success: true,
      room: payload,
      message: 'Room details retrieved',
      data: { room: payload, course: payload.course ?? course },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch room', error: e.message });
  }
};

exports.requestRoomAllocation = async (req, res) => {
  const requester = await User.findById(req.user.userId).select('studentProfile.course').lean();
  const seeded = await ensureCourseRooms(requester?.studentProfile?.course);
  if (!seeded.ok) {
    return res.status(400).json({ success: false, message: seeded.message });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.user.userId).session(session);
    if (!user || user.role !== 'STUDENT') {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Students only.' });
    }

    if (user.studentProfile?.roomId) {
      await session.abortTransaction();
      const existingUser = await User.findById(user._id);
      const payload = await loadStudentRoomPayload(existingUser);
      return res.status(200).json({
        success: true,
        message: 'Student already has a room',
        room: payload,
        data: { room: payload },
      });
    }

    const course = user.studentProfile?.course;
    if (!isValidCourse(course)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Course is required for room allocation.' });
    }

    const allocation = await allocateCourseRoom(course, user._id, session);
    if (!allocation.ok) {
      await session.abortTransaction();
      return res.status(allocation.status || 400).json({
        success: false,
        message: allocation.message || NO_ROOMS_MESSAGE,
      });
    }

    await session.commitTransaction();
    return finishAllocation(req, res, { studentId: user._id, message: 'Room allocated successfully' });
  } catch (e) {
    if (session.inTransaction()) await session.abortTransaction();
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Allocation failed', error: e.message });
  } finally {
    session.endSession();
  }
};

exports.manualAllocate = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { studentId, roomId } = req.body;
    if (!studentId || !roomId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'studentId and roomId are required.' });
    }
    const allocation = await assignSpecificRoom({ studentId, roomId, session, mode: 'allocate' });
    if (!allocation.ok) {
      await session.abortTransaction();
      return res.status(allocation.status || 400).json({ success: false, message: allocation.message });
    }
    await session.commitTransaction();
    return finishAllocation(req, res, { studentId, message: 'Room allocated' });
  } catch (e) {
    if (session.inTransaction()) await session.abortTransaction();
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Allocation failed', error: e.message });
  } finally {
    session.endSession();
  }
};

exports.changeRoom = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { studentId, roomId } = req.body;
    if (!studentId || !roomId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'studentId and roomId are required.' });
    }
    const allocation = await assignSpecificRoom({ studentId, roomId, session, mode: 'change' });
    if (!allocation.ok) {
      await session.abortTransaction();
      return res.status(allocation.status || 400).json({ success: false, message: allocation.message });
    }
    await session.commitTransaction();
    return finishAllocation(req, res, { studentId, message: 'Room changed' });
  } catch (e) {
    if (session.inTransaction()) await session.abortTransaction();
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Could not change room', error: e.message });
  } finally {
    session.endSession();
  }
};

exports.vacateRoom = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { studentId } = req.body;
    if (!studentId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'studentId is required.' });
    }
    const result = await vacateStudentRoom(studentId, session);
    if (!result.ok) {
      await session.abortTransaction();
      return res.status(result.status || 400).json({ success: false, message: result.message });
    }
    await session.commitTransaction();

    const updatedUser = await User.findById(studentId);
    const roomDto = result.room ? serializeRoomListItem(await Room.findById(result.room._id).populate('occupants', ROOM_POPULATE)) : null;
    emitRoomSync(req.app.get('io'), {
      type: 'room:vacated',
      user: updatedUser,
      room: roomDto,
      hostelId: result.room?.hostelId,
    });
    res.status(200).json({ success: true, message: 'Room vacated', data: { room: roomDto, user: updatedUser } });
  } catch (e) {
    if (session.inTransaction()) await session.abortTransaction();
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Could not vacate room', error: e.message });
  } finally {
    session.endSession();
  }
};

exports.getRooms = async (req, res) => {
  try {
    const { course, search, status, q } = req.query;
    const filter = { course: { $ne: null } };
    if (course && course !== 'ALL') {
      if (!isValidCourse(course)) {
        return res.status(400).json({ success: false, message: 'Invalid course filter.' });
      }
      filter.course = course;
    }

    const term = (search || q || '').trim();
    if (term) {
      const rx = new RegExp(escapeRegex(term), 'i');
      filter.$or = [{ roomNumber: rx }, { roomNo: rx }, { course: rx }];
    }

    const normalized = String(status || '').toLowerCase();
    if (normalized === 'full' || normalized === 'occupied') {
      filter.$expr = { $gte: [{ $size: '$occupants' }, '$capacity'] };
    } else if (normalized === 'available') {
      filter.status = { $nin: ['MAINTENANCE', 'RESERVED'] };
      filter.$expr = { $lt: [{ $size: '$occupants' }, '$capacity'] };
    } else if (normalized === 'maintenance') {
      filter.status = 'MAINTENANCE';
    }

    const rooms = await Room.find(filter)
      .populate('occupants', ROOM_POPULATE)
      .sort({ course: 1, roomNumber: 1 });

    res.status(200).json({
      success: true,
      message: 'Rooms retrieved',
      data: { rooms: rooms.map((r) => serializeRoomListItem(r)) },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch rooms', error: e.message });
  }
};

exports.seedCourseRooms = async (req, res) => {
  try {
    const result = await ensureCourseRooms();
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.status(200).json({
      success: true,
      message: result.created
        ? `Created ${result.created} course rooms (001–020 per course).`
        : 'Course rooms already exist; no duplicates created.',
      data: { created: result.created },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Seed failed', error: e.message });
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

    emitRoomSync(req.app.get('io'), {
      type: 'room:updated',
      room: { _id: room._id, roomId: room.roomNumber, deleted: true },
      hostelId: room.hostelId,
    });

    res.status(200).json({ success: true, message: 'Room deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete room', error: e.message });
  }
};
