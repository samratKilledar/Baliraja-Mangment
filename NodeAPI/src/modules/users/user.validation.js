const { z } = require('zod');
const { ROLES } = require('../../utils/constants');

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}, z.number().optional());

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.nativeEnum(ROLES),
  password: z.string().min(6).optional(),

  // Student specific
  enrollmentNo: z.string().optional(),
  batchId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  details: z.record(z.any()).optional(),
  feeAmount: optionalNumber,
  feeDueDate: z.string().optional(),
  feeStartDate: z.string().optional(),
  feeEndDate: z.string().optional(),
  courseId: z.string().optional(),
  admissionDate: z.string().optional(),
  feeFrom: z.string().optional(),
  feeTo: z.string().optional(),

  // Teacher specific
  specialization: z.array(z.string()).optional(),
  experienceYears: optionalNumber,
  monthlySalary: optionalNumber,

  // Worker specific
  roleTitle: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  totalContractAmount: optionalNumber
});

const listUserSchema = z.object({
  role: z.nativeEnum(ROLES).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(6)
});

module.exports = {
  createUserSchema,
  listUserSchema,
  passwordUpdateSchema,
  resetUserPasswordSchema
};
