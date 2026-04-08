const { z } = require('zod');

exports.createItemSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1).max(150),
  category: z.string({ required_error: 'Category is required' }).min(1).max(100),
  vendor_id: z
    .string({ required_error: 'vendor_id is required' })
    .uuid('vendor_id must be a valid UUID'),
  cost_price: z
    .number({ required_error: 'cost_price is required' })
    .positive('cost_price must be positive'),
  selling_price: z
    .number({ required_error: 'selling_price is required' })
    .positive('selling_price must be positive'),
});

exports.updateItemSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  category: z.string().min(1).max(100).optional(),
  cost_price: z.number().positive('cost_price must be positive').optional(),
  selling_price: z.number().positive('selling_price must be positive').optional(),
  is_active: z.boolean().optional(),
});
