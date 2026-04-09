const { z } = require('zod');

exports.createDailyClosingSchema = z.object({
  branchId: z.string().uuid('branchId must be a valid UUID').optional(),
  closingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'closingDate must be YYYY-MM-DD')
    .optional(),
  cashSales: z.number({ required_error: 'cashSales is required' }).min(0, 'cashSales cannot be negative'),
  easypaisaSales: z.number({ required_error: 'easypaisaSales is required' }).min(0, 'easypaisaSales cannot be negative'),
  dailyExpense: z.number({ required_error: 'dailyExpense is required' }).min(0, 'dailyExpense cannot be negative'),
  notes: z.string().optional().nullable(),
});

exports.updateDailyClosingSchema = z.object({
  cashSales: z.number().min(0, 'cashSales cannot be negative').optional(),
  easypaisaSales: z.number().min(0, 'easypaisaSales cannot be negative').optional(),
  dailyExpense: z.number().min(0, 'dailyExpense cannot be negative').optional(),
  notes: z.string().optional().nullable(),
});
