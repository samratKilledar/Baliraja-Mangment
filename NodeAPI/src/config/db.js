const mongoose = require('mongoose');

async function connectDB(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('DB connection failed:', error.message);
    throw error;
  }
}

module.exports = { connectDB };
