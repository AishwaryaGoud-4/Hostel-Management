/**
 * Normalize room payloads from /auth/register, /auth/students, /rooms/me, /rooms/me/allocate.
 */
export function normalizeRoomPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const roomId = raw.roomId || raw.roomCode || null;
  const roomNumber = raw.roomNo || raw.roomNumber || null;
  if (!roomId && !roomNumber) return null;

  const capacity = Number(raw.capacity);
  const occupied =
    raw.occupied != null
      ? Number(raw.occupied)
      : raw.occupiedBeds != null
        ? Number(raw.occupiedBeds)
        : Array.isArray(raw.occupants)
          ? raw.occupants.length
          : null;

  const availableBeds =
    raw.availableBeds != null
      ? Number(raw.availableBeds)
      : Number.isFinite(capacity) && occupied != null
        ? Math.max(0, capacity - occupied)
        : null;

  const status = raw.statusLabel || raw.displayStatus || raw.status || null;

  return {
    roomId: roomId || roomNumber,
    roomCode: raw.roomCode || roomId || null,
    roomNumber: roomNumber || roomId,
    roomNo: raw.roomNo || roomNumber || null,
    course: raw.course ?? null,
    capacity: Number.isFinite(capacity) ? capacity : null,
    occupied: occupied != null && Number.isFinite(occupied) ? occupied : null,
    occupiedBeds: occupied != null && Number.isFinite(occupied) ? occupied : null,
    availableBeds,
    status,
  };
}

export function extractRoomFromRegisterResponse(res) {
  if (!res?.success) return null;

  const direct = normalizeRoomPayload(res.room);
  if (direct) return direct;

  const fromData = normalizeRoomPayload(res.data?.room);
  if (fromData) return fromData;

  const nested = res.data?.user?.studentProfile?.roomId;
  const profile = res.data?.user?.studentProfile;
  if (nested && typeof nested === 'object') {
    return normalizeRoomPayload({
      roomId: profile?.roomCode || nested.roomNumber,
      roomNumber: profile?.roomNumber || nested.roomNo || nested.roomNumber,
      roomNo: nested.roomNo,
      course: nested.course || profile?.course,
      capacity: nested.capacity,
      occupied: nested.occupants?.length,
      status: nested.status,
    });
  }

  return null;
}

export function extractRoomFromMeResponse(res) {
  if (!res?.success) return null;
  return (
    normalizeRoomPayload(res.room) ||
    normalizeRoomPayload(res.data?.room)
  );
}
