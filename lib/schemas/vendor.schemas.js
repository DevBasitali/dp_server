const { z } = require('zod');

exports.createVendorSchema = z.object({
  name: z.string({ required_error: 'Vendor name is required' }).min(1).max(100),
  whatsapp_number: z
    .string({ required_error: 'whatsapp_number is required' })
    .min(1)
    .max(20),
  phone: z.string().max(20).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  branch_ids: z
    .array(z.string().uuid('Each branch_id must be a valid UUID'))
    .optional(),
});

exports.updateVendorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  whatsapp_number: z.string().max(20).optional(),
  phone: z.string().max(20).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});
