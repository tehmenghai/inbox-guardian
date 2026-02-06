import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import yahooRoutes from './routes/yahoo';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://main.d2u0lu9liyioqp.amplifyapp.com'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/yahoo', yahooRoutes);

// Server version
const SERVER_VERSION = '1.0.2';

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'inbox-guardian-server', version: SERVER_VERSION });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Yahoo Mail backend running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});
