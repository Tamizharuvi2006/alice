const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: String,     // 'user' or 'assistant'
  content: String,
  createdAt: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  chatId: { type: Number, unique: true, required: true },
  messages: [messageSchema],
  nsfw: { type: Boolean, default: false },
  paid: { type: Boolean, default: false },
  messageCount: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Chat', chatSchema);
