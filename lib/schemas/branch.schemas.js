const { z } = require('zod');

exports.createBranchSchema = z.object({
  name: z.string({ required_error: 'Branch name is required' }).min(1).max(100),
  location: z.string().max(500).optional().nullable(),
  manager_id: z.string().uuid('manager_id must be a valid UUID').optional().nullable(),
});

exports.updateBranchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: z.string().max(500).optional().nullable(),
  manager_id: z.string().uuid('manager_id must be a valid UUID').optional().nullable(),
  is_active: z.boolean().optional(),
});
