const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// List all users
exports.listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branch_id: true,
        vendor_id: true,
        is_active: true,
        created_at: true
      }
    });
    res.json({ success: true, data: users, message: 'Users retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, branch_id, vendor_id } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role,
        branch_id,
        vendor_id
      },
      select: { id: true, name: true, email: true, role: true }
    });

    res.status(201).json({ success: true, data: newUser, message: 'User created' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, 
        branch_id: true, vendor_id: true, is_active: true
      }
    });
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user, message: 'User found' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user details
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, branch_id, vendor_id, is_active } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, role, branch_id, vendor_id, is_active },
      select: { id: true, name: true, email: true, role: true, is_active: true }
    });
    res.json({ success: true, data: user, message: 'User updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error or User not found' });
  }
};

// Deactivate user
exports.deactivateUser = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { is_active: false }
    });
    res.json({ success: true, data: {}, message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error or User not found' });
  }
};
