const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List all active vendors (Owner, Branch Manager)
exports.listVendors = async (req, res) => {
  try {
    let whereClause = { is_active: true };

    // If branch manager, ideally only list vendors linked to their branch
    if (req.user.role === 'branch_manager' && req.user.branchId) {
       whereClause.branch_links = {
           some: { branch_id: req.user.branchId }
       };
    }

    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      include: {
        branch_links: {
            include: { branch: { select: { id: true, name: true } } }
        }
      }
    });
    res.json({ success: true, data: vendors, message: 'Vendors retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new vendor (Owner)
exports.createVendor = async (req, res) => {
  try {
    const { name, phone, whatsapp_number, category, notes, branch_ids } = req.body;
    
    const vendor = await prisma.vendor.create({
      data: { name, phone, whatsapp_number, category, notes }
    });
    
    // Link to branches if provided
    if (branch_ids && Array.isArray(branch_ids)) {
        const links = branch_ids.map(bId => ({
            vendor_id: vendor.id,
            branch_id: bId
        }));
        await prisma.vendorBranchLink.createMany({ data: links });
    }

    res.status(201).json({ success: true, data: vendor, message: 'Vendor created' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single vendor (Owner, Branch Manager, Vendor own)
exports.getVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    
    if (req.user.role === 'vendor' && req.user.vendorId !== vendorId) {
        return res.status(403).json({ success: false, message: 'Access denied to other vendor profiles' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        branch_links: {
            include: { branch: { select: { id: true, name: true } } }
        }
      }
    });
    
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: vendor, message: 'Vendor profile found' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update vendor details (Owner)
exports.updateVendor = async (req, res) => {
  try {
    const { name, phone, whatsapp_number, category, notes, is_active } = req.body;
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { name, phone, whatsapp_number, category, notes, is_active }
    });
    res.json({ success: true, data: vendor, message: 'Vendor updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error or Vendor not found' });
  }
};

// Deactivate vendor (Owner)
exports.deactivateVendor = async (req, res) => {
  try {
    await prisma.vendor.update({
      where: { id: req.params.id },
      data: { is_active: false }
    });
    res.json({ success: true, data: {}, message: 'Vendor deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Stub for Ledger
exports.getVendorLedger = async (req, res) => {
    res.json({ success: true, data: [], message: 'Ledger endpoint stub. Will monitor purchases in future.' });
};

// Stub for Items
exports.getVendorItems = async (req, res) => {
    res.json({ success: true, data: [], message: 'Items endpoint stub. Will list linked items in future.' });
};
