const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { Server: SocketServer } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const cluster = require('cluster');
const Emitter = require('socket.io-emitter');
const os = require('os');

const Database = require('./config/db.config');
const Repository = require('./repositories/repository');
const SqsService = require('./helper/SqsService');
const GameService = require('./services/game.service');
const MatchmakingService = require('./services/matchmaking.service');
const gameRoutes = require('./routes/game.routess');
const user = require('./models/user.model');
require('dotenv').config();

if (cluster.isMaster) {
    const cpuCount = os.cpus().length;
    
    console.log(`Master process is running. Forking ${cpuCount} worker processes.`);

    cluster.fork();
    cluster.fork(); 

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} exited with code ${code} and signal ${signal}.`);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
    if (cluster.worker.id === 1) {
        class Server {
            constructor() {
                this.port = process.env.PORT;
                this.SqsService = new SqsService();
                this.db = new Database(process.env.DB_URI);
                this.app = express();
                this.initializeServices();
                this.middlewares();
                this.routes();
                this.initializeDatabase();
            }

            middlewares() {
                this.app.use(cors());
                this.app.use(morgan('dev'));
                this.app.use(bodyParser.json());
            }

            routes() {
                this.app.use('/api/games', gameRoutes(this.gameService));

                this.app.get('/', (req, res) => {
                    res.status(200).json("API for Ludo V1");
                });
            }

            async initializeDatabase() {
                try {
                    await this.db.connect();
                    console.log('Database connected');
                } catch (error) {
                    console.error('Database connection failed', error);
                    process.exit(1);
                }
            }

            async initializeSocket(server) {
                const pubClient = createClient({ url: process.env.REDIS_URL });
                const subClient = pubClient.duplicate();

                pubClient.on('error', (err) => console.error('Redis pubClient error:', err));
                subClient.on('error', (err) => console.error('Redis subClient error:', err));

                await pubClient.connect();
                console.log('Connected to Redis as pubClient');
                
                await subClient.connect();
                console.log('Connected to Redis as subClient');

                this.io = new SocketServer(server, { cors: { origin: '*' } });
                this.io.adapter(createAdapter(pubClient, subClient));

                this.io.on('connection', async (socket) => {
                    const userId = socket.handshake.query.userId; // Assume userId is passed as a query parameter
                    if (userId) {
                        await pubClient.set(`user:${userId}:socketId`, socket.id);
                        console.log(`User ${userId} connected with socket ID ${socket.id}`);
                    }

                    socket.on('disconnect', async () => {
                        if (userId) {
                            // Remove mapping on disconnect
                            await pubClient.del(`user:${userId}:socketId`);
                            console.log(`User ${userId} disconnected`);
                        }
                    });

                    // Add your main server socket event handlers here
                    // e.g., socket.on('someEvent', handlerFunction);
                });

            }

            initializeRepositories() {
                this.userRepository = new Repository(user);
            }

            initializeServices() {
                this.gameService = new GameService(this.userRepository, this.SqsService);
            }

            listen() {
                const server = this.app.listen(this.port, () => {
                    console.log(`Server running on port ${this.port}`);
                });

                this.initializeSocket(server);
            }
        }
        const server = new Server();
        server.listen();

    }  else {
        // **Matchmaking Worker**
        class MatchmakingWorker {
            constructor() {
                this.sqsService = new SqsService();
                this.gameRepository = new Repository(user);
                this.initialize();
            }

            // **Initialize Emitter and Matchmaking Service**
            async initialize() {
                try {
                    const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
                    const pubClient = createClient({ url: process.env.REDIS_URL });
                    pubClient.connect()
                    // Initialize Socket.IO Emitter
                    this.emitter = Emitter({
                        host: redisUrl.hostname,
                        port: redisUrl.port,
                        // If your Redis requires SSL or other options, include them here
                        // tls: { ... },
                        // db: 0, // Specify the Redis database if needed
                    });
                    console.log(`Matchmaking Worker ${cluster.worker.id} connected to Redis for emitter`);

                    // Initialize matchmaking service with the emitter
                    this.matchmakingService = new MatchmakingService(
                        this.sqsService,
                        this.gameRepository,
                        this.emitter,
                        pubClient
                    );

                    // Start matchmaking service
                    await this.matchmakingService.start();
                    console.log(`Matchmaking service started in Worker ${cluster.worker.id}`);
                } catch (err) {
                    console.error(`Error initializing Matchmaking Worker ${cluster.worker.id}:`, err);
                    process.exit(1);
                }
            }
        }

        // Instantiate and start the matchmaking worker
        new MatchmakingWorker();
    }
}