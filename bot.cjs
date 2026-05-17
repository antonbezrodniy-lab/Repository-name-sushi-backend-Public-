const { Telegraf } = require("telegraf");
const express = require("express");

const app = express();
app.use(express.json());

// ================= BOT TOKEN =================
const BOT_TOKEN = process.env."8899788725:AAHLECtIaBExZwuAPnmQ7jubaNAOBS-2DIo";

if (!BOT_TOKEN) {
  console.log("❌ BOT TOKEN MISSING");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const ADMIN_ID = 5723771392;

console.log("🚀 SERVER STARTING");

// ================= TELEGRAM START =================
bot.start((ctx) => {
  console.log("🔥 START RECEIVED");

  ctx.reply("🍣 Sushi Boss", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Сделать заказ",
            web_app: {
              url: "https://mini-app-zeta-rouge.vercel.app"
            }
          }
        ]
      ]
    }
  });
});

// ================= ORDER API =================
app.post("/api/order", async (req, res) => {
  try {
    const {
      cart = [],
      total = 0,
      address = "no address",
      phone = "no phone"
    } = req.body;

    const itemsText = cart.length
      ? cart.map(i => `- ${i.name} ${i.price}€`).join("\n")
      : "empty cart";

    const text = `🍣 NEW ORDER

📍 ${address}
📞 ${phone}

💰 ${total}€

📦 ITEMS:
${itemsText}`;

    await bot.telegram.sendMessage(ADMIN_ID, text);

    res.json({ ok: true });
  } catch (err) {
    console.log("ORDER ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// ================= BOT ERROR HANDLING =================
bot.catch((err) => {
  console.log("🔥 BOT ERROR:", err);
});

// ================= START BOT =================
(async () => {
  try {
    await bot.launch();
    console.log("🤖 BOT IS RUNNING");
  } catch (err) {
    console.log("❌ BOT LAUNCH ERROR:", err);
  }
})();

// ================= EXPRESS SERVER =================
app.get("/", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🍣 SERVER RUNNING ON PORT", PORT);
});