const mongoose = require('mongoose');
const { Schema } = mongoose;

const gameStatsSchema = new Schema({
  totalGames: { type: Number, default: 0 },           // Total games played
  gamesWon: { type: Number, default: 0 },             // Total games won
  gamesLost: { type: Number, default: 0 },            // Total games lost
  winRate: { type: Number, default: 0 },              // Calculated win rate (gamesWon / totalGames)
  averageDiceRoll: { type: Number, default: 0 },      // Average dice roll per game
  highestWinStreak: { type: Number, default: 0 },     // Longest winning streak
  currentWinStreak: { type: Number, default: 0 },     // Current ongoing winning streak
  averageGameDuration: { type: Number, default: 0 }   // Average duration of games played
});

const verification  = new Schema({
    email_verification_code:{type:Number,default:""},
    expireAt: { type: Date, default: Date.now }, 
    otp: {type:Number,default:""},
    otpExpireAt:{ type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },       
    updatedAt: { type: Date, default: Date.now },
})

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },      // Hashed password
  profilePicture: { type: String },                    // URL to profile picture
  coins: { type: Number, default: 0 },                 // Coin balance in wallet
  currentRank: { type: Number, default: 0 },           // Player rank determined by coin balance
  verification:{type: verification, default: () => ({})},  //user verification // default is an function to create empty object 
  type: { type: String, enum: ['user', 'admin'], default: 'user' },      
  gameStats: { type: gameStatsSchema, default: () => ({}) },  // Embedded game stats
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],    // Array of user IDs representing friends
  createdAt: { type: Date, default: Date.now },        // Account creation date
  updatedAt: { type: Date, default: Date.now }         // Last update date
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
