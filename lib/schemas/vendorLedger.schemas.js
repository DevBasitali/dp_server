const { z } = require('zod');

exports.createInventorySchema = z.object({
  vendorId: z.string().uuid('vendorId must be a valid UUID'),
  branchId: z.string().uuid('branchId must be a valid UUID').optional(),
  amount: z.number({ required_error: 'amount is required' }).positive('amount must be positive'),
  description: z.string().min(1, 'description is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

exports.createPaymentSchema = z.object({
  vendorId: z.string().uuid('vendorId must be a valid UUID'),
  branchId: z.string().uuid('branchId must be a valid UUID').optional(),
  amount: z.number({ required_error: 'amount is required' }).positive('amount must be positive'),
  source: z.enum(['SALE', 'CAL'], { required_error: 'source must be SALE or CAL' }),
  description: z.string().min(1, 'description is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});
