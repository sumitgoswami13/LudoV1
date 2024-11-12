class MatchmakingService {
    constructor(sqsService, gameRepository, emitter, redisClient) {
        this.sqsService = sqsService;
        this.gameRepository = gameRepository;
        this.emitter = emitter;
        this.redisClient = redisClient;
        this.waitingQueue = [];
        this.joinConfirmations = {};
        this.waitingTimers = {};
        console.log('MatchmakingService initialized with emitter');
    }

    async start() {
        console.log("Matchmaking service started");
        this.pollQueue();
    }

    async pollQueue() {
        while (true) {
            try {
                const messages = await this.sqsService.receiveMessages();

                for (const message of messages) {
                    const { userId, gameId } = JSON.parse(message.Body);
                    console.log(`Received matchmaking request for user: ${userId}`);

                    this.waitingQueue.push({ userId, gameId });
                    this.setNoMatchFoundTimeout(userId);
                    await this.tryMatch();

                    await this.sqsService.deleteMessage(message.ReceiptHandle);
                }
                await this.sleep(1000);
            } catch (error) {
                console.error('Error in pollQueue:', error);
                await this.sleep(5000);
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

            clearTimeout(this.waitingTimers[player1.userId]);
            clearTimeout(this.waitingTimers[player2.userId]);
            delete this.waitingTimers[player1.userId];
            delete this.waitingTimers[player2.userId];

            this.joinConfirmations[roomId] = {
                [player1.userId]: false,
                [player2.userId]: false,
            };

            await this.addPlayersToRoom(player1.userId, player2.userId, roomId);
        }
    }

    async addPlayersToRoom(userId1, userId2, roomId) {
        

        if (userId1 === userId2) {
            console.log(`Matching error: User IDs are the same (${userId1}). Skipping room creation.`);
            return;
        }
        const socketId1 = await this.redisClient.get(`user:${userId1}:socketId`);
        const socketId2 = await this.redisClient.get(`user:${userId2}:socketId`);
        console.log('addPlayersToRoom called with:', { userId1, userId2, roomId });

        console.log(`Retrieved socket IDs: ${socketId1}, ${socketId2}`);

        if (socketId1) {
            this.emitter.sockets.sockets.get(socketId1).join(roomId);
            this.emitter.to(socketId1).emit('matched', { roomId });
            this.waitForPlayerJoinConfirmation(roomId, userId1);
        } else {
            console.log(`Socket not found for userId1: ${userId1}`);
        }

        if (socketId2) {
            this.emitter.sockets.sockets.get(socketId2).join(roomId);
            this.emitter.to(socketId2).emit('matched', { roomId });
            this.waitForPlayerJoinConfirmation(roomId, userId2);
        } else {
            console.log(`Socket not found for userId2: ${userId2}`);
        }

        console.log(`Players ${userId1} and ${userId2} invited to room ${roomId}`);
    }

    waitForPlayerJoinConfirmation(roomId, userId) {
        this.joinConfirmations[roomId][userId] = false;
        const socketId = `user:${userId}`;
        this.emitter.to(socketId).once('joined', () => this.handlePlayerJoined(roomId, userId));
    }

    handlePlayerJoined(roomId, userId) {
        console.log(`Player ${userId} joined room ${roomId}`);
        if (this.joinConfirmations[roomId]) {
            this.joinConfirmations[roomId][userId] = true;
            const allJoined = Object.values(this.joinConfirmations[roomId]).every(Boolean);

            if (allJoined) {
                this.startGame(roomId);
            }
        }
    }

    startGame(roomId) {
        console.log(`Starting game for room ${roomId}`);
        this.emitter.to(roomId).emit('startGame', { roomId });
        delete this.joinConfirmations[roomId];
        this.emitter.in(roomId).on('gameMove', (data) => {
            this.handleGameMove(roomId, data);
        });
    }

    handleGameMove(roomId, data) {
        console.log(`Game movement in room ${roomId}:`, data);
        this.emitter.to(roomId).emit('updateGame', data);
    }

    async setNoMatchFoundTimeout(userId) {
        this.waitingTimers[userId] = setTimeout(async () => {
            try {
                const socketId = await this.redisClient.get(`user:${userId}:socketId`);
                if (!socketId) {
                    console.log(`No socket ID found for user ${userId}`);
                    return;
                }
                await this.tryMatch();

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
        }, 20000);
    }

    removeFromQueue(userId) {
        this.waitingQueue = this.waitingQueue.filter(player => player.userId !== userId);
    }
}

module.exports = MatchmakingService;
