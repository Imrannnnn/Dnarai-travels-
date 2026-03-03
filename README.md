# Dnarai Enterprise — Global Travel Intelligence & Flight Orchestration

Dnarai Enterprise is a high-fidelity flight management ecosystem designed for elite travel agencies and their passengers. We bridge the gap between complex airline logistics and a premium, human-centric user experience, providing an intelligent "Command Center" for the modern traveler.

---

## 🌟 Premium Features

### 1. Unified Agency Control (Super Admin & Staff)
The operational heart of the system, where multi-role staff manage global travel logistics with surgical precision.
- **Intelligent Onboarding**: Instantly generate passenger accounts with secure, auto-expiring credentials and automated welcome packets.
- **Live Flight Injection**: A high-speed terminal for manual or batch synchronization of complex flight itineraries.
- **Comprehensive Staff Management**: Multi-tiered permissions (Admin, Agent, Staff) to ensure secure operational delegation.
- **Identity & Compliance**: Automated tracking of travel documents (Passports/IDs) with proactive expiry alerts.
- **Operations Dashboard**: Real-time analytics on active bookings, passenger flux, and daily departures.

### 2. Travel Insights & Global Broadcast (New)
A powerful broadcasting system that keeps everyone informed beyond just their flight status.
- **Travel Insights Hub**: Staff can publish beautifully rendered travel updates, destination guides, and emergency alerts.
- **Automated AI Branding**: Every post is instantly paired with contextually relevant, airline-specific imagery based on title keywords.
- **Omnichannel Notifications**: One-click publishing triggers instant **In-App Alerts** and **Web Push Notifications** to all passengers.
- **Public Resilience**: Every insight generates a permanent, unique public URL (slug) for external sharing and SEO-friendly accessibility.

### 3. The Passenger Experience (User Terminal)
A personalized, glassmorphism-inspired interface that makes travel information feel high-end and effortless.
- **Dynamic Flight Cards**: High-fidelity visualizations of upcoming journeys with automated 24h/12h time conversions.
- **Smart Flight Reminders**: Automated intelligence checks (24-hour and 3-hour before departure) sent via Email and Web Push.
- **Destination Intelligence**: Real-time weather data and personalized clothing advice based on the destination's climate.
- **Secure Vault**: End-to-end encrypted storage for travel documents with visual masks to protect privacy.
- **Zero-Latency Interaction**: Optimistic UI updates ensure the dashboard feels alive and responsive.

---

## 🛠️ Technical Stack (The "Steel" Behind the Silk)

### Frontend: React + Vite + Tailwind
- **UI Architecture**: React 18 with a centralized `AppDataContext` for real-time state synchronization.
- **Tactical Design**: Tailwind CSS powers a high-density, "Tactical Terminal" aesthetic (Slate-950, Ocean-600, Gold-400).
- **Iconography**: Premium vector navigation via Lucide-React.

### Backend: Node.js + Express + MongoDB
- **Security**: JWT-based authentication with strict RBAC (Role-Based Access Control) and Zod-enforced schema validation.
- **Broadcast Engine**: Integrated Web Push (VAPID), Email (Nodemailer), and WhatsApp-ready notification services.
- **Intelligence Layer**: Cron-driven background jobs for flight reminders, weather polling, and automated cleanup.

---

## 🎨 Design Philosophy
Dnarai Enterprise is built on the **"Tactical Luxury"** principle:
- **Speed**: Heavy, italicized black-weights denote authority and movement.
- **Clarity**: High-contrast typography and tracking-wide labels for operational readability.
- **Elegance**: Glassmorphism, smooth micro-interactions, and premium color palettes (Ocean Blue, Tactical Slate, Executive Gold).

---

## 📁 Project Portfolio
```bash
dnarai-enterprise/
├── client/             # React User & Admin Terminals
│   ├── src/pages/      # Dedicated modules: SuperAdmin, Blog, Profile, Dashboard
│   ├── src/components/ # Reusable High-Fidelity UI elements
│   └── src/theme/      # Centralized design system and tokens
├── backend/            # Express Orchestration Hub
│   ├── src/controllers/# Business Logic (Auth, Blog, Bookings, Passengers)
│   ├── src/services/   # Automated Intelligence (Push, Weather, Email)
│   ├── src/routes/     # Zod-validated tactical endpoints
│   └── src/models/     # Encrypted Schemas (User, Blog, Passport, Flight)
└── README.md           # This Intelligence Paper
```

---

**Dnarai Enterprise** — Engineering the future of global travel infrastructure.  
*Every journey is a mission. Every passenger is a priority.*

