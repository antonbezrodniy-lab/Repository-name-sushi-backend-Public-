# Sushi Backend

Express API with Telegram bot and Stripe checkout.

```bash
npm install
npm start
```

Required `.env` values:

```env
PORT=5000
FRONTEND_URL=https://your-frontend-url.vercel.app
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id
TELEGRAM_POLLING_ENABLED=true
```

For local frontend/API testing while a deployed bot is already active, run with
`TELEGRAM_POLLING_ENABLED=false`.

Routes:

```text
GET  /
GET  /health
GET  /api/orders
POST /create-checkout
POST /stripe-webhook
```

In Stripe Dashboard, create a webhook endpoint:

```text
https://your-backend-url.com/stripe-webhook
```

Enable this event:

```text
checkout.session.completed
```
