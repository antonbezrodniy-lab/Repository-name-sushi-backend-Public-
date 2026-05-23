import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { Telegraf } from "telegraf";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://mini-app-zeta-rouge.vercel.app";
const ORDERS_FILE = join(dirname(fileURLToPath(import.meta.url)), "orders.json");
const TELEGRAM_POLLING_ENABLED = process.env.TELEGRAM_POLLING_ENABLED !== "false";

const requiredEnv = ["STRIPE_SECRET_KEY", "BOT_TOKEN", "CHAT_ID"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.log(`${key} missing`);
    process.exit(1);
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(cors({ origin: "*" }));

// Stripe needs the raw request body for webhook signature verification.
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(500).send("STRIPE_WEBHOOK_SECRET missing");
      }

      const signature = req.headers["stripe-signature"];
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === "checkout.session.completed") {
        await sendPaidOrderToTelegram(event.data.object);
      }

      res.json({ received: true });
    } catch (err) {
      console.log("Stripe webhook error:", err.message);
      res.status(400).send(`Webhook error: ${err.message}`);
    }
  }
);

app.use(express.json());

async function startBot() {
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });

    bot.start((ctx) => {
      return ctx.reply("Sushi Bot works", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open order",
                web_app: {
                  url: FRONTEND_URL,
                },
              },
            ],
          ],
        },
      });
    });

    bot.command("chatid", (ctx) => {
      return ctx.reply(`CHAT_ID: ${ctx.chat.id}`);
    });

    bot.catch((err) => {
      console.log("Bot error:", err);
    });

    await bot.launch();
    console.log("Bot running");
  } catch (err) {
    console.log("Bot start error:", err);
  }
}

async function readOrders() {
  try {
    const content = await readFile(ORDERS_FILE, "utf8");
    const orders = JSON.parse(content);
    return Array.isArray(orders) ? orders : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeOrders(orders) {
  await writeFile(ORDERS_FILE, `${JSON.stringify(orders, null, 2)}\n`, "utf8");
}

function normalizeCart(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error("Invalid cart");
  }

  return cart.map((item) => {
    const name = String(item.name || "").trim();
    const price = Number(item.price);
    const qty = Number(item.qty);

    if (!name || !Number.isFinite(price) || price <= 0) {
      throw new Error("Invalid cart item");
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new Error("Invalid item quantity");
    }

    return {
      id: String(item.id || name),
      name,
      price,
      qty,
    };
  });
}

function normalizeCustomer(customer = {}) {
  return {
    name: String(customer.name || "").trim().slice(0, 120),
    phone: String(customer.phone || "").trim().slice(0, 80),
    address: String(customer.address || "").trim().slice(0, 180),
    comment: String(customer.comment || "").trim().slice(0, 120),
  };
}

function formatOrderMessage({ sessionId, cart, customer, total }) {
  const items = cart
    .map((item) => `${item.name} x${item.qty} = ${item.price * item.qty} EUR`)
    .join("\n");

  const customerLines = [
    customer.name && `Name: ${customer.name}`,
    customer.phone && `Phone: ${customer.phone}`,
    customer.address && `Address: ${customer.address}`,
    customer.comment && `Comment: ${customer.comment}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "PAID ORDER",
    "",
    items,
    "",
    `Total: ${total} EUR`,
    customerLines && "",
    customerLines,
    "",
    `Stripe session: ${sessionId}`,
  ]
    .filter((line) => line !== false)
    .join("\n");
}

async function sendPaidOrderToTelegram(session) {
  const cart = JSON.parse(session.metadata.cart || "[]");
  const customer = JSON.parse(session.metadata.customer || "{}");
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const orders = await readOrders();
  const existingOrder = orders.find((order) => order.stripeSessionId === session.id);

  if (existingOrder?.telegramSentAt) {
    console.log("Paid order already sent to Telegram:", session.id);
    return;
  }

  const message = formatOrderMessage({
    sessionId: session.id,
    cart,
    customer,
    total,
  });

  await bot.telegram.sendMessage(process.env.CHAT_ID, message);

  if (existingOrder) {
    existingOrder.telegramSentAt = new Date().toISOString();
  } else {
    orders.unshift({
      id: session.id,
      stripeSessionId: session.id,
      status: "paid",
      paymentStatus: session.payment_status,
      customer,
      items: cart,
      total,
      currency: session.currency,
      createdAt: new Date().toISOString(),
      telegramSentAt: new Date().toISOString(),
    });
  }

  await writeOrders(orders);
  console.log("Paid order sent to Telegram:", session.id);
}

if (TELEGRAM_POLLING_ENABLED) {
  startBot();
} else {
  console.log("Telegram polling disabled");
}

app.get("/", (req, res) => {
  res.send("SERVER OK");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await readOrders();
    res.json(orders);
  } catch (err) {
    console.log("Orders read error:", err.message);
    res.status(500).json({ error: "Could not read orders" });
  }
});

app.post("/create-checkout", async (req, res) => {
  try {
    const cart = normalizeCart(req.body.cart);
    const customer = normalizeCustomer(req.body.customer);
    const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

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
      metadata: {
        cart: JSON.stringify(cart),
        customer: JSON.stringify(customer),
      },
      success_url: `${FRONTEND_URL}?payment=success`,
      cancel_url: `${FRONTEND_URL}?payment=cancel`,
    });

    console.log("Checkout session created:", session.id, "Total:", total);
    res.json({ url: session.url });
  } catch (err) {
    console.log("Checkout error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.log("Uncaught error:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled rejection:", err);
});
