require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const branchRoutes = require('./routes/branch.routes');
const vendorRoutes = require('./routes/vendor.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/vendors', vendorRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Dollar Point API is running' });
});

// Error handling basic
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`DB is running ${process.env.DATABASE_URL}`);
});
