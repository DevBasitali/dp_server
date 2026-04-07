const { z } = require('zod');

exports.loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email format'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

exports.changePasswordSchema = z.object({
  current_password: z.string({ required_error: 'current_password is required' }).min(1),
  new_password: z
    .string({ required_error: 'new_password is required' })
    .min(8, 'New password must be at least 8 characters'),
});
