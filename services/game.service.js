class GameService {
    constructor(repository){
        this.repository = repository
    }

    async QuickPlay(userId){
        /* take the userId update the status to match making in the redis database */
        /* fetch the perfect match from the redis */
        /* create a room using the userid and the oponentid */
        /* emit the room id */
        /* make sure both the user join then emit the game start */
    }
}