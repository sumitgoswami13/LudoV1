class MatchmakingService {
    constructor(sqsService, gameRepository, socketServer) {
        this.sqsService = sqsService;
        this.gameRepository = gameRepository;
        this.socketServer = socketServer;
        this.waitingQueue = []; // Temporary in-memory storage for unmatched players
        this.joinConfirmations = {}; // Track join confirmations by roomId
        this.waitingTimers = {}; // Track timers for unmatched players
    }

    async start() {
        console.log("Matchmaking service started");
        await this.pollQueue();
    }

    async pollQueue() {
        while (true) {
            const messages = await this.sqsService.receiveMessages();
            
            for (const message of messages) {
                const { userId, gameId } = JSON.parse(message.Body);
                console.log(`Received matchmaking request for user: ${userId}`);
                
                this.waitingQueue.push({ userId, gameId });
                this.setNoMatchFoundTimeout(userId); // Start a timer for no match found
                this.tryMatch();

                await this.sqsService.deleteMessage(message.ReceiptHandle);
            }
        }
    }

    async tryMatch() {
        if (this.waitingQueue.length >= 2) {
            const player1 = this.waitingQueue.shift();
            const player2 = this.waitingQueue.shift();

            const roomId = `${player1.userId}-${player2.userId}-${Date.now()}`;
            console.log(`Matched players: ${player1.userId} and ${player2.userId} in room ${roomId}`);

            // Cancel no-match timers for both players
            clearTimeout(this.waitingTimers[player1.userId]);
            clearTimeout(this.waitingTimers[player2.userId]);
            delete this.waitingTimers[player1.userId];
            delete this.waitingTimers[player2.userId];

            // Initialize join confirmations for this room
            this.joinConfirmations[roomId] = {
                [player1.userId]: false,
                [player2.userId]: false,
            };

            this.addPlayersToRoom(player1.userId, player2.userId, roomId);
        }
    }

    addPlayersToRoom(userId1, userId2, roomId) {
        const socket1 = this.socketServer.sockets.sockets.get(userId1);
        const socket2 = this.socketServer.sockets.sockets.get(userId2);


        if (socket1) {
            socket1.join(roomId);
            socket1.emit('matched', { roomId });
            socket1.once('joined', () => this.handlePlayerJoined(roomId, userId1));
        }

        if (socket2) {
            socket2.join(roomId);
            socket2.emit('matched', { roomId });
            socket2.once('joined', () => this.handlePlayerJoined(roomId, userId2));
        }

        console.log(`Players ${userId1} and ${userId2} invited to room ${roomId}`);
    }

    handlePlayerJoined(roomId, userId) {
        console.log(`Player ${userId} joined room ${roomId}`);
        if (this.joinConfirmations[roomId]) {
            this.joinConfirmations[roomId][userId] = true;

            // Check if both players have joined
            const allJoined = Object.values(this.joinConfirmations[roomId]).every(Boolean);
            if (allJoined) {
                this.startGame(roomId);
            }
        }
    }

    startGame(roomId) {
        console.log(`Starting game for room ${roomId}`);
        
        // Notify both players to start the game
        this.socketServer.to(roomId).emit('startGame', { roomId });

        // Clean up join confirmations for this room
        delete this.joinConfirmations[roomId];
    }

    setNoMatchFoundTimeout(userId) {
        this.waitingTimers[userId] = setTimeout(() => {
            const socket = this.socketServer.sockets.sockets.get(userId);
            if (socket) {
                socket.emit('noMatchFound', { message: 'No match found' });
            }
            this.removeFromQueue(userId);
            delete this.waitingTimers[userId];
        }, 60000); // 1 minute
    }

    removeFromQueue(userId) {
        this.waitingQueue = this.waitingQueue.filter(player => player.userId !== userId);
    }
}

module.exports = MatchmakingService;
