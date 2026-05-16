import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { Telegraf } from "telegraf";

console.log("🔥 NODE_ENV:", process.env.NODE_ENV);

const app = express();

app.use(cors({
  origin: "*",
}));

app.use(express.json());

// 🔥 ENV CHECK
console.log("🔥 ENV CHECK:", {
  STRIPE: !!process.env.STRIPE_SECRET_KEY,
  BOT: !!process.env.BOT_TOKEN,
  CHAT: !!process.env.CHAT_ID,
});

// ❌ SAFETY CHECKS
if (!process.env.STRIPE_SECRET_KEY) {
  console.log("❌ STRIPE_SECRET_KEY missing");
}

if (!process.env.BOT_TOKEN) {
  console.log("❌ BOT_TOKEN missing");
}

if (!process.env.CHAT_ID) {
  console.log("❌ CHAT_ID missing");
}

// Stripe (SAFE INIT)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Telegram (SAFE INIT)
const bot = process.env.BOT_TOKEN
  ? new Telegraf(process.env.BOT_TOKEN)
  : null;

console.log("🔥 SERVER STARTED");

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("SERVER OK");
});

// ✅ HEALTH CHECK
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

// 🥇 STRIPE CHECKOUT
app.post("/create-checkout", async (req, res) => {
  console.log("🔥 CHECKOUT HIT");
  console.log("📦 BODY:", JSON.stringify(req.body, null, 2));

  try {
    const cart = req.body.cart;

    // ✅ CART VALIDATION
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
      return res.status(400).json({
        error: "Invalid cart",
      });
    }

    // ✅ STRIPE CHECK
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe not initialized",
      });
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

      // ✅ TEMP URLS
      success_url: "https://google.com",
      cancel_url: "https://google.com",
    });

    console.log("💳 SESSION CREATED:", session.id);

    // 🍣 TELEGRAM ORDER
    const total = cart.reduce(
      (s, i) => s + i.qty * i.price,
      0
    );

    const text = cart
      .map(
        (i) =>
          `${i.name} x${i.qty} = ${i.price * i.qty}€`
      )
      .join("\n");

    const message =
      `🍣 NEW ORDER\n\n${text}\n\n💰 TOTAL: ${total}€`;

    try {
      if (bot && process.env.CHAT_ID) {
        await bot.telegram.sendMessage(
          process.env.CHAT_ID,
          message
        );

        console.log("📲 TELEGRAM SENT");
      } else {
        console.log("❌ Telegram bot not initialized");
      }
    } catch (err) {
      console.log("❌ TELEGRAM ERROR:", err.message);
    }

    return res.json({
      url: session.url,
    });

  } catch (err) {
    console.log("❌ STRIPE ERROR:", err.message);

    return res.status(500).json({
      error: err.message,
    });
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 5000;

console.log("🔥 PORT:", process.env.PORT);

try {
  app.listen(PORT, () => {
    console.log("🔥 SERVER RUNNING ON PORT", PORT);
  });
} catch (err) {
  console.log("🔥 SERVER START ERROR:", err);
}

// 💥 GLOBAL CRASH CATCHER
process.on("uncaughtException", (err) => {
  console.log("🔥 UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("🔥 UNHANDLED REJECTION:", err);
});