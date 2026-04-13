require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');

const AppError = require('./lib/errors');

const app = express();

// Middlewares
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-vercel-app.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
const superAdminRoutes = require('./routes/superAdmin');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const branchRoutes = require('./routes/branch.routes');
const vendorRoutes = require('./routes/vendor.routes');
const itemRoutes = require('./routes/item.routes');
const vendorOrdersRoutes = require('./routes/vendorOrders');
const dailyClosingsRoutes = require('./routes/dailyClosings');
const monthlyClosingsRoutes = require('./routes/monthlyClosings');
const calBoxRoutes = require('./routes/calBox');
const vendorLedgerRoutes = require('./routes/vendorLedger');
const dashboardRoutes = require('./routes/dashboard');

const { requireAuth } = require('./middlewares/auth.middleware');
const requireSuperAdmin = require('./middlewares/requireSuperAdmin');

app.use('/api/v1/super-admin', requireAuth, requireSuperAdmin, superAdminRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/vendor-orders', vendorOrdersRoutes);
app.use('/api/v1/daily-closings', dailyClosingsRoutes);
app.use('/api/v1/monthly-closings', monthlyClosingsRoutes);
app.use('/api/v1/cal-box', calBoxRoutes);
app.use('/api/v1/vendor-ledger', vendorLedgerRoutes);
app.use('/api/v1/dashboard', requireAuth, dashboardRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Dollar Point API is running' });
});

// Error handler — handles AppError (operational) and unexpected errors
app.use((err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(process.env.DATABASE_URL)
});
