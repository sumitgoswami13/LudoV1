const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // User receiving the notification
  type: { 
    type: String, 
    enum: ['friend_request', 'game_invite', 'rank_update', 'coin_transaction'], // Define possible types of notifications
    required: true 
  },
  content: { type: String, required: true },                            // Message or content of the notification
  isRead: { type: Boolean, default: false },                           // Read status, default to false
  createdAt: { type: Date, default: Date.now }                         // Timestamp of the notification
});

const Notifications = mongoose.model('Notifications', notificationSchema);
module.exports = Notifications;
