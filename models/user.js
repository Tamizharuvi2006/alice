const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  username: String,
  nsfw: { type: Boolean, default: false },
  paid: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
