const mongoose = require('mongoose');
const { Schema } = mongoose;

const friendsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },   // User who initiated the friend connection
  friendId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // User who was added as a friend
  status: { 
    type: String, 
    enum: ['requested', 'accepted', 'blocked'],                          // Status of the friendship
    required: true 
  },
  createdAt: { type: Date, default: Date.now }                           // Date of friend request or acceptance
});

const Friends = mongoose.model('Friends', friendsSchema);
module.exports = Friends;
