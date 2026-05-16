import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { Telegraf } from "telegraf";

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
}));

app.use(express.json());

console.log("🔥 SERVER STARTED");

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Telegram
const bot = new Telegraf(process.env.BOT_TOKEN);

// TEST
app.get("/", (req, res) => {
  res.send("SERVER OK");
});

// 🥇 STRIPE CHECKOUT
app.post("/create-checkout", async (req, res) => {
  console.log("🔥 CHECKOUT HIT");
  console.log("📦 BODY:", JSON.stringify(req.body, null, 2));

  try {
    const cart = req.body.cart;

    if (!Array.isArray(cart) || cart.length === 0) {
      console.log("❌ EMPTY CART");
      return res.status(400).json({ error: "Cart is empty" });
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
      success_url: "http://localhost:3000",
      cancel_url: "http://localhost:3000",
    });

    console.log("💳 SESSION CREATED:", session.id);

    // 🍣 TELEGRAM ORDER
    const total = cart.reduce((s, i) => s + i.qty * i.price, 0);

    const text = cart
      .map(i => `${i.name} x${i.qty} = ${i.price * i.qty}€`)
      .join("\n");

    const message = `🍣 NEW ORDER\n\n${text}\n\n💰 TOTAL: ${total}€`;

    try {
      console.log("👉 CHAT_ID:", process.env.CHAT_ID);
      console.log("👉 MESSAGE:", message);
      console.log("📨 SENDING TELEGRAM...");

      await bot.telegram.sendMessage(
        process.env.CHAT_ID,
        message
      );

      console.log("📲 TELEGRAM SENT");
    } catch (err) {
      console.log("❌ TELEGRAM ERROR:", err.message);
    }

    return res.json({ url: session.url });

  } catch (err) {
    console.log("❌ STRIPE ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// 🚀 START SERVER
app.listen(5000, () => {
  console.log("Server läuft auf http://localhost:5000");
});