const { Telegraf } = require("telegraf");
const express = require("express");

const bot = new Telegraf("8899788725:AAFp7koJ9mShfpsm2Ft3n9GuPQMnTst8REY");
const app = express();

app.use(express.json());

const ADMIN_ID = 5723771392;

// ===================== API FROM FRONTEND =====================
app.post("/api/order", async (req, res) => {
  try {
    const { cart = [], total = 0, address = "no address", phone = "no phone" } = req.body;

    const itemsText = cart.length
      ? cart.map(i => `- ${i.name} ${i.price}€`).join("\n")
      : "empty cart";

    const text =
`🍣 NEW ORDER

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

// ===================== TELEGRAM START =====================
bot.start((ctx) => {
  ctx.reply("🍣 Sushi Boss", {
    reply_markup: {
      keyboard: [[
        {
          text: "🚀 Сделать заказ",
          web_app: {
            url: "https://mini-app-zeta-rouge.vercel.app"
          }
        }
      ]]
    }
  });
});

// ===================== BOT START =====================
bot.launch();

app.listen(3000, () => {
  console.log("🍣 BOT RUNNING");
});