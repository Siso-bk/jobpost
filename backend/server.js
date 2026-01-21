require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const csrf = require('./middleware/csrf');

const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const userRoutes = require('./routes/users');

const app = express();

const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  app.set('trust proxy', 1);
}

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  const msg = 'Missing MONGODB_URI or JWT_SECRET in environment';
  if (isProd) {
    console.error(msg);
    process.exit(1);
  } else {
    console.warn(msg);
  }
}

// Middleware
const corsOptions = {};
if (process.env.CORS_ORIGIN) {
  corsOptions.origin = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
} else {
  corsOptions.origin = isProd ? [] : true;
}
corsOptions.credentials = true;
app.use(cors(corsOptions));

app.use(helmet());
app.use(compression());
if (!isProd) {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser());
app.use(csrf());

// Rate limit for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter);
// Additional rate limit for mutating endpoints
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
app.use(['/api/jobs', '/api/applications', '/api/users'], writeLimiter);

// MongoDB Connection
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false);
const mongoOpts = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 20000,
  family: 4,
};
if (process.env.MONGODB_DB) {
  mongoOpts.dbName = process.env.MONGODB_DB;
}

mongoose
  .connect(process.env.MONGODB_URI, mongoOpts)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Database health check
app.get('/api/db-health', async (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    if (state === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().command({ ping: 1 });
      return res.json({ ok: true, state });
    }
    return res.status(503).json({ ok: false, state });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Serve frontend in production
if (isProd) {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Note: server starts after successful MongoDB connection above
