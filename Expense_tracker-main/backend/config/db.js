const mongoose = require('mongoose');
const crypto = require('crypto');

// Connection state tracking
let connectionAttempts = 0;
let isConnecting = false;
let lastConnectionError = null;

// Enhanced connection options with security
const getConnectionOptions = () => {
    return {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
        minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,
        maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000,
        serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
        socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000,
        heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT_FREQUENCY) || 10000,
        family: 4, // Use IPv4, skip trying IPv6
        ssl: process.env.DB_SSL === 'true',
        authSource: process.env.DB_AUTH_SOURCE || 'admin',
        retryWrites: true,
        w: 'majority',
        readPreference: 'primary',
        compressors: ['zlib'],
        zlibCompressionLevel: 1,
        // Connection security
        bufferCommands: false
        // bufferMaxEntries: 0  // Removed because not supported in current MongoDB driver
    };
};

// Connection health monitoring
const monitorConnection = () => {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    return {
        state: states[state] || 'unknown',
        stateCode: state,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        collections: mongoose.connection.db ? Object.keys(mongoose.connection.db.collections).length : 0,
        attempts: connectionAttempts,
        lastError: lastConnectionError,
        uptime: mongoose.connection.readyState === 1 ? Date.now() - mongoose.connection._connectionStartTime : 0
    };
};

// Enhanced logging with security considerations
const logConnection = (message, type = 'info', details = {}) => {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        type,
        message,
        ...details
    };
    
    // Don't log sensitive connection strings in production
    if (process.env.NODE_ENV === 'production') {
        delete logData.connectionString;
        delete logData.credentials;
    }
    
    switch (type) {
        case 'error':
            console.error(`❌ [${timestamp}] ${message}`, details);
            break;
        case 'warn':
            console.warn(`⚠️ [${timestamp}] ${message}`, details);
            break;
        case 'success':
            console.log(`✅ [${timestamp}] ${message}`, details);
            break;
        default:
            console.log(`ℹ️ [${timestamp}] ${message}`, details);
    }
    
    // In production, you might want to send these to a logging service
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SECURITY_LOGS === 'true') {
        // TODO: Implement external logging (e.g., Winston, external service)
    }
};

// Connection validation
const validateConnection = () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is required');
    }
    
    // Basic URI validation
    if (!process.env.MONGO_URI.startsWith('mongodb://') && !process.env.MONGO_URI.startsWith('mongodb+srv://')) {
        throw new Error('Invalid MongoDB URI format');
    }
    
    // Check for embedded credentials in production
    if (process.env.NODE_ENV === 'production' && process.env.MONGO_URI.includes('@')) {
        logConnection('Warning: Database URI contains embedded credentials', 'warn');
    }
};

// Enhanced connection retry logic
const connectWithRetry = async (retryCount = 0) => {
    const maxRetries = parseInt(process.env.DB_MAX_RETRIES) || 5;
    const baseDelay = parseInt(process.env.DB_RETRY_DELAY) || 5000;
    
    if (isConnecting) {
        logConnection('Connection attempt already in progress', 'warn');
        return;
    }
    
    if (retryCount >= maxRetries) {
        const error = new Error(`Failed to connect after ${maxRetries} attempts`);
        logConnection('Max connection retries reached', 'error', { 
            attempts: connectionAttempts,
            lastError: lastConnectionError 
        });
        throw error;
    }
    
    isConnecting = true;
    connectionAttempts++;
    
    try {
        validateConnection();
        
        const connectionOptions = getConnectionOptions();
        mongoose.connection._connectionStartTime = Date.now();
        
        logConnection(`Attempting database connection (attempt ${connectionAttempts})`, 'info', {
            attempt: connectionAttempts,
            retryCount,
            options: {
                maxPoolSize: connectionOptions.maxPoolSize,
                serverSelectionTimeout: connectionOptions.serverSelectionTimeoutMS
            }
        });
        
        const conn = await mongoose.connect(process.env.MONGO_URI, connectionOptions);
        
        isConnecting = false;
        lastConnectionError = null;
        
        logConnection('MongoDB Connected Successfully', 'success', {
            host: conn.connection.host,
            database: conn.connection.name,
            state: mongoose.connection.readyState,
            attempt: connectionAttempts
        });
        
        // Log additional connection details
        console.log(`📁 Database Name: ${conn.connection.name}`);
        console.log(`🌐 Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
        console.log(`🔗 Pool Size: ${connectionOptions.maxPoolSize}`);
        console.log(`🔒 SSL Enabled: ${connectionOptions.ssl}`);
        
        return conn;
        
    } catch (error) {
        isConnecting = false;
        lastConnectionError = {
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        };
        
        logConnection('Database connection failed', 'error', {
            error: error.message,
            code: error.code,
            attempt: connectionAttempts,
            retryCount
        });
        
        if (retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
            logConnection(`Retrying connection in ${delay}ms...`, 'info', {
                nextAttempt: retryCount + 1,
                delay
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return connectWithRetry(retryCount + 1);
        }
        
        throw error;
    }
};

// Enhanced event handlers
const setupEventHandlers = () => {
    // Connection opened
    mongoose.connection.on('connected', () => {
        logConnection('Mongoose connected to MongoDB', 'success');
    });
    
    // Connection error
    mongoose.connection.on('error', (err) => {
        lastConnectionError = {
            message: err.message,
            code: err.code || 'UNKNOWN',
            timestamp: new Date().toISOString()
        };
        
        logConnection('MongoDB connection error', 'error', {
            error: err.message,
            code: err.code,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        
        // In production, you might want to alert monitoring systems
        if (process.env.NODE_ENV === 'production') {
            // TODO: Send alert to monitoring service
        }
    });
    
    // Connection disconnected
    mongoose.connection.on('disconnected', () => {
        logConnection('MongoDB disconnected', 'warn');
        
        // Auto-reconnect in production
        if (process.env.NODE_ENV === 'production' && !isConnecting) {
            logConnection('Attempting to reconnect...', 'info');
            setTimeout(() => {
                if (mongoose.connection.readyState === 0) { // disconnected
                    connectWithRetry();
                }
            }, 5000);
        }
    });
    
    // Connection reconnected
    mongoose.connection.on('reconnected', () => {
        logConnection('MongoDB reconnected', 'success');
        connectionAttempts = 0; // Reset attempt counter on successful reconnection
        lastConnectionError = null;
    });
    
    // Connection ready
    mongoose.connection.on('open', () => {
        logConnection('MongoDB connection opened and ready', 'success', {
            collections: mongoose.connection.db ? Object.keys(mongoose.connection.collections).length : 0
        });
    });
    
    // Connection close
    mongoose.connection.on('close', () => {
        logConnection('MongoDB connection closed', 'info');
    });
};

// Enhanced graceful shutdown
const setupGracefulShutdown = () => {
    const gracefulShutdown = async (signal) => {
        logConnection(`Received ${signal}, closing MongoDB connection...`, 'info');
        
        try {
            await mongoose.connection.close();
            logConnection('MongoDB connection closed due to application termination', 'success');
            
            // Give some time for logs to flush
            setTimeout(() => {
                process.exit(0);
            }, 100);
            
        } catch (err) {
            logConnection('Error during MongoDB shutdown', 'error', {
                error: err.message,
                code: err.code
            });
            process.exit(1);
        }
    };
    
    // Handle different termination signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logConnection('Uncaught Exception', 'error', {
            error: err.message,
            stack: err.stack
        });
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logConnection('Unhandled Promise Rejection', 'error', {
            reason: reason,
            promise: promise
        });
        gracefulShutdown('UNHANDLED_REJECTION');
    });
};

// Health check function
const healthCheck = async () => {
    try {
        const adminDb = mongoose.connection.db.admin();
        const status = await adminDb.ping();
        
        return {
            status: 'healthy',
            connection: monitorConnection(),
            ping: status,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            connection: monitorConnection(),
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// Main connection function
const connectDB = async () => {
    try {
        // Setup event handlers first
        setupEventHandlers();
        
        // Setup graceful shutdown
        setupGracefulShutdown();
        
        // Attempt connection with retry logic
        await connectWithRetry();
        
        // Setup periodic health checks if enabled
        if (process.env.HEALTH_CHECK_ENABLED === 'true') {
            const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000;
            setInterval(async () => {
                const health = await healthCheck();
                if (health.status !== 'healthy') {
                    logConnection('Database health check failed', 'warn', health);
                }
            }, interval);
        }
        
    } catch (error) {
        logConnection('Failed to establish database connection', 'error', {
            error: error.message,
            attempts: connectionAttempts
        });
        
        // In development, exit the process
        if (process.env.NODE_ENV === 'development') {
            process.exit(1);
        }
        
        throw error;
    }
};

// Export functions
module.exports = {
    connectDB,
    healthCheck,
    monitorConnection,
    getConnectionStatus: () => monitorConnection()
};