const { v4: uuidv4 } = require('uuid');

const generateTicketId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${ts}-${rand}`;
};

const generateInvoiceId = () => {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}-${rand}`;
};

const generatePassId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GP-${ts}-${rand}`;
};

const calculateLateFee = (dueDate, perDayFee) => {
  const now = new Date();
  if (now <= dueDate) return 0;
  const diffDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays * perDayFee;
};

const isWithinGeofence = (lat1, lon1, lat2, lon2, radiusMeters) => {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusMeters;
};

const paginateQuery = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: Math.min(limit, 100) };
};

module.exports = { generateTicketId, generateInvoiceId, generatePassId, calculateLateFee, isWithinGeofence, paginateQuery, generateUUID: uuidv4 };
