require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/v1/auth', authRoutes);

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
