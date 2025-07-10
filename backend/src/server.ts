import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import winston from 'winston';

// Load environment variables
dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/app.log' }),
    new winston.transports.Console()
  ]
});

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3000;

// Test route - should be the first route registered
app.get('/test-route', (req, res) => {
  logger.info('Test route hit!');
  res.json({ success: true, message: 'Test route is working!' });
});

// CORS Configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:12000',
      'http://localhost:12001', 
      'http://localhost:12002',
      'https://work-1-izuazmglxvjecjaw.prod-runtime.all-hands.dev',
      'https://work-2-izuazmglxvjecjaw.prod-runtime.all-hands.dev',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API routes
logger.info('Registering API routes...');

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      database: 'healthy',
      redis: 'healthy',
      websocket: 'healthy'
    },
    timestamp: new Date().toISOString()
  });
});

// Users API
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Admin User', role: 'admin', email: 'admin@bahinlink.com', status: 'active' },
      { id: 2, name: 'Agent User', role: 'agent', email: 'agent@bahinlink.com', status: 'active' },
      { id: 3, name: 'Supervisor User', role: 'supervisor', email: 'supervisor@bahinlink.com', status: 'active' }
    ]
  });
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: { id: parseInt(id), name: 'User ' + id, role: 'agent', email: `user${id}@bahinlink.com`, status: 'active' }
  });
});

app.post('/api/users', (req, res) => {
  res.json({
    success: true,
    data: { id: Date.now(), ...req.body, status: 'active' }
  });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: { id: parseInt(id), ...req.body }
  });
});

app.delete('/api/users/:id', (req, res) => {
  res.json({
    success: true,
    data: { message: 'User deleted successfully' }
  });
});

// Agents API
app.get('/api/agents', (req, res) => {
  res.json({
    success: true,
    data: [
      { 
        id: 1, 
        userId: 2, 
        name: 'John Doe', 
        status: 'active', 
        currentSite: 'Downtown Office Complex',
        location: { latitude: 40.7128, longitude: -74.0060 },
        lastUpdate: new Date().toISOString()
      },
      { 
        id: 2, 
        userId: 3, 
        name: 'Jane Smith', 
        status: 'on-duty', 
        currentSite: 'Shopping Mall',
        location: { latitude: 40.7589, longitude: -73.9851 },
        lastUpdate: new Date().toISOString()
      }
    ]
  });
});

// Shifts API
app.get('/api/shifts', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        agentId: 1,
        siteId: 1,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        agent: { name: 'John Doe' },
        site: { name: 'Downtown Office Complex' }
      },
      {
        id: 2,
        agentId: 2,
        siteId: 2,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        agent: { name: 'Jane Smith' },
        site: { name: 'Shopping Mall' }
      }
    ]
  });
});

// Sites API
app.get('/api/sites', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Downtown Office Complex',
        address: '123 Business St, City, State 12345',
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        status: 'active',
        clientId: 1
      },
      {
        id: 2,
        name: 'Shopping Mall',
        address: '456 Mall Ave, City, State 12345',
        coordinates: { latitude: 40.7589, longitude: -73.9851 },
        status: 'active',
        clientId: 2
      }
    ]
  });
});

// Reports API
app.get('/api/reports', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        type: 'incident',
        title: 'Security Check',
        content: 'All clear during patrol',
        priority: 'normal',
        status: 'completed',
        agentId: 1,
        siteId: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        type: 'patrol',
        title: 'Routine Patrol',
        content: 'Perimeter check completed successfully',
        priority: 'low',
        status: 'completed',
        agentId: 2,
        siteId: 2,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ]
  });
});

// Analytics API
app.get('/api/analytics/dashboard', (req, res) => {
  logger.info('Received request to /api/analytics/dashboard');
  try {
    const dashboardData = {
      activeShifts: 5,
      totalAgents: 12,
      incidentsToday: 2,
      sitesMonitored: 8,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Error in /api/analytics/dashboard:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard data'
      }
    });
  }
});

app.get('/api/analytics/kpi', (req, res) => {
  res.json({
    success: true,
    data: {
      totalAgents: 12,
      activeShifts: 5,
      completedShifts: 45,
      incidentsResolved: 23,
      clientSatisfaction: 4.8,
      responseTime: 2.3
    }
  });
});

app.get('/api/analytics/widgets', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'active-agents', title: 'Active Agents', value: 8, type: 'number' },
      { id: 'incidents-today', title: 'Incidents Today', value: 2, type: 'number' },
      { id: 'response-time', title: 'Avg Response Time', value: '2.3 min', type: 'text' }
    ]
  });
});

// Monitoring API
app.get('/api/monitoring/locations', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        agentId: 1,
        agentName: 'John Doe',
        latitude: 40.7128,
        longitude: -74.0060,
        status: 'on-duty',
        lastUpdate: new Date().toISOString(),
        siteId: 1,
        siteName: 'Downtown Office Complex'
      },
      {
        agentId: 2,
        agentName: 'Jane Smith',
        latitude: 40.7589,
        longitude: -73.9851,
        status: 'on-duty',
        lastUpdate: new Date().toISOString(),
        siteId: 2,
        siteName: 'Shopping Mall'
      }
    ]
  });
});

app.get('/api/monitoring/status', (req, res) => {
  res.json({
    success: true,
    data: {
      systemStatus: 'healthy',
      activeAgents: 8,
      activeSites: 5,
      lastUpdate: new Date().toISOString()
    }
  });
});

app.get('/api/monitoring/alerts', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        type: 'geofence_violation',
        message: 'Agent outside designated area',
        agentId: 1,
        severity: 'medium',
        timestamp: new Date().toISOString(),
        acknowledged: false
      }
    ]
  });
});

// Scheduling API
app.get('/api/scheduling/schedule', (req, res) => {
  res.json({
    success: true,
    data: {
      shifts: [
        {
          id: 1,
          agentId: 1,
          siteId: 1,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        }
      ]
    }
  });
});

// System API
app.get('/api/system/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      services: {
        database: 'healthy',
        redis: 'healthy',
        websocket: 'healthy'
      },
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/system/config', (req, res) => {
  res.json({
    success: true,
    data: {
      appName: 'BahinLink',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Authentication handled by Clerk - no custom auth endpoints needed

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: 1,
        email: 'admin@bahinlink.com',
        username: 'admin',
        role: 'admin',
        permissions: ['users.read', 'users.write', 'shifts.read'],
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          avatar: null
        },
        lastLoginAt: new Date().toISOString(),
        isActive: true
      }
    }
  });
});

// WebSocket will be added later

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 BahinLink Backend API is running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔧 API endpoints: http://localhost:${PORT}/api`);
  logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server };
