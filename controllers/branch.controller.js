const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List all branches (Owner)
exports.listBranches = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        managers: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    res.json({ success: true, data: branches, message: 'Branches retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new branch (Owner)
exports.createBranch = async (req, res) => {
  try {
    const { name, location, manager_id } = req.body;
    const branch = await prisma.branch.create({
      data: { name, location, manager_id }
    });
    
    // If manager_id provided, update the user to link them to this branch
    if (manager_id) {
        await prisma.user.update({
            where: { id: manager_id },
            data: { branch_id: branch.id }
        });
    }

    res.status(201).json({ success: true, data: branch, message: 'Branch created' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single branch (Owner, or Manager of this branch)
exports.getBranch = async (req, res) => {
  try {
    const branchId = req.params.id;
    
    // Auth check: If branch_manager, ensure they are requesting their own branch
    if (req.user.role === 'branch_manager' && req.user.branchId !== branchId) {
        return res.status(403).json({ success: false, message: 'Access denied to other branches' });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        managers: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.json({ success: true, data: branch, message: 'Branch found' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update branch details (Owner)
exports.updateBranch = async (req, res) => {
  try {
    const { name, location, manager_id, is_active } = req.body;
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: { name, location, manager_id, is_active }
    });
    
    if (manager_id) {
        await prisma.user.update({
            where: { id: manager_id },
            data: { branch_id: branch.id }
        });
    }

    res.json({ success: true, data: branch, message: 'Branch updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error or Branch not found' });
  }
};

// Deactivate branch (Owner)
exports.deactivateBranch = async (req, res) => {
  try {
    await prisma.branch.update({
      where: { id: req.params.id },
      data: { is_active: false }
    });
    res.json({ success: true, data: {}, message: 'Branch deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
