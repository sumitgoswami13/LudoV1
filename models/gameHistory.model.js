const mongoose = require('mongoose');
const { Schema } = mongoose;

const playerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // User ID of the player
  username: { type: String, required: true },                            // Username for quick reference
  finalPosition: { type: Number, required: true }                        // Final position at the end of the game
});

const gameHistorySchema = new Schema({
  gameId: { type: String, required: true, unique: true },               // ID used in Redis, added for reference
  players: { type: [playerSchema], required: true },                    // Array of player details
  winner: { type: Schema.Types.ObjectId, ref: 'User' },                 // User ID of the winner
  status: { type: String, enum: ['completed'], default: 'completed' },  // Game status, defaulting to "completed"
  startedAt: { type: Date, required: true },                            // Game start time
  endedAt: { type: Date, required: true }                               // Game end time
});

const GamesHistory = mongoose.model('GamesHistory', gameHistorySchema);
module.exports = GamesHistory;
