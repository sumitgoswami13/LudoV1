const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { Server: SocketServer } = require('socket.io');
const Database = require('./config/db.config');
require('dotenv').config();

class Server {
    constructor(){
        this.port = process.env.PORT;
        this.db = new Database(process.env.DB_URI); // Initialize the database object
        this.app = express();
        this.middlewares(); // Initialize middlewares
        this.routes(); // Initialize routes
        this.initializeDatabase(); // Initialize database connection
    }

    middlewares(){
        this.app.use(cors());
        this.app.use(morgan('dev'));
        this.app.use(bodyParser.json());
    }

    routes(){
        this.app.use('/', (req, res) => {
            res.status(200).json("API for Ludo V1");
        });
    }

    async initializeDatabase(){
        try {
            await this.db.connect();
            console.log('Database connected');
        } catch(error) {
            console.error('Database connection failed', error);
            process.exit(1);
        }
    }

    initializeSocket(server) {
        this.io = new SocketServer(server, { cors: { origin: '*' } });
        this.io.on('connection', (socket) => {
            console.log(`New client connected: ${socket.id}`);

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });

            socket.on('move', (data) => {
                console.log('Received move:', data);
                this.io.emit('move', data); // Broadcast move to all clients
            });
        });
    }

    listen() {
        const server = this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });

        this.initializeSocket(server); // Pass the server to initializeSocket
    }
}

const server = new Server();
server.listen();
