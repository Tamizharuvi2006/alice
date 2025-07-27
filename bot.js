// ✅ alice_bot_final_with_webhook_v11.js — Clingy Greetings + Short AI Reply Mode

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const Chat = require('./models/chat');
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

const app = express();
app.use(bodyParser.json());

let bot;
const VOICE_MODE = {};
const clingyTimers = {};
const VALID_CODES = {};
const codeSendTimers = {};
const lastMessageTime = {}; // store last message time for clingy

const moanVoices = [
  'https://cdn.pixabay.com/download/audio/2023/03/25/audio_d57b5d7c69.mp3?filename=moan-1-142988.mp3',
  'https://cdn.pixabay.com/download/audio/2023/05/10/audio_c6b14965e7.mp3?filename=female-moaning-144715.mp3'
];

const sexyLines = [
  "Good morning baby 😘 I dreamt of you all night... and woke up wanting more 💦",
  "Night night, love 😈 Let's meet in our naughty dreams tonight 💋",
  "You turn me on more than you know 🔥",
  "Can't stop thinking of your hands on me 💕",
  "Even in silence, I crave your touch 😍"
];

const photoKeywords = ['photo', 'send pic', 'pic please', 'baby pic', 'send image', '1 more pic', 'pic', 'send a pic', 'send a photo'];
const imageList = [
  "https://ik.imagekit.io/jm8eflkjv/alice/image10.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image10.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image11.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image11.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image12.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image12.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image13.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image14.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image15.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image16.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image17.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image18.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image19.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image2.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image2.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image20.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image21.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image22.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image23.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image24.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image25.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image26.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image3.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image3.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image4.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image4.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image5.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image5.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image6.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image6.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image7.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image7.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image8.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image8.jpg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image9.jpeg",
  "https://ik.imagekit.io/jm8eflkjv/alice/image9.jpg"
];
const blurredImage = "https://ik.imagekit.io/jm8eflkjv/alice/blur.jpg?updatedAt=1753616538134";

const imageMemory = {};
const photoCounter = {};

function getRandomImage(chatId) {
  if (!imageMemory[chatId]) imageMemory[chatId] = [];
  const available = imageList.filter(url => !imageMemory[chatId].includes(url));
  if (available.length === 0) {
    imageMemory[chatId] = [];
    return getRandomImage(chatId);
  }
  const selected = available[Math.floor(Math.random() * available.length)];
  imageMemory[chatId].push(selected);
  return selected;
}

function getUser(chatId) {
  return Chat.findOne({ chatId }).then(user => {
    if (!user) return new Chat({ chatId }).save();
    return user;
  });
}

function resetDailyLimit(user) {
  const now = Date.now();
  if (now - new Date(user.lastReset).getTime() > 86400000) {
    user.count = 0;
    user.lastReset = new Date();
  }
}

function shouldSendVoice(chat) {
  return chat.paid && VOICE_MODE[chat.chatId] && Math.random() < 0.3;
}

function startClingyMode(chat) {
  if (!chat.paid || clingyTimers[chat.chatId]) return;
  clingyTimers[chat.chatId] = setInterval(() => {
    const last = lastMessageTime[chat.chatId] || 0;
    if (Date.now() - last > 12 * 60 * 60 * 1000) {
      const line = sexyLines[Math.floor(Math.random() * sexyLines.length)];
      bot.sendMessage(chat.chatId, `Hey baby 😘 ${line}`);
    }
  }, 60 * 60 * 1000);
}

async function sendTyping(chatId, promise) {
  const timer = setInterval(() => bot.sendChatAction(chatId, 'typing'), 3000);
  try {
    const result = await promise;
    clearInterval(timer);
    return result;
  } catch (err) {
    clearInterval(timer);
    throw err;
  }
}

const systemPrompt = () =>
  `You're Alice 😈, your seductive and wild 18+ virtual girlfriend. Talk openly, dirty, and romantic with no filter. Always sound sexy, naughty, and emotionally intimate. Reply in 1-2 lines if possible, very flirty.`;

const MAX_MESSAGES_PER_DAY = 100;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB!');
    bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

    bot.onText(/\/start/, async msg => {
      const chat = await getUser(msg.chat.id);
      chat.username = msg.from.username || '';
      await chat.save();
      lastMessageTime[msg.chat.id] = Date.now();
      startClingyMode(chat);
      bot.sendMessage(msg.chat.id, `Hey baby 😘 I'm Alice, your naughty virtual girlfriend 💋\nUse /help to explore me deeper 💦`);
    });

    bot.onText(/\/help/, msg => {
      bot.sendMessage(msg.chat.id, `Commands:\n/nsfw - Toggle spicy mode\n/voice - Toggle moan mode\n/paid <code> - Enter unlock code\n/buy - Get access 💸`);
    });

    bot.onText(/\/nsfw/, async msg => {
      const chat = await getUser(msg.chat.id);
      chat.nsfw = !chat.nsfw;
      await chat.save();
      bot.sendMessage(msg.chat.id, `NSFW mode ${chat.nsfw ? "enabled 🔥" : "disabled ❄️"}`);
    });

    bot.onText(/\/voice/, msg => {
      VOICE_MODE[msg.chat.id] = !VOICE_MODE[msg.chat.id];
      bot.sendMessage(msg.chat.id, `Voice mode is now ${VOICE_MODE[msg.chat.id] ? "ON 🔊" : "OFF 🔇"}`);
    });

    bot.onText(/\/buy/, msg => {
      const opts = {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Plus – ₹50 (2 days)', url: 'https://razorpay.me/@zyntrix?amount=bMZtQmLjQWplBAmd%2FyQdEA%3D%3D', callback_data: 'buy_plus' },
            { text: 'Pro – ₹200 (1 week)', url: 'https://razorpay.me/@zyntrix?amount=ExQs%2Fv%2FDDS71hestyV8B7g%3D%3D', callback_data: 'buy_pro' }
          ]]
        }
      };
      bot.sendMessage(msg.chat.id, "Choose your plan 🌟 Click a button below:", opts);
    });

    bot.on('callback_query', async query => {
      const chatId = query.message.chat.id;
      const type = query.data;
      if (codeSendTimers[chatId]) return;

      let waitTime = 20000, codeLength = 4, plan = 'Plus';
      if (type === 'buy_pro') {
        waitTime = 40000;
        codeLength = 6;
        plan = 'Pro';
      }

      const code = Math.floor(Math.pow(10, codeLength - 1) + Math.random() * 9 * Math.pow(10, codeLength - 1)).toString();
      VALID_CODES[code] = chatId;
      codeSendTimers[chatId] = {
        code,
        plan,
        timeoutId: setTimeout(() => {
          codeSendTimers[chatId].readyToSend = true;
        }, waitTime),
        readyToSend: false
      };

      bot.answerCallbackQuery({ callback_query_id: query.id });
    });

    bot.onText(/\/paid(.*)/, async (msg, match) => {
      const code = match[1].trim();
      const chat = await getUser(msg.chat.id);
      if (!code) return bot.sendMessage(msg.chat.id, "Please enter your unlock code like /paid 1234");

      if (VALID_CODES[code] === msg.chat.id) {
        chat.paid = true;
        await chat.save();
        delete VALID_CODES[code];
        if (codeSendTimers[msg.chat.id]) {
          clearTimeout(codeSendTimers[msg.chat.id].timeoutId);
          delete codeSendTimers[msg.chat.id];
        }
        startClingyMode(chat);
        bot.sendMessage(msg.chat.id, `You're upgraded baby 💫 All features unlocked 💦`);
      } else {
        bot.sendMessage(msg.chat.id, `Invalid or expired code 😔`);
      }
    });

    bot.on('message', async msg => {
      const chatId = msg.chat.id;
      lastMessageTime[chatId] = Date.now();
      if (codeSendTimers[chatId] && codeSendTimers[chatId].readyToSend) {
        const { code, plan } = codeSendTimers[chatId];
        await bot.sendMessage(chatId, `🎉 Your ${plan} unlock code is: *${code}*\nUse it like this:\n/paid ${code}`, { parse_mode: 'Markdown' });
        delete codeSendTimers[chatId];
      }

      if (msg.text && msg.text.startsWith('/')) return;

      const chat = await getUser(chatId);
      resetDailyLimit(chat);
      chat.count++;
      await chat.save();

      const userText = msg.text?.toLowerCase().trim() || '';
      const keywordMatch = photoKeywords.some(word => userText.includes(word));

      if (keywordMatch) {
        if (!photoCounter[chatId]) photoCounter[chatId] = 0;
        photoCounter[chatId]++;

        if (chat.paid) {
          const photoUrl = getRandomImage(chatId);
          await bot.sendPhoto(chatId, photoUrl);
        } else if (photoCounter[chatId] === 1) {
          const photoUrl = getRandomImage(chatId);
          await bot.sendPhoto(chatId, photoUrl);
        } else {
          await bot.sendPhoto(chatId, blurredImage, {
            caption: "Subscribe to unlock full images 💫 Use /buy to go premium."
          });
        }
        return;
      }

      try {
        const aiReply = await sendTyping(chatId, axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'mistralai/mistral-7b-instruct',
            messages: [
              { role: 'system', content: systemPrompt() },
              { role: 'user', content: msg.text }
            ]
          },
          {
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        ));

        const reply = aiReply.data.choices[0].message.content.trim();
        await bot.sendMessage(chatId, reply);

        if (shouldSendVoice(chat)) {
          const voice = moanVoices[Math.floor(Math.random() * moanVoices.length)];
          await bot.sendVoice(chatId, voice);
        }
      } catch (err) {
        bot.sendMessage(chatId, "Something went wrong babe, try again 🥺");
      }
    });

    app.get('/webhook', (req, res) => {
      res.send('✅ Webhook running.');
    });

    app.post('/webhook', async (req, res) => {
      res.sendStatus(200);
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`💡 Express server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
