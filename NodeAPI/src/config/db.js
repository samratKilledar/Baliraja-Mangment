const mongoose = require('mongoose');

async function connectDB(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    try {
      const collection = mongoose.connection.db.collection('attendances');
      await collection.dropIndex('studentId_1_date_1');
    } catch (error) {
      if (!/index not found/i.test(error.message || '')) {
        console.warn(`Attendance index update skipped: ${error.message}`);
      }
    }
    console.log('MongoDB connected');
  } catch (error) {
    console.error('DB connection failed:', error.message);
    throw error;
  }
}

module.exports = { connectDB };
