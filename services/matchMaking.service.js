// services/matchmaking.service.js
class MatchmakingService {
    constructor(sqsService, gameRepository, emitter, redisClient) {
        this.sqsService = sqsService;
        this.gameRepository = gameRepository;
        this.emitter = emitter; // Use emitter instead of socketServer
        this.redisClient = redisClient; // Redis client for retrieving socket IDs
        this.waitingQueue = []; // Temporary in-memory storage for unmatched players
        this.joinConfirmations = {}; // Track join confirmations by roomId
        this.waitingTimers = {}; // Track timers for unmatched players
        console.log('MatchmakingService initialized with emitter');
    }

    async start() {
        console.log("Matchmaking service started");
        this.pollQueue(); // Start polling the queue for matchmaking requests
    }

    async pollQueue() {
        while (true) {
            try {
                const messages = await this.sqsService.receiveMessages();

                for (const message of messages) {
                    const { userId, gameId } = JSON.parse(message.Body);
                    console.log(`Received matchmaking request for user: ${userId}`);

                    this.waitingQueue.push({ userId, gameId });
                    this.setNoMatchFoundTimeout(userId); // Start a timer for no match found
                    await this.tryMatch(); // Await to ensure sequential processing

                    await this.sqsService.deleteMessage(message.ReceiptHandle);
                }

                // Optional: Sleep for a short duration to prevent tight loop
                await this.sleep(1000);
            } catch (error) {
                console.error('Error in pollQueue:', error);
                await this.sleep(5000); // Wait before retrying
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

            // Use Redis to add players to the room via emitter
            await this.addPlayersToRoom(player1.userId, player2.userId, roomId);
        }
    }

    async addPlayersToRoom(userId1, userId2, roomId) {
        console.log('addPlayersToRoom called with:', { userId1, userId2, roomId });

        // Retrieve socket IDs from Redis for both users
        const socketId1 = await this.redisClient.get(`user:${userId1}:socketId`);
        const socketId2 = await this.redisClient.get(`user:${userId2}:socketId`);

        console.log(`Retrieved socket IDs: ${socketId1}, ${socketId2}`);

        // Emit 'matched' event to both players to notify them of the match and room assignment
        if (socketId1) {
            this.emitter.to(socketId1).emit('matched', { roomId });
            this.waitForPlayerJoinConfirmation(roomId, userId1);
        } else {
            console.log(`Socket not found for userId1: ${userId1}`);
        }

        if (socketId2) {
            this.emitter.to(socketId2).emit('matched', { roomId });
            this.waitForPlayerJoinConfirmation(roomId, userId2);
        } else {
            console.log(`Socket not found for userId2: ${userId2}`);
        }

        console.log(`Players ${userId1} and ${userId2} invited to room ${roomId}`);
    }

    waitForPlayerJoinConfirmation(roomId, userId) {
        // Wait for each player to confirm they joined
        this.joinConfirmations[roomId][userId] = false;
        this.emitter.to(`user:${userId}`).once('joined', () => this.handlePlayerJoined(roomId, userId));
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
        
        // Notify both players to start the game via emitter
        this.emitter.to(roomId).emit('startGame', { roomId });

        // Clean up join confirmations for this room
        delete this.joinConfirmations[roomId];
    }

    async setNoMatchFoundTimeout(userId) {
        this.waitingTimers[userId] = setTimeout(async () => {
            try {
                const socketId = await this.redisClient.get(`user:${userId}:socketId`);
                if (!socketId) {
                    console.log(`No socket ID found for user ${userId}`);
                    return;
                }

                // Attempt a final match before sending "no match found"
                await this.tryMatch();

                // Check if user is still unmatched after final attempt
                const stillInQueue = this.waitingQueue.some(player => player.userId === userId);

                if (stillInQueue) {
                    this.emitter.to(socketId).emit('noMatchFound', { message: 'No match found' });
                    this.removeFromQueue(userId);
                } else {
                    console.log(`User ${userId} was matched after final attempt`);
                }

                delete this.waitingTimers[userId];
            } catch (error) {
                console.error(`Error in setNoMatchFoundTimeout for user ${userId}:`, error);
            }
        }, 20000); // 20 seconds
    }

    removeFromQueue(userId) {
        this.waitingQueue = this.waitingQueue.filter(player => player.userId !== userId);
    }
}

module.exports = MatchmakingService;
