# FASTNET WiFi Hotspot Billing System

A captive portal billing system for MikroTik WiFi hotspots with Mobile Money payments (MTN MoMo & Airtel Money) for Uganda.

## Features

- 📱 **Mobile-first captive portal** - Clean payment interface
- 💳 **Mobile Money integration** - MTN MoMo & Airtel Money via Flutterwave
- 🎫 **Voucher system** - Pre-paid code redemption
- 📊 **Admin dashboard** - Revenue stats, payments, active users
- 🌐 **MikroTik integration** - Auto-authorize users after payment

## Packages

| Package | Duration | Price |
|---------|----------|-------|
| 1 DAY | 24 hours | 1,000 UGX |
| 3 DAYS | 72 hours | 2,500 UGX |
| WEEKLY | 7 days | 6,000 UGX |
| MONTHLY | 30 days | 25,000 UGX |

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (demo mode enabled)
npm run dev
```

Open http://localhost:3000 for the portal and http://localhost:3000/admin for the dashboard.

## Environment Variables

Create a `.env.local` file:

```env
# Flutterwave API (get from dashboard.flutterwave.com)
FLW_PUBLIC_KEY=your_public_key
FLW_SECRET_KEY=your_secret_key

# MikroTik Router
MIKROTIK_HOST=192.168.88.1
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=your_password

# Demo mode (set to 'false' for production)
DEMO_MODE=true
```

## Tech Stack

- **Next.js 15** - React framework
- **SQLite** - Database (better-sqlite3)
- **Flutterwave** - Payment processing
- **MikroTik API** - Router integration
- **Tailwind CSS** - Styling

## Production Deployment

1. Register at [Flutterwave](https://dashboard.flutterwave.com)
2. Add API keys to environment
3. Configure MikroTik router
4. Set `DEMO_MODE=false`
5. Deploy to your server

## License

MIT
