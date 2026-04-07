const { z } = require('zod');

const ROLES = ['owner', 'branch_manager', 'vendor'];

exports.createUserSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1).max(100),
  email: z.string({ required_error: 'Email is required' }).email('Invalid email format').max(150),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(ROLES, {
    required_error: 'Role is required',
    message: `Role must be one of: ${ROLES.join(', ')}`,
  }),
  branch_id: z.string().uuid('branch_id must be a valid UUID').optional().nullable(),
  vendor_id: z.string().uuid('vendor_id must be a valid UUID').optional().nullable(),
});

exports.updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email format').max(150).optional(),
  role: z
    .enum(ROLES, { message: `Role must be one of: ${ROLES.join(', ')}` })
    .optional(),
  branch_id: z.string().uuid('branch_id must be a valid UUID').optional().nullable(),
  vendor_id: z.string().uuid('vendor_id must be a valid UUID').optional().nullable(),
  is_active: z.boolean().optional(),
});
