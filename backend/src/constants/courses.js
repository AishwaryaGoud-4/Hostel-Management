const STUDENT_COURSES = ['CSE', 'ECE', 'EEE', 'BSC', 'BBA'];

const isValidCourse = (course) => STUDENT_COURSES.includes(course);

module.exports = { STUDENT_COURSES, isValidCourse };
