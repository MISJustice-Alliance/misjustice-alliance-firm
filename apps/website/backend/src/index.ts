/**
 * Main Application Entry Point
 * Express server setup and configuration
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';

import caseRoutes from './routes/caseRoutes';
import documentRoutes from './routes/documentRoutes';
import contactRoutes from './routes/contactRoutes';
import { createAuthRoutes } from './routes/authRoutes';
import { createWebhookRoutes } from './routes/webhooks';
import sitemapRoutes from './routes/sitemapRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { testConnection, pool } from './config/database';
import { loadBitwardenSecrets } from './services/BitwardenSecretsService';

// Load environment variables from .env file first (for Bitwarden credentials)
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Middleware Setup
 */

// Security headers
app.use(helmet());

// CORS configuration
// Load allowed origins from environment variable (comma-separated)
// Default includes production domains and local development
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  'https://misjusticealliance.org,https://www.misjusticealliance.org,http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing (for refresh tokens)
app.use(cookieParser());

/**
 * Routes
 */

// Health check endpoint
app.get('/health', (req, res) => {
  // req parameter required by Express RequestHandler interface but unused in health checks
  void req;
  res.status(200).json({
    success: true,
    message: 'MISJustice Alliance API is running',
    timestamp: new Date().toISOString(),
  });
});

// Sitemap endpoint (before API routes)
app.use(sitemapRoutes);

// API routes
app.use('/api/auth', createAuthRoutes(pool));
app.use('/api/cases', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/webhooks', createWebhookRoutes(pool));

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

/**
 * Start Server
 */
async function startServer(): Promise<void> {
  try {
    // Load secrets from Bitwarden Secrets Manager (if configured)
    if (process.env.BW_ACCESS_TOKEN && process.env.BW_PROJECT_ID) {
      console.log('🔐 Loading secrets from Bitwarden Secrets Manager...');
      await loadBitwardenSecrets(
        process.env.BW_ACCESS_TOKEN,
        process.env.BW_PROJECT_ID
      );
    } else if (process.env.NODE_ENV === 'production') {
      console.error('❌ Bitwarden credentials not configured for production environment');
      console.error('   Required: BW_ACCESS_TOKEN and BW_PROJECT_ID environment variables');
      process.exit(1);
    } else {
      console.warn('⚠️  Bitwarden credentials not found. Using .env file secrets (development only)');
    }

    // Verify required environment variables
    const missingEnvVars: string[] = [];

    // Critical security variables
    if (!process.env.JWT_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        missingEnvVars.push('JWT_SECRET');
      } else {
        console.warn('⚠️  JWT_SECRET not set. Using default (INSECURE for production)');
      }
    }

    // Mailgun configuration (optional - contact form will show message if unavailable)
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.warn('⚠️  Mailgun not configured. Contact form will be unavailable.');
    }
    if (!process.env.MAILGUN_WEBHOOK_SIGNING_KEY) {
      console.warn('⚠️  MAILGUN_WEBHOOK_SIGNING_KEY not set. Email webhooks disabled.');
    }

    // Exit if any required variables are missing
    if (missingEnvVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\n💡 Copy .env.example to .env and configure required variables');
      process.exit(1);
    }

    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start Express server
    app.listen(Number(PORT), HOST, () => {
      console.log('🚀 MISJustice Alliance API Server');
      console.log(`📡 Server running on ${HOST}:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Database connected`);
      console.log(`🔐 Authentication enabled`);
      console.log(`\n🔗 API Base URL: http://${HOST}:${PORT}`);
      console.log(`🔗 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`🔗 Auth API: http://${HOST}:${PORT}/api/auth`);
      console.log(`🔗 Cases API: http://${HOST}:${PORT}/api/cases`);
      console.log(`🔗 Contact API: http://${HOST}:${PORT}/api/contact`);
      console.log(`🔗 Webhooks API: http://${HOST}:${PORT}/api/webhooks`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Only start server if this file is run directly (not imported by tests)
// In ES modules, we can't use require.main === module, so we export the app
// and let the caller decide whether to start the server
export default app;

// For direct execution (npm run dev, npm start)
// This won't execute when imported by Jest
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
