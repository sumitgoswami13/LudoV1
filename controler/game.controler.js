class GameControler {
    constructor(gameservice){
        this.gameservice = gameservice
    }

    async quickPlay(req,res){
        try{
            const {userId} = req.params;
            if(!userId){
                throw new Error("UserId is Required")
            }
            const result = await this.gameservice.quickPlay(userId);
            res.status(200).send(result)
        }
        catch(error){
            throw new Error(error)
        }
    }
}

module.exports = GameControler