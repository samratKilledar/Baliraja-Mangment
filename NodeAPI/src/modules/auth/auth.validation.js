const { z } = require('zod');
const { ROLES } = require('../../utils/constants');

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.TEACHER,
    ROLES.STUDENT,
    ROLES.PARENT
  ]),
  phone: z.string().optional()
});

const loginSchema = z
  .object({
    identifier: z.string().min(3).optional(), // email or mobile number
    email: z.string().email().optional(),
    password: z.string().min(6)
  })
  .refine((data) => data.identifier || data.email, {
    message: 'identifier or email is required',
    path: ['identifier']
  });

module.exports = { registerSchema, loginSchema };
