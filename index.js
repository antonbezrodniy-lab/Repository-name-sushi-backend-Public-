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
}

if (!process.env.BOT_TOKEN) {
  console.log("❌ BOT_TOKEN missing");
  process.exit(1);
}

if (!process.env.CHAT_ID) {
  console.log("❌ CHAT_ID missing");
}

// ================= STRIPE =================
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ================= TELEGRAM BOT =================
const bot = new Telegraf(process.env.BOT_TOKEN);

console.log("🚀 SERVER STARTED");

// ================= BOT START =================
bot.start((ctx) => {
  console.log("🔥 START COMMAND RECEIVED");

  ctx.reply("🍣 Sushi Bot работает", {
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

// ================= BOT LAUNCH =================
bot.launch()
  .then(() => console.log("🤖 BOT RUNNING"))
  .catch((err) => console.log("❌ BOT ERROR:", err));

// ================= EXPRESS ROUTES =================
app.get("/", (req, res) => {
  res.send("SERVER OK");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

// ================= STRIPE CHECKOUT =================
app.post("/create-checkout", async (req, res) => {
  console.log("🔥 CHECKOUT HIT");

  try {
    const cart = req.body.cart;

    if (
      !Array.isArray(cart) ||
      cart.length === 0 ||
      cart.some(
        (item) =>
          !item.name ||
          typeof item.price !== "number" ||
          typeof item.qty !== "number"
      )
    ) {
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

    const text = cart
      .map((i) => `${i.name} x${i.qty} = ${i.price * i.qty}€`)
      .join("\n");

    const message = `🍣 NEW ORDER\n\n${text}\n\n💰 TOTAL: ${total}€`;

    try {
      await bot.telegram.sendMessage(process.env.CHAT_ID, message);
      console.log("📲 TELEGRAM SENT");
    } catch (err) {
      console.log("❌ TELEGRAM ERROR:", err.message);
    }

    res.json({ url: session.url });

  } catch (err) {
    console.log("❌ STRIPE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING ON PORT", PORT);
});

// ================= ERROR HANDLERS =================
process.on("uncaughtException", (err) => {
  console.log("🔥 UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("🔥 UNHANDLED REJECTION:", err);
});