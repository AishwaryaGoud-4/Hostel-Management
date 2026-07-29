const mongoose = require('mongoose');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const User = require('../models/User');
const { paginateQuery } = require('../utils/helpers');

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
    if (room.occupants.length >= room.capacity) { await session.abortTransaction(); return res.status(400).json({ success: false, message: 'Room full' }); }

    room.occupants.push(new mongoose.Types.ObjectId(studentId));
    if (room.occupants.length >= room.capacity) room.status = 'OCCUPIED';
    await room.save({ session });

    await User.findByIdAndUpdate(studentId, { 'studentProfile.roomId': room._id, 'studentProfile.hostelId': room.hostelId }, { session });
    await Hostel.findByIdAndUpdate(room.hostelId, { $inc: { occupiedBeds: 1 } }, { session });
    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Room allocated', data: { room } });
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
    room.occupants = room.occupants.filter((id) => id.toString() !== studentId);
    if (room.occupants.length < room.capacity) room.status = 'AVAILABLE';
    await room.save({ session });
    await User.findByIdAndUpdate(studentId, { 'studentProfile.roomId': null, 'studentProfile.hostelId': null }, { session });
    await Hostel.findByIdAndUpdate(room.hostelId, { $inc: { occupiedBeds: -1 } }, { session });
    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Room deallocated', data: { room } });
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
