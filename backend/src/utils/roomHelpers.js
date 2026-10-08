const { parseCourseRoomSequence } = require('./courseRoomId');

const ROOM_RULES = [
  'Keep the room clean.',
  'Maintain hostel timings.',
  'Do not damage hostel property.',
  'Visitors must follow hostel rules.',
];

function formatFloor(floor) {
  const n = Number(floor);
  if (n === 0) return 'Ground Floor';
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix} Floor`;
}

function formatRoomType(type, capacity) {
  if (type === 'DORMITORY' || capacity >= 4) return `${capacity} Sharing`;
  if (type === 'TRIPLE') return '3 Sharing';
  if (type === 'DOUBLE') return '2 Sharing';
  return 'Single';
}

function occupantCount(room) {
  return Array.isArray(room?.occupants) ? room.occupants.length : 0;
}

/** Course room id stored in roomNumber, e.g. CSE001. */
function courseRoomCode(room) {
  return room?.roomNumber ? String(room.roomNumber).toUpperCase() : null;
}

/** Physical room number. Falls back to 101, 102… from the course sequence. */
function physicalRoomNumber(room) {
  if (room?.roomNo) return String(room.roomNo);
  const seq = room?.course ? parseCourseRoomSequence(room.roomNumber, room.course) : null;
  if (seq) return String(100 + seq);
  return room?.roomNumber ? String(room.roomNumber) : null;
}

function occupancyStatusLabel(room) {
  if (room?.status === 'MAINTENANCE') return 'Maintenance';
  if (occupantCount(room) >= Number(room?.capacity || 0)) return 'Full';
  return 'Available';
}

function syncOccupancyStatus(room) {
  if (!room) return room;
  if (room.status === 'MAINTENANCE' || room.status === 'RESERVED') return room;
  room.status = occupantCount(room) >= room.capacity ? 'OCCUPIED' : 'AVAILABLE';
  return room;
}

function studentRoomAssignment(room, assignedAt = new Date()) {
  return {
    'studentProfile.roomId': room._id,
    'studentProfile.hostelId': room.hostelId,
    'studentProfile.roomAssignedAt': assignedAt,
    'studentProfile.roomCode': courseRoomCode(room),
    'studentProfile.roomNumber': physicalRoomNumber(room),
  };
}

function clearedStudentRoom() {
  return {
    'studentProfile.roomId': null,
    'studentProfile.hostelId': null,
    'studentProfile.roomAssignedAt': null,
    'studentProfile.roomCode': null,
    'studentProfile.roomNumber': null,
  };
}

function serializeRoomListItem(room) {
  const occupied = occupantCount(room);
  const capacity = Number(room.capacity) || 0;
  const availableBeds = Math.max(0, capacity - occupied);
  const json = typeof room.toJSON === 'function' ? room.toJSON() : { ...room };
  const code = courseRoomCode(room);
  const number = physicalRoomNumber(room);
  return {
    ...json,
    roomId: code,
    roomCode: code,
    roomNo: number,
    occupied,
    occupiedBeds: occupied,
    available: availableBeds,
    availableBeds,
    statusLabel: occupancyStatusLabel(room),
    displayStatus: occupancyStatusLabel(room),
  };
}

function buildMyRoomResponse({ room, hostel, user, studentUserId }) {
  const occupied = occupantCount(room);
  const availableBeds = Math.max(0, room.capacity - occupied);
  const status = occupancyStatusLabel(room);
  const block = room.block || 'A';
  const assignedAt = user.studentProfile?.roomAssignedAt || user.updatedAt;
  const code = courseRoomCode(room);
  const number = user.studentProfile?.roomNumber || physicalRoomNumber(room);

  const roommates = (room.occupants || []).map((o) => {
    const id = o._id ? o._id.toString() : String(o);
    const hasName = Boolean(o.firstName || o.lastName);
    return {
      id,
      name: hasName ? `${o.firstName || ''} ${o.lastName || ''}`.trim() : 'Student',
      course: o.studentProfile?.course || room.course,
      isYou: id === studentUserId.toString(),
    };
  });

  return {
    roomId: code,
    roomCode: code,
    roomNumber: number,
    roomNo: number,
    course: room.course,
    block,
    floor: room.floor,
    floorLabel: formatFloor(room.floor),
    capacity: room.capacity,
    occupied,
    occupiedBeds: occupied,
    availableBeds,
    status,
    statusLabel: status,
    roomType: formatRoomType(room.type, room.capacity),
    dbStatus: room.status,
    assignedAt,
    allocationType: 'Automatic',
    allocationNote: room.course ? `Random ${room.course} room` : 'Automatic',
    amenities: room.amenities || [],
    utilityUsage: room.utilityUsage,
    monthlyRent: room.monthlyRent,
    hostelFacilities: hostel?.facilities || [],
    hostel: hostel
      ? {
          id: hostel._id,
          name: hostel.name,
          code: hostel.code,
          address: hostel.address,
          contactNumber: hostel.contactNumber,
        }
      : null,
    roommates,
    rules: ROOM_RULES,
  };
}

module.exports = {
  ROOM_RULES,
  formatFloor,
  formatRoomType,
  occupantCount,
  courseRoomCode,
  physicalRoomNumber,
  occupancyStatusLabel,
  syncOccupancyStatus,
  studentRoomAssignment,
  clearedStudentRoom,
  serializeRoomListItem,
  buildMyRoomResponse,
  roomDisplayStatus: occupancyStatusLabel,
};
