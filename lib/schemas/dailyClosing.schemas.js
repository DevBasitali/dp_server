const { z } = require('zod');

const expenseSchema = z.object({
  description: z.string().min(1, 'description is required'),
  amount: z.number({ required_error: 'amount is required' }).positive('amount must be positive'),
  source: z.enum(['SALE', 'CAL'], { required_error: 'source must be SALE or CAL' }),
});

exports.createDailyClosingSchema = z.object({
  branchId: z.string().uuid('branchId must be a valid UUID').optional(),
  closingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'closingDate must be YYYY-MM-DD')
    .optional(),
  cashSales: z.number({ required_error: 'cashSales is required' }).min(0, 'cashSales cannot be negative'),
  easypaisaSales: z.number({ required_error: 'easypaisaSales is required' }).min(0, 'easypaisaSales cannot be negative'),
  notes: z.string().optional().nullable(),
  expenses: z.array(expenseSchema).optional().default([]),
});

exports.updateDailyClosingSchema = z.object({
  cashSales: z.number().min(0, 'cashSales cannot be negative').optional(),
  easypaisaSales: z.number().min(0, 'easypaisaSales cannot be negative').optional(),
  notes: z.string().optional().nullable(),
  expenses: z.array(expenseSchema).optional(),
});
