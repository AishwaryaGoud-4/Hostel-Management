require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  corsOrigin: (() => {
    const origins = process.env.CORS_ORIGIN || 'http://localhost:3000,https://hostel-management-seven-wheat.vercel.app';
    const list = origins.split(',').map(o => o.trim()).filter(Boolean);
    return list.length === 1 ? list[0] : list;
  })(),
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
};
