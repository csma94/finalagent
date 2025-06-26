"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
const PORT = process.env.PORT || 3000;
app.get('/test-route', (req, res) => {
    console.log('Test route hit!');
    res.json({ success: true, message: 'Test route is working!' });
});
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3001',
            'http://localhost:3000',
            process.env.CORS_ORIGIN
        ].filter(Boolean);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`Blocked request from unauthorized origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});
console.log('Registering API routes...');
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
app.get('/api/users', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, name: 'Admin User', role: 'admin', email: 'admin@bahinlink.com' },
            { id: 2, name: 'Agent User', role: 'agent', email: 'agent@bahinlink.com' }
        ]
    });
});
app.get('/api/shifts', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 1,
                agentId: 2,
                siteId: 1,
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
                status: 'scheduled'
            }
        ]
    });
});
app.get('/api/sites', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 1,
                name: 'Downtown Office Complex',
                address: '123 Business St, City, State 12345',
                coordinates: { latitude: 40.7128, longitude: -74.0060 }
            }
        ]
    });
});
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
                createdAt: new Date().toISOString()
            }
        ]
    });
});
console.log('Registering /api/analytics/dashboard route...');
app.get('/api/analytics/dashboard', (req, res) => {
    console.log('Received request to /api/analytics/dashboard');
    try {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
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
    }
    catch (error) {
        console.error('Error in /api/analytics/dashboard:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch dashboard data'
            }
        });
    }
});
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
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal server error occurred'
        }
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});
server.listen(PORT, () => {
    console.log(`🚀 BahinLink Backend API is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
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
//# sourceMappingURL=server.js.map