const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/auth_app';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    console.log(`[MongoDB] Database name: ${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.error(`\x1b[33m[MongoDB Warning]\x1b[0m Could not connect to MongoDB at ${mongoURI}`);
    console.error(`\x1b[36m[Notice]\x1b[0m The backend will run with graceful in-memory fallback enabled.`);
    console.error(`\x1b[36m[Tip]\x1b[0m To use your actual MongoDB database:`);
    console.error(`  1. Ensure MongoDB service is running locally ('mongod' or Windows Services)`);
    console.error(`  2. Or update MONGO_URI in 'backend/.env' with your MongoDB Atlas connection string.\n`);
  }
};

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('[MongoDB Event] Connection established');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('[MongoDB Event Error]', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('[MongoDB Event] Connection disconnected');
});

const isDBConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

module.exports = { connectDB, isDBConnected };
