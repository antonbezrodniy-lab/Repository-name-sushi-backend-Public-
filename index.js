<<<<<<< HEAD
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
=======
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
>>>>>>> 246b22a82cd772592e10e98c0f3c10139327531c
    reply_markup: {
      inline_keyboard: [
        [
          {
<<<<<<< HEAD
            text: "🚀 Открыть приложение",
=======
            text: "🚀 Открыть заказ",
>>>>>>> 246b22a82cd772592e10e98c0f3c10139327531c
            web_app: {
              url: "https://mini-app-zeta-rouge.vercel.app"
            }
          }
        ]
      ]
    }
  });
});

<<<<<<< HEAD
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
=======
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
>>>>>>> 246b22a82cd772592e10e98c0f3c10139327531c
});