// GameService.js
class GameService {
    constructor(repository, sqsService) {
        this.repository = repository;
        this.sqsService = sqsService;
    }

    async quickPlay(userId) {
        const message = {
            userId,
            status: 'matchmaking',
            timestamp: Date.now(),
        };
        try {
            await this.sqsService.sendMessage(message);
            console.log(`Matchmaking request sent for user: ${userId}`);
            return {
                success:true,
                msg:'Request added to queue'
            }
        } catch (error) {
            console.error(`Failed to send matchmaking request for user ${userId}:`, error);
        }
    }
}

module.exports = GameService;
