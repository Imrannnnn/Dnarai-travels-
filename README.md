# Dnarai Enterprise - Global Flight Management Infrastructure

Dnarai Enterprise is a professional, high-fidelity flight orchestration platform designed for travel agencies and elite passengers. It acts as an intelligent middle-man, synchronizing external airline data into a unified, encrypted, and automated dashboard system.

---

## 🏗️ System Architecture

### 1. Agency Headquarters (Super Admin)
The operational backbone where agencies manage their global client base and flight logistics.
- **Automated Client Onboarding**: Single-click creation of passenger accounts with auto-generated security credentials.
- **Data Injection Terminal**: Manual and batch synchronization of flight details from external airline websites.
- **Operational Analytics**: Real-time tracking of passenger flux and fleet itineraries.
- **Identity Orchestration**: Deep management of passenger travel documents (Passports/IDs) with automated expiry monitoring.
- **Satellite Intel Feed**: Global notifications and system alerts (Weather, Flight status, Document warnings).

### 2. Passenger Private Terminal (User Dashboard)
A high-end, personalized interface for travelers to monitor their journeys.
- **High-Fidelity Flight Cards**: Beautifully rendered route visualizations with 12-hour temporal conversion.
- **Secure Document Vault**: Identity-masked storage of travel documents with proximity alerts for expiry.
- **Real-Time Intelligence**: Integration of destination weather, airline status, and system reminders.
- **Premium Aesthetics**: Glassmorphism UI with smooth micro-interactions and high-density information display.

---

## 🎨 Design Philosophy
Dnarai Enterprise follows an **Enterprise-Grade Terminal** aesthetic:
- **Palette**: Slate-950 background for focus, Sky-Blue and Indigo for tactical accents, and High-Contrast White for clarity.
- **Typography**: Heavy, italicized black-weights for titles to convey speed and authority; bold tracking-wide uppercase for operational labels.
- **Interactions**: Smooth scale-transitions, glassmorphism overlays, and animated "Operational Inbound" visuals.

---

## 🛠️ Technical Stack

### Frontend (React + Vite)
- **Framework**: React 18 with high-performance routing via React Router 6.
- **Styling**: Tailwind CSS for high-speed, utility-first design implementation.
- **State & Context**: Centralized `AppDataContext` for synchronized state across dashboard modules.
- **Iconography**: Lucide-React for professional vector-based tactical indicators.

### Backend (Node.js + Express)
- **Runtime**: Node.js with ESM module support.
- **Database**: MongoDB for persistent passenger, booking, and notification storage.
- **Authentication**: JWT-based security with tiered role access (Admin, Agent, Passenger).
- **Automation**: Integrated services for automated email transmissions (Welcome credentials, Flight updates).

---

## 🚀 Performance & Security
- **Data Masking**: Passenger ID/Passport numbers are encrypted and masked (showing only last 4 digits) to prevent data leak.
- **Strict Role RBAC**: Passenger terminals are strictly read-only; operational overrides are limited to authorized Agency Admin identity keys.
- **Zero-Latency Design**: Optimistic UI updates and efficient data fetching protocols ensure a responsive "Command Center" feel.

---

## 📂 Project Structure
```bash
dnarai-enterprise/
├── src/                # React Frontend
│   ├── pages/          # Tactical Page Modules (HomePage, SuperAdmin, Dashboard)
│   ├── components/     # High-fidelity UI Elements
│   ├── data/           # API handlers and Global State
│   └── utils/          # Temporal and String utilities
├── backend/            # Express Hub
│   ├── src/models/     # DB Schema (Passengers, User, Booking, Notification)
│   ├── src/routes/     # API Endpoints & Validations (Zod-enforced)
│   ├── src/services/   # Automation (Email, Weather, Notifications)
│   └── src/middleware/ # Security (JWT Auth, RBAC)
└── package.json        # Global Orchestration
```

---

**Dnarai Enterprise** — Engineering global travel infrastructure, one mission at a time.
