const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./index');

const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1'];

function srvHost(uri) {
  const match = String(uri || '').match(/^mongodb\+srv:\/\/(?:[^@/]+@)?([^/?]+)/i);
  return match ? match[1] : '';
}

async function useResolvableDns(uri) {
  const host = srvHost(uri);
  if (!host) return;

  const record = `_mongodb._tcp.${host}`;
  try {
    await dns.promises.resolveSrv(record);
  } catch (error) {
    const retryable = ['ECONNREFUSED', 'ETIMEOUT', 'ESERVFAIL', 'EAI_AGAIN'].includes(error.code);
    if (!retryable) return;
    dns.setServers(PUBLIC_DNS);
    await dns.promises.resolveSrv(record);
    console.warn('Local DNS refused the MongoDB SRV lookup. Using public DNS for this process.');
  }
}

const connectDB = async () => {
  try {
    await useResolvableDns(config.mongoUri);
    const conn = await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected.');
});

module.exports = { connectDB };
