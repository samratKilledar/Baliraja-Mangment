const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    roleTitle: { type: String, default: 'worker' },
    contractStart: Date,
    contractEnd: Date,
    totalContractAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    payments: [
      {
        amount: Number,
        paidOn: { type: Date, default: Date.now },
        note: String,
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Worker', workerSchema);
