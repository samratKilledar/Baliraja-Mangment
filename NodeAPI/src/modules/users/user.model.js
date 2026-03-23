const mongoose = require('mongoose');
const { ROLES } = require('../../utils/constants');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

    passwordHash: {
      type: String,
      required: true
    },
    passwordCipher: {
      type: String,
      default: ''
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    profileRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'roleRefModel'
    },

    roleRefModel: {
      type: String,
      enum: [
        'Student',
        'Teacher',
        'Parent',
        'AdminProfile',
        'SuperAdminProfile',
        'Worker'
      ]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
