const mongoose = require('mongoose');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const User = require('../models/User');
const { paginateQuery } = require('../utils/helpers');
const { isValidCourse, NO_ROOMS_MESSAGE } = require('../constants/courses');
const {
  syncOccupancyStatus,
  studentRoomAssignment,
  clearedStudentRoom,
  serializeRoomListItem,
} = require('../utils/roomHelpers');
const { emitRoomSync } = require('../utils/roomEvents');
const { notifyUser } = require('../utils/realtime');

async function announceAllocation(req, studentId, room) {
  const io = req.app.get('io');
  if (!io) return;
  const student = await User.findById(studentId);
  const summary = serializeRoomListItem(room);
  emitRoomSync(io, { type: 'room:allocated', user: student, room: summary });
  await notifyUser(io, studentId, {
    senderId: req.user.userId, type: 'ROOM',
    title: 'Room assigned', message: `You have been assigned room ${summary.roomId || room.roomNumber}.`,
    data: { roomId: room._id },
  });
}

// ===== HOSTEL =====
exports.createHostel = async (req, res) => {
  try {
    const hostel = await Hostel.create(req.body);
    res.status(201).json({ success: true, message: 'Hostel created', data: { hostel } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getAllHostels = async (req, res) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const { skip } = paginateQuery(Number(page), Number(limit));
    const [hostels, total] = await Promise.all([
      Hostel.find(filter).populate('wardenId', 'firstName lastName email phone').skip(skip).limit(Number(limit)),
      Hostel.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true, message: 'Hostels retrieved', data: { hostels },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getHostelById = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id).populate('wardenId', 'firstName lastName email phone');
    if (!hostel) return res.status(404).json({ success: false, message: 'Not found' });
    const rooms = await Room.find({ hostelId: hostel._id });
    res.status(200).json({ success: true, message: 'Hostel retrieved', data: { hostel, rooms } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.updateHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!hostel) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, message: 'Updated', data: { hostel } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.deleteHostel = async (req, res) => {
  try {
    await Hostel.findByIdAndUpdate(req.params.id, { isActive: false });
    res.status(200).json({ success: true, message: 'Hostel deactivated' });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getHostelStats = async (req, res) => {
  try {
    const stats = await Hostel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalHostels: { $sum: 1 }, totalBeds: { $sum: '$totalBeds' }, occupiedBeds: { $sum: '$occupiedBeds' } } },
    ]);
    const roomStats = await Room.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.status(200).json({ success: true, message: 'Stats', data: { overview: stats[0] || {}, roomsByStatus: roomStats } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ===== ROOM =====
exports.createRoom = async (req, res) => {
  try {
    const room = await Room.create(req.body);
    await Hostel.findByIdAndUpdate(req.body.hostelId, { $inc: { totalRooms: 1, totalBeds: room.capacity } });
    res.status(201).json({ success: true, message: 'Room created', data: { room } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getRoomsByHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const { floor, status, type, page = 1, limit = 50 } = req.query;
    const filter = { hostelId };
    if (floor) filter.floor = Number(floor);
    if (status) filter.status = status;
    if (type) filter.type = type;
    const { skip } = paginateQuery(Number(page), Number(limit));
    const [rooms, total] = await Promise.all([
      Room.find(filter).populate('occupants', 'firstName lastName email studentProfile.rollNumber').skip(skip).limit(Number(limit)),
      Room.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true, message: 'Rooms retrieved', data: { rooms },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.allocateRoom = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { roomId, studentId } = req.body;
    const room = await Room.findById(roomId).session(session);
    if (!room) { await session.abortTransaction(); return res.status(404).json({ success: false, message: 'Room not found' }); }

    const student = await User.findById(studentId).session(session);
    if (!student || student.role !== 'STUDENT') {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (student.studentProfile?.roomId) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Student already has a room. Change the room instead of creating another allocation.' });
    }
    if (room.course && isValidCourse(student.studentProfile?.course) && room.course !== student.studentProfile.course) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Students can only be allocated to rooms for their own course.' });
    }
    if (room.occupants.some((id) => id.toString() === String(studentId))) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Student is already assigned to this room.' });
    }
    if (room.occupants.length >= room.capacity) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'This room is full.' });
    }

    room.occupants.push(new mongoose.Types.ObjectId(studentId));
    syncOccupancyStatus(room);
    await room.save({ session });

    await User.findByIdAndUpdate(studentId, studentRoomAssignment(room), { session });
    await Hostel.findByIdAndUpdate(room.hostelId, { $inc: { occupiedBeds: 1 } }, { session });
    await session.commitTransaction();

    const dto = serializeRoomListItem(room);
    emitRoomSync(req.app.get('io'), { type: 'room:allocated', user: student, room: dto, hostelId: room.hostelId });
    res.status(200).json({ success: true, message: 'Room allocated', data: { room: dto } });
  } catch (e) { await session.abortTransaction(); res.status(500).json({ success: false, message: 'Allocation failed', error: e.message }); }
  finally { session.endSession(); }
};

exports.deallocateRoom = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { roomId, studentId } = req.body;
    const room = await Room.findById(roomId).session(session);
    if (!room) { await session.abortTransaction(); return res.status(404).json({ success: false, message: 'Room not found' }); }
    const before = room.occupants.length;
    room.occupants = room.occupants.filter((id) => id.toString() !== String(studentId));
    const removed = room.occupants.length < before;
    syncOccupancyStatus(room);
    await room.save({ session });
    if (removed) {
      await User.findByIdAndUpdate(studentId, { $set: clearedStudentRoom() }, { session });
      await Hostel.findByIdAndUpdate(room.hostelId, { $inc: { occupiedBeds: -1 } }, { session });
    }
    await session.commitTransaction();
    const dto = serializeRoomListItem(room);
    const student = await User.findById(studentId);
    emitRoomSync(req.app.get('io'), { type: 'room:vacated', user: student, room: dto, hostelId: room.hostelId });
    res.status(200).json({ success: true, message: 'Room deallocated', data: { room: dto } });
  } catch (e) { await session.abortTransaction(); res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
  finally { session.endSession(); }
};

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, message: 'Updated', data: { room } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ===== SMART ROOM ALLOCATION =====
exports.autoAllocateRoom = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { studentId, hostelId, preferredFloor, preferredType } = req.body;
    const student = await User.findById(studentId);
    if (!student) { await session.abortTransaction(); return res.status(404).json({ success: false, message: 'Student not found' }); }
    if (student.studentProfile?.roomId) { await session.abortTransaction(); return res.status(400).json({ success: false, message: 'Student already has a room assigned' }); }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) { await session.abortTransaction(); return res.status(404).json({ success: false, message: 'Hostel not found' }); }

    // Build room query: find rooms with available beds
    const roomFilter = { hostelId, status: { $in: ['AVAILABLE'] } };
    const studentCourse = student.studentProfile?.course;
    if (isValidCourse(studentCourse)) roomFilter.course = studentCourse;
    if (preferredFloor) roomFilter.floor = preferredFloor;
    if (preferredType) roomFilter.type = preferredType;

    let rooms = await Room.find(roomFilter).session(session);

    // If no rooms match preferences, broaden the search
    if (rooms.length === 0 && isValidCourse(student.studentProfile?.course)) {
      rooms = await Room.find({
        hostelId,
        course: student.studentProfile.course,
        status: { $nin: ['MAINTENANCE', 'RESERVED'] },
      }).session(session);
    } else if (rooms.length === 0) {
      rooms = await Room.find({ hostelId, status: { $in: ['AVAILABLE'] } }).session(session);
    }

    // Filter rooms with available capacity
    const availableRooms = rooms.filter(r => r.occupants.length < r.capacity);

    if (availableRooms.length === 0) {
      await session.abortTransaction();
      const message = isValidCourse(student.studentProfile?.course)
        ? NO_ROOMS_MESSAGE
        : 'No available rooms in this hostel';
      return res.status(400).json({ success: false, message });
    }

    // Scoring algorithm: prefer rooms that match student preferences
    const studentYear = student.studentProfile?.year || 1;
    const budgetPref = student.studentProfile?.budgetPreference || 'STANDARD';

    const scored = availableRooms.map(room => {
      let score = 0;

      // Prefer rooms with fewer occupants for comfort
      score += (room.capacity - room.occupants.length) * 10;

      // Year matching: prefer grouping same-year students
      // (We can't check other occupants' years without more queries, so skip for now)

      // Budget matching
      if (budgetPref === 'ECONOMY' && !room.isAirConditioned) score += 20;
      if (budgetPref === 'PREMIUM' && room.isAirConditioned) score += 20;
      if (budgetPref === 'STANDARD') score += 10;

      // Preferred floor bonus
      if (preferredFloor && room.floor === preferredFloor) score += 15;

      // Lower floor preferred for freshers
      if (studentYear === 1 && room.floor <= 1) score += 10;

      return { room, score };
    });

    // Sort by score descending, pick the best
    scored.sort((a, b) => b.score - a.score);
    const bestRoom = scored[0].room;

    // Allocate
    bestRoom.occupants.push(new mongoose.Types.ObjectId(studentId));
    syncOccupancyStatus(bestRoom);
    await bestRoom.save({ session });

    await User.findByIdAndUpdate(studentId, studentRoomAssignment(bestRoom), { session });

    await Hostel.findByIdAndUpdate(bestRoom.hostelId, { $inc: { occupiedBeds: 1 } }, { session });
    await session.commitTransaction();

    // Activity log
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      userId: req.user.userId, userRole: req.user.role, action: 'ROOM_ALLOCATED',
      description: `Auto-allocated room ${bestRoom.roomNumber} to ${student.firstName} ${student.lastName}`,
      targetType: 'Room', targetId: bestRoom._id,
      metadata: { studentId, roomNumber: bestRoom.roomNumber, score: scored[0].score },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    // Socket notification
    await announceAllocation(req, studentId, bestRoom);

    res.status(200).json({
      success: true,
      message: `Auto-allocated room ${bestRoom.roomNumber} (Floor ${bestRoom.floor}, Score: ${scored[0].score})`,
      data: { room: bestRoom, score: scored[0].score, alternatives: scored.slice(1, 4).map(s => ({ roomNumber: s.room.roomNumber, floor: s.room.floor, score: s.score })) },
    });
  } catch (e) { await session.abortTransaction(); res.status(500).json({ success: false, message: 'Auto-allocation failed', error: e.message }); }
  finally { session.endSession(); }
};

// ===== UNASSIGNED STUDENTS =====
exports.getUnassignedStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {
      role: 'STUDENT',
      isActive: true,
      $or: [
        { 'studentProfile.roomId': null },
        { 'studentProfile.roomId': { $exists: false } },
      ],
    };
    if (search) {
      filter.$and = [{
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'studentProfile.rollNumber': { $regex: search, $options: 'i' } },
        ],
      }];
    }
    const { skip } = paginateQuery(Number(page), Number(limit));
    const [students, total] = await Promise.all([
      User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true, message: 'Unassigned students retrieved', data: { students },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ===== REASSIGN ROOM =====
exports.reassignRoom = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { studentId, newRoomId } = req.body;
    const student = await User.findById(studentId).session(session);
    if (!student) { await session.abortTransaction(); return res.status(404).json({ success: false, message: 'Student not found' }); }

    const oldRoomId = student.studentProfile?.roomId;

    // Remove from old room if exists
    if (oldRoomId) {
      const oldRoom = await Room.findById(oldRoomId).session(session);
      if (oldRoom) {
        oldRoom.occupants = oldRoom.occupants.filter((id) => id.toString() !== studentId);
        syncOccupancyStatus(oldRoom);
        await oldRoom.save({ session });
        await Hostel.findByIdAndUpdate(oldRoom.hostelId, { $inc: { occupiedBeds: -1 } }, { session });
      }
    }

    // Add to new room
    const newRoom = await Room.findById(newRoomId).session(session);
    if (!newRoom) { await session.abortTransaction(); return res.status(404).json({ success: false, message: 'New room not found' }); }
    if (newRoom.course && isValidCourse(student.studentProfile?.course) && newRoom.course !== student.studentProfile.course) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Students can only be allocated to rooms for their own course.' });
    }
    if (newRoom.occupants.length >= newRoom.capacity) { await session.abortTransaction(); return res.status(400).json({ success: false, message: 'New room is full' }); }
    if (newRoom.occupants.some((id) => id.toString() === String(studentId))) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Student is already assigned to this room.' });
    }

    newRoom.occupants.push(new mongoose.Types.ObjectId(studentId));
    syncOccupancyStatus(newRoom);
    await newRoom.save({ session });

    await User.findByIdAndUpdate(studentId, studentRoomAssignment(newRoom), { session });
    await Hostel.findByIdAndUpdate(newRoom.hostelId, { $inc: { occupiedBeds: 1 } }, { session });

    await session.commitTransaction();

    // Socket notification
    await announceAllocation(req, studentId, newRoom);

    res.status(200).json({ success: true, message: `Room reassigned to ${newRoom.roomNumber}`, data: { room: newRoom } });
  } catch (e) { await session.abortTransaction(); res.status(500).json({ success: false, message: 'Reassignment failed', error: e.message }); }
  finally { session.endSession(); }
};

// ===== SEED ROOMS (A1-J100) & RESET STUDENT ASSIGNMENTS =====
exports.seedRooms = async (req, res) => {
  try {
    const { hostelId } = req.body;
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found' });

    // 1. Reset all student room assignments
    await User.updateMany(
      { role: 'STUDENT' },
      { $set: { 'studentProfile.roomId': null, 'studentProfile.hostelId': null, 'studentProfile.roomCode': null, 'studentProfile.roomNumber': null, 'studentProfile.roomAssignedAt': null } }
    );

    // 2. Remove existing rooms for this hostel (clean slate)
    await Room.deleteMany({ hostelId });

    // 3. Create 1000 rooms: A1-A100 through J1-J100
    const blocks = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const rooms = [];
    for (let bi = 0; bi < blocks.length; bi++) {
      for (let num = 1; num <= 100; num++) {
        rooms.push({
          hostelId,
          roomNumber: `${blocks[bi]}${num}`,
          floor: bi, // Block A = floor 0, B = floor 1, etc.
          type: 'SINGLE',
          status: 'AVAILABLE',
          capacity: 1,
          occupants: [],
          amenities: [],
          monthlyRent: 5000,
          isAirConditioned: false,
          hasAttachedBathroom: false,
        });
      }
    }
    await Room.insertMany(rooms);

    // 4. Update hostel stats
    await Hostel.findByIdAndUpdate(hostelId, {
      totalRooms: 1000,
      totalBeds: 1000,
      occupiedBeds: 0,
    });

    res.status(200).json({
      success: true,
      message: `Seeded 1000 rooms (A1-J100) and reset all student room assignments`,
      data: { totalRooms: 1000, blocks: blocks.length },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Seed failed', error: e.message }); }
};
