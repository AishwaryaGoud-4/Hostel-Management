const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Clear existing data
    await Promise.all([User.deleteMany({}), Hostel.deleteMany({}), Room.deleteMany({})]);
    console.log('🗑️  Cleared existing data');

    const password = await bcrypt.hash('Password@123', 12);

    // Create Super Admin
    const admin = await User.create({
      firstName: 'Super', lastName: 'Admin', email: 'admin@shms.com',
      password, role: 'SUPER_ADMIN', phone: '9999999999',
    });

    // Create Wardens
    const warden1 = await User.create({
      firstName: 'Rajesh', lastName: 'Kumar', email: 'warden1@shms.com',
      password, role: 'WARDEN', phone: '9888888888',
      staffProfile: { employeeId: 'WRD001', department: 'Hostel Administration', specialization: 'Student Welfare' },
    });
    const warden2 = await User.create({
      firstName: 'Priya', lastName: 'Sharma', email: 'warden2@shms.com',
      password, role: 'WARDEN', phone: '9777777777',
      staffProfile: { employeeId: 'WRD002', department: 'Hostel Administration', specialization: 'Discipline' },
    });

    // Create Staff
    const staff1 = await User.create({
      firstName: 'Vikram', lastName: 'Singh', email: 'staff1@shms.com',
      password, role: 'STAFF', phone: '9666666666',
      staffProfile: { employeeId: 'STF001', department: 'Maintenance', specialization: 'Electrical' },
    });

    // Create Hostels
    const hostel1 = await Hostel.create({
      name: 'Vivekananda Boys Hostel', code: 'VBH', type: 'BOYS',
      address: 'North Campus, University Road', totalFloors: 4, totalRooms: 0, totalBeds: 0,
      wardenId: warden1._id, facilities: ['WiFi', 'Gym', 'Laundry', 'Mess', 'Common Room', 'Study Hall'],
      contactNumber: '0401234567', geoLocation: { latitude: 17.3850, longitude: 78.4867, radiusMeters: 250 },
      monthlyRent: { economy: 5000, standard: 8000, premium: 12000 },
    });
    const hostel2 = await Hostel.create({
      name: 'Sarojini Girls Hostel', code: 'SGH', type: 'GIRLS',
      address: 'South Campus, Park Lane', totalFloors: 3, totalRooms: 0, totalBeds: 0,
      wardenId: warden2._id, facilities: ['WiFi', 'Laundry', 'Mess', 'Common Room', 'Library', 'Terrace Garden'],
      contactNumber: '0407654321', geoLocation: { latitude: 17.3860, longitude: 78.4900, radiusMeters: 200 },
      monthlyRent: { economy: 5500, standard: 8500, premium: 13000 },
    });

    // Create Rooms for Hostel 1
    const roomTypes = ['SINGLE', 'DOUBLE', 'TRIPLE'];
    const rooms1 = [];
    for (let floor = 1; floor <= 4; floor++) {
      for (let r = 1; r <= 10; r++) {
        const typeIdx = (r - 1) % 3;
        const type = roomTypes[typeIdx];
        const capacity = type === 'SINGLE' ? 1 : type === 'DOUBLE' ? 2 : 3;
        rooms1.push({
          hostelId: hostel1._id, roomNumber: `${floor}${String(r).padStart(2, '0')}`,
          floor, type, capacity,
          monthlyRent: type === 'SINGLE' ? 12000 : type === 'DOUBLE' ? 8000 : 5000,
          amenities: ['Bed', 'Desk', 'Wardrobe', 'Fan'],
          isAirConditioned: r <= 3,
          hasAttachedBathroom: type === 'SINGLE',
          utilityUsage: { electricity: Math.floor(Math.random() * 150) + 30, water: Math.floor(Math.random() * 2000) + 500 },
        });
      }
    }
    await Room.insertMany(rooms1);

    // Create Rooms for Hostel 2
    const rooms2 = [];
    for (let floor = 1; floor <= 3; floor++) {
      for (let r = 1; r <= 8; r++) {
        const typeIdx = (r - 1) % 3;
        const type = roomTypes[typeIdx];
        const capacity = type === 'SINGLE' ? 1 : type === 'DOUBLE' ? 2 : 3;
        rooms2.push({
          hostelId: hostel2._id, roomNumber: `${floor}${String(r).padStart(2, '0')}`,
          floor, type, capacity,
          monthlyRent: type === 'SINGLE' ? 13000 : type === 'DOUBLE' ? 8500 : 5500,
          amenities: ['Bed', 'Desk', 'Wardrobe', 'Fan', 'Mirror'],
          isAirConditioned: r <= 2,
          hasAttachedBathroom: type === 'SINGLE',
          utilityUsage: { electricity: Math.floor(Math.random() * 120) + 20, water: Math.floor(Math.random() * 1800) + 400 },
        });
      }
    }
    await Room.insertMany(rooms2);

    // Update hostel counts
    const h1Rooms = await Room.find({ hostelId: hostel1._id });
    const h2Rooms = await Room.find({ hostelId: hostel2._id });
    await Hostel.findByIdAndUpdate(hostel1._id, { totalRooms: h1Rooms.length, totalBeds: h1Rooms.reduce((s, r) => s + r.capacity, 0) });
    await Hostel.findByIdAndUpdate(hostel2._id, { totalRooms: h2Rooms.length, totalBeds: h2Rooms.reduce((s, r) => s + r.capacity, 0) });

    // Create Students
    const students = [];
    const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical'];
    const courses = ['B.Tech', 'M.Tech', 'B.Sc', 'M.Sc'];
    for (let i = 1; i <= 20; i++) {
      students.push({
        firstName: `Student${i}`, lastName: `User${i}`, email: `student${i}@shms.com`,
        password, role: 'STUDENT', phone: `98${String(i).padStart(8, '0')}`,
        studentProfile: {
          rollNumber: `2024CS${String(i).padStart(3, '0')}`,
          course: courses[i % courses.length],
          year: (i % 4) + 1,
          department: departments[i % departments.length],
          guardianName: `Guardian ${i}`, guardianPhone: `97${String(i).padStart(8, '0')}`,
          address: `House ${i}, Sector ${i + 10}, City`,
          dateOfBirth: new Date(2002, i % 12, (i % 28) + 1),
          bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-'][i % 5],
          sleepPreference: ['EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE'][i % 3],
          budgetPreference: ['ECONOMY', 'STANDARD', 'PREMIUM'][i % 3],
          admissionDate: new Date(2024, 6, 1),
        },
      });
    }
    await User.insertMany(students);

    console.log('\n✅ Seed completed successfully!');
    console.log('━'.repeat(50));
    console.log('📧 Admin:   admin@shms.com     / Password@123');
    console.log('📧 Warden1: warden1@shms.com   / Password@123');
    console.log('📧 Warden2: warden2@shms.com   / Password@123');
    console.log('📧 Staff:   staff1@shms.com    / Password@123');
    console.log('📧 Students: student1@shms.com - student20@shms.com / Password@123');
    console.log(`🏠 Hostels: ${hostel1.name} (${h1Rooms.length} rooms), ${hostel2.name} (${h2Rooms.length} rooms)`);
    console.log('━'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
