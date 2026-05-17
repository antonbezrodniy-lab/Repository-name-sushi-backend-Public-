import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { Telegraf } from "telegraf";

console.log("🔥 NODE_ENV:", process.env.NODE_ENV);

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ================= ENV CHECK =================
console.log("🔥 ENV CHECK:", {
  STRIPE: !!process.env.STRIPE_SECRET_KEY,
  BOT: !!process.env.BOT_TOKEN,
  CHAT: !!process.env.CHAT_ID,
});

// ================= SAFETY CHECKS =================
if (!process.env.STRIPE_SECRET_KEY) {
  console.log("❌ STRIPE_SECRET_KEY missing");
  process.exit(1);
}

if (!process.env.BOT_TOKEN) {
  console.log("❌ BOT_TOKEN missing");
  process.exit(1);
}

if (!process.env.CHAT_ID) {
  console.log("❌ CHAT_ID missing");
  process.exit(1);
}

// ================= INIT =================
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

// 🔥 ВАЖНО: убрать webhook конфликты
bot.telegram.deleteWebhook().catch(() => {});

console.log("🚀 SERVER STARTED");

// ================= BOT =================
bot.start((ctx) => {
  console.log("🔥 START COMMAND RECEIVED");

  return ctx.reply("🍣 Sushi Bot работает", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Открыть заказ",
            web_app: {
              url: "https://mini-app-zeta-rouge.vercel.app"
            }
          }
        ]
      ]
    }
  });
});

// ================= START BOT =================
bot.launch()
  .then(() => console.log("🤖 BOT RUNNING"))
  .catch((err) => console.log("❌ BOT ERROR:", err));

// ================= EXPRESS =================
app.get("/", (req, res) => {
  res.send("SERVER OK");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ================= STRIPE =================
app.post("/create-checkout", async (req, res) => {
  try {
    const cart = req.body.cart;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Invalid cart" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: cart.map((item) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      })),

      success_url: "https://google.com",
      cancel_url: "https://google.com",
    });

    console.log("💳 SESSION CREATED:", session.id);

    const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

    const message =
      `🍣 NEW ORDER\n\n` +
      cart.map(i => `${i.name} x${i.qty}`).join("\n") +
      `\n\n💰 TOTAL: ${total}€`;

    await bot.telegram.sendMessage(process.env.CHAT_ID, message);

    console.log("📲 TELEGRAM SENT");

    res.json({ url: session.url });

  } catch (err) {
    console.log("❌ ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING ON PORT", PORT);
});

// ================= CRASH HANDLERS =================
process.on("uncaughtException", (err) => {
  console.log("🔥 UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("🔥 UNHANDLED REJECTION:", err);
});