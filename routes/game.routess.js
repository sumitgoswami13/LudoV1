const express = require('express');
const GameController = require('../controler/game.controler'); // Import the GameController

module.exports = (gameservice) => {
    const router = express.Router();
    const gameController = new GameController(gameservice);

    router.get('/quickplay/:userId', async (req, res) => {
        try {
            await gameController.quickPlay(req, res);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    });

    return router;
};
