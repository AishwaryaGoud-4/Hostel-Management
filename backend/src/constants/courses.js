const STUDENT_COURSES = ['CSE', 'ECE', 'EEE', 'BSC', 'BBA'];

const NO_ROOMS_MESSAGE = 'No rooms available for this course';

const isValidCourse = (course) => STUDENT_COURSES.includes(course);

module.exports = { STUDENT_COURSES, isValidCourse, NO_ROOMS_MESSAGE };
