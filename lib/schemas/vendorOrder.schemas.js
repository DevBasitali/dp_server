const { z } = require('zod');

exports.createVendorOrderSchema = z.object({
  vendorId: z.string({ required_error: 'vendorId is required' }).uuid('vendorId must be a valid UUID'),
  branchId: z.string().uuid('branchId must be a valid UUID').optional(),
  notes: z.string().optional().nullable(),
});
