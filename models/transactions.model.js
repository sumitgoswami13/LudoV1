const mongoose = require('mongoose');
const { Schema } = mongoose;

const coinsTransactionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user
  type: { 
    type: String, 
    enum: ['earn', 'spend', 'bonus', 'refund'], // Define types of transactions
    required: true 
  },
  amount: { type: Number, required: true },             // Amount of coins added or deducted
  balanceBefore: { type: Number, required: true },      // Balance before the transaction
  balanceAfter: { type: Number, required: true },       // Balance after the transaction
  description: { type: String },                         // Description of the transaction
  createdAt: { type: Date, default: Date.now }         // Timestamp of the transaction
});

const CoinsTransactions = mongoose.model('CoinsTransactions', coinsTransactionSchema);
module.exports = CoinsTransactions;
