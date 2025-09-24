import express from 'express';
import crossOrigin from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import morganLogger from './utils/morgan.logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';
import corsOptions from './middleware/cors.config.js';
import * as ServerStatus from './utils/serverInfo.js';
import { sendSuccess } from './utils/sendResponse.js';
import { swaggerSpec, swaggerUi } from './config/swagger.js';
import logger from './utils/winston.logger.js';

// Cron jobs
// if (process.env.NODE_ENV !== "development") {
//     logger.info('Loaded cron jobs');

//     await import("./controllers/jobs/assets.cron.js");
// }
// Load environment variables
dotenv.config();

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

// CORS
app.use(crossOrigin(corsOptions));

app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morganLogger());
    app.use(morgan('tiny'));
}

// Health check endpoint
app.get('/api/health', ServerStatus.getServerLoadInfo, (req, res) => {
    const uptime = ServerStatus.calculateUptime();
    const serverLoadInfo = req.serverLoadInfo;
    const response = {
        dateTime: new Date().toLocaleString(),
        connectedClient: process.env.CLIENT_BASE_URL || 'http://localhost:3000',
        systemStatus: {
            uptime: `${uptime}s`,
            cpuLoad: serverLoadInfo.cpuLoad,
            memoryUsage: serverLoadInfo.memoryUsage,
        },
    };
    return sendSuccess(res, response, 'Investor Portal Backend!', 200);
});

// Routes
app.use('/api', routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Error handling middleware
app.use(errorHandler);

export default app;
