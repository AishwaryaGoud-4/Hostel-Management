const assert = require('assert');
const { formatCourseRoomId, isValidCourseRoomId } = require('../src/utils/courseRoomId');
const {
  physicalRoomNumber,
  occupancyStatusLabel,
  courseRoomCode,
} = require('../src/utils/roomHelpers');
const { NO_ROOMS_MESSAGE, STUDENT_COURSES } = require('../src/constants/courses');

assert.deepStrictEqual(STUDENT_COURSES, ['CSE', 'ECE', 'EEE', 'BSC', 'BBA']);
assert.strictEqual(NO_ROOMS_MESSAGE, 'No rooms available for this course');

for (const course of STUDENT_COURSES) {
  assert.strictEqual(formatCourseRoomId(course, 1), `${course}001`);
  assert.strictEqual(formatCourseRoomId(course, 20), `${course}020`);
  assert.strictEqual(isValidCourseRoomId(`${course}001`, course), true);
  assert.strictEqual(isValidCourseRoomId('ECE001', course === 'ECE' ? 'ECE' : 'CSE'), course === 'ECE');
}

assert.strictEqual(isValidCourseRoomId('CSE001', 'ECE'), false);
assert.strictEqual(isValidCourseRoomId('CSE1', 'CSE'), false);

const partial = { course: 'CSE', roomNumber: 'CSE003', occupants: [{}, {}], capacity: 4, status: 'AVAILABLE' };
assert.strictEqual(courseRoomCode(partial), 'CSE003');
assert.strictEqual(physicalRoomNumber(partial), '103');
assert.strictEqual(occupancyStatusLabel(partial), 'Available');

const numbered = { ...partial, roomNo: '214', occupants: [{}, {}, {}, {}], capacity: 4 };
assert.strictEqual(physicalRoomNumber(numbered), '214');
assert.strictEqual(occupancyStatusLabel(numbered), 'Full');
assert.strictEqual(occupancyStatusLabel({ occupants: [], capacity: 2, status: 'MAINTENANCE' }), 'Maintenance');

console.log('Course room rules passed.');
