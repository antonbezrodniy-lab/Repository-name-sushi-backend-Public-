const express = require("express");
const { Telegraf } = require("telegraf");

const app = express();
app.use(express.json());

console.log("🚀 BACKEND STARTED");

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

console.log("🔎 TOKEN:", token ? "OK" : "MISSING");

if (!token) {
  throw new Error("BOT_TOKEN missing");
}

const bot = new Telegraf(token);

// BOT START
bot.start((ctx) => {
  console.log("🔥 START");
  ctx.reply("🍣 Sushi Bot запущен", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Открыть приложение",
            web_app: {
              url: "https://mini-app-zeta-rouge.vercel.app"
            }
          }
        ]
      ]
    }
  });
});

bot.launch()
  .then(() => console.log("🤖 BOT RUNNING"))
  .catch(err => console.log("❌ BOT ERROR:", err));

// ORDER API
app.post("/order", async (req, res) => {
  const { cart } = req.body;

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const message =
`🍣 NEW ORDER

💰 TOTAL: ${total}€

📦 ITEMS:
${cart.map(i => `${i.name} x${i.qty}`).join("\n")}`;

  if (chatId) {
    await bot.telegram.sendMessage(chatId, message);
  }

  res.json({ ok: true });
});

// SERVER
app.get("/", (req, res) => {
  res.send("Sushi backend OK");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🔥 SERVER ON", PORT);
});