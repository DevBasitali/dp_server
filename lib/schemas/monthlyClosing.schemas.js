const { z } = require('zod');

exports.createMonthlyClosingSchema = z.object({
  month: z
    .number({ required_error: 'month is required' })
    .int()
    .min(1, 'month must be between 1 and 12')
    .max(12, 'month must be between 1 and 12'),
  year: z
    .number({ required_error: 'year is required' })
    .int()
    .min(2020, 'year must be 2020 or later'),
  branchId: z.string().uuid().optional(),
});
