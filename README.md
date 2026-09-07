# WattWise · AI-Powered Smart Electricity Conservation Platform

WattWise is an enterprise-grade, full-stack IoT platform engineered to monitor institutional electricity consumption, track room occupancy, detect unattended energy wastage using a verified 20-minute continuous evaluation rule, deliver empirical analytics and AI insights, and alert facility administrators.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Our Solution](#our-solution)
4. [Hardware & IoT Architecture](#hardware--iot-architecture)
5. [Technology Stack](#technology-stack)
6. [Folder Structure](#folder-structure)
7. [Prerequisites](#prerequisites)
8. [Installation & Setup](#installation--setup)
9. [Environment Variables](#environment-variables)
10. [Database Setup & Migrations](#database-setup--migrations)
11. [Running in Development](#running-in-development)
12. [Building & Running in Production](#building--running-in-production)
13. [ESP32 Hardware Provisioning Guide](#esp32-hardware-provisioning-guide)
14. [Sensor Wiring & Configuration](#sensor-wiring--configuration)
15. [API Reference](#api-reference)
16. [Security & Authentication](#security--authentication)
17. [Wastage Detection Rule (20-Minute Rule)](#wastage-detection-rule-20-minute-rule)
18. [AI Assistant & Insights](#ai-assistant--insights)
19. [Troubleshooting](#troubleshooting)

---

## Project Overview

Educational institutions, laboratories, lecture halls, and commercial facilities frequently incur high energy overhead due to electrical equipment running in empty spaces. WattWise establishes direct room-level monitoring using ESP32 microcontrollers and calibrated sensors to make electrical demand visible and actionable in real time.

---

## Problem Statement

Classrooms and laboratories often have multiple high-draw loads (lighting banks, air conditioning units, projectors, workstations, and laboratory instrumentation) left active after occupants leave. Manual physical audits are intermittent, labor-intensive, and prone to oversight. Consequently, unoccupied energy wastage continues undetected for hours.

---

## Our Solution

WattWise provides an automated telemetry bridge and monitoring console:
- **Real-Time Electricity Monitoring**: Measures voltage (V), current (A), active power (W), and cumulative energy (kWh).
- **Occupancy Correlation**: Couples electrical load with PIR motion sensors.
- **Automated Wastage Detection**: Triggers administrative alerts when a room remains unoccupied with electricity flowing for more than 20 continuous minutes.
- **Empirical AI Insights**: Analyzes stored telemetry without fabricating synthetic measurements.
- **Floating AI Assistant**: A persistent, bottom-right energy intelligence assistant with live telemetry awareness.

---

## Hardware & IoT Architecture

```text
[ Non-Invasive CT Current Sensor ] ──┐
[ AC Voltage Transformer Sensor  ] ──┼──> [ ESP32 Microcontroller Node ] ──(Wi-Fi / HTTPS)──> [ WattWise Backend (Node/Express) ]
[ PIR Passive Infrared Motion    ] ──┘                                                                  │
                                                                                                        ▼
                                                                                               [ SQLite Database ]
                                                                                                        │
                                                                                                        ▼
                                                                                        [ React / Vite Console ]
                                                                                  (Dashboard / Alerts / AI Assistant)
```

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite 6, React Router 7, Recharts, Lucide React icons, Custom CSS with Circuit Grid matrix.
- **Backend**: Node.js 20+, Express 4, TypeScript, Helmet, CORS, Express Rate Limit, Zod validation, JWT, Bcrypt.js.
- **Database**: SQLite via `better-sqlite3` with Write-Ahead Logging (WAL) and foreign keys enabled.
- **Hardware Interfacing**: ESP32 REST JSON client with cryptographic `X-Device-Key` verification.

---

## Folder Structure

```text
wattwise/
├── backend/
│   ├── index.ts               # Express application, REST endpoints, and domain logic
│   ├── db.ts                  # Database module export
│   ├── migrate.ts             # Schema bootstrap script
│   ├── seed.ts                # Initial space and configuration seeder
│   └── src/
│       ├── db.ts              # SQLite database initialization and default settings
│       └── server.ts          # Server core
├── database/
│   └── schema.sql             # Relational SQLite database schema and indices
├── data/                      # Local SQLite database directory (wattwise.db)
├── frontend/
│   ├── index.html             # Vite entry point
│   └── src/
│       ├── App.tsx            # Main application shell, routing, pages, and components
│       ├── main.tsx           # React bootstrap
│       ├── styles.css         # Modern dark technical styling and animations
│       └── components/
│           └── AssistantAI.tsx# Floating AI Assistant with custom SVG logo
├── package.json
├── tsconfig.json              # Frontend TypeScript configuration
├── tsconfig.server.json       # Backend TypeScript configuration
├── vite.config.ts             # Vite build and proxy configuration
├── .env.example               # Environment template
└── README.md
```

---

## Prerequisites

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 10.0.0 or higher
- **Hardware (Optional for physical testing)**: ESP32 development board (NodeMCU-32S, ESP32-WROOM-32), SCT-013 current sensor, and HC-SR501 PIR sensor.

---

## Installation & Setup

1. Clone or extract the repository:
   ```bash
   git clone https://github.com/your-org/wattwise.git
   cd wattwise
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Initialize the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

---

## Environment Variables

Configure `.env` with your deployment parameters:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `4000` |
| `DATABASE_PATH` | Path to SQLite database file | `./data/wattwise.db` |
| `JWT_SECRET` | Secret key for signing session tokens | `(generate random string)` |
| `ADMIN_USERNAME` | Administrator login username | `Admin123` |
| `ADMIN_PASSWORD` | Administrator login password | `(set strong password)` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:5173` |
| `NODE_ENV` | Environment mode (`development`/`production`)| `development` |

---

## Database Setup & Migrations

The database automatically initializes on startup. To run migrations or seeding explicitly:

```bash
# Apply schema tables and indices
npm run db:migrate

# Seed default room and system settings
npm run db:seed
```

---

## Running in Development

Start both the backend API server and frontend Vite development server concurrently:

```bash
npm run dev
```

- **Frontend Console**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`

---

## Building & Running in Production

Compile TypeScript and build the production bundle:

```bash
# 1. Build server and client
npm run build

# 2. Start unified production server
npm start
```

In production mode, Express serves the compiled frontend directly from `dist/` on port 4000.

---

## ESP32 Hardware Provisioning Guide

1. Log into WattWise as an Administrator (`Admin123`).
2. Navigate to **Connect Hardware**.
3. **Step 1**: Enter the ESP32 Device ID (e.g. `ESP32-CSE-01`) and friendly name.
4. **Step 2**: Select the target room to monitor.
5. **Step 3**: Check the attached sensors (Electricity and PIR Occupancy).
6. **Step 4**: Click **Confirm & Connect Hardware**.
7. Copy the one-time cryptographic **`X-Device-Key`** displayed on the screen and flash it into the ESP32 firmware.

---

## Sensor Wiring & Configuration

### Recommended ESP32 Pinout

| Sensor | Function | ESP32 Pin | Interface |
| :--- | :--- | :--- | :--- |
| **SCT-013-000** | AC Current Transformer | `GPIO 34` (ADC1) | Analog with bias circuit |
| **ZMPT101B / PZEM** | AC Voltage Sensor | `GPIO 35` (ADC1) or `UART2` | Analog or Serial UART |
| **HC-SR501** | PIR Motion Detector | `GPIO 13` | Digital Input (Active HIGH) |
| **Status LED** | Wi-Fi / Telemetry Status | `GPIO 2` | Digital Output |

### ESP32 Ingestion Payload Format

Send HTTP `POST` requests to `http://<server-ip>:4000/api/esp32/data`:

**Headers:**
```text
Content-Type: application/json
X-Device-Key: <your-device-api-key>
```

**JSON Body:**
```json
{
  "deviceId": "ESP32-CSE-01",
  "roomId": "your-room-uuid",
  "timestamp": "2026-09-01T12:00:00.000Z",
  "electricity": {
    "voltage": 230.5,
    "current": 1.45,
    "power": 334.2,
    "energy": 0.42
  },
  "pir": {
    "motionDetected": false
  }
}
```

---

## API Reference

### Public Routes
- `GET /api/health` — System health and database connectivity check.
- `POST /api/auth/login` — Administrator authentication. Sets HTTP-only session cookie.
- `POST /api/auth/logout` — Clears session cookie.
- `POST /api/esp32/data` — Hardware telemetry ingestion (authenticated via `X-Device-Key`).

### Protected Administrator Routes (Session Cookie)
- `GET /api/auth/me` — Current authenticated administrator profile.
- `GET /api/dashboard` — Live rooms overview, total wattage, and unread alerts count.
- `GET /api/rooms` — List all configured rooms.
- `POST /api/rooms` — Create a new room (supports up to 10 rooms).
- `PUT /api/rooms/:id` — Rename or update room metadata.
- `DELETE /api/rooms/:id` — Remove a room.
- `GET /api/rooms/:id/latest` — Get real-time telemetry for a specific room.
- `GET /api/sensors` — List registered sensors and room mappings.
- `POST /api/sensors` — Register a new sensor.
- `POST /api/sensors/:id/connect` — Attach a sensor to a room.
- `POST /api/sensors/:id/disconnect` — Unlink a sensor from a room.
- `GET /api/devices` — List registered ESP32 nodes and connection statuses.
- `POST /api/devices` — Provision a new ESP32 device and generate API key.
- `POST /api/devices/:id/assign` — Assign a device to a room.
- `POST /api/devices/:id/disconnect` — Unassign a device.
- `GET /api/alerts` — Fetch wastage alarms and system notifications.
- `POST /api/alerts/:id/acknowledge` — Acknowledge an alert.
- `GET /api/analytics` — Fetch empirical energy, power curves, and occupancy history.
- `GET /api/ai/insights` — Generate AI insights from verified database records.
- `GET /api/settings` — Get active thresholds.
- `PUT /api/settings` — Update current threshold, alert duration, and freshness timeout.

---

## Security & Authentication

- **Session Security**: Session tokens are signed using JWT with SHA-256 and transmitted via HTTP-only `SameSite=Lax` cookies.
- **Hardware Security**: Device API keys are 256-bit cryptographically secure random values hashed with `bcrypt` before storage. The plaintext key is shown only once upon creation.
- **Input Validation**: All REST payloads are validated with strict `zod` schemas.
- **Network Protection**: Protected by `helmet` security headers, CORS origin restrictions, and rate limiting.

---

## Wastage Detection Rule (20-Minute Rule)

WattWise evaluates electricity wastage deterministically:

$$\text{Wastage Alert Triggered} \iff (\text{PIR Motion} = 0) \land (\text{Current} > \text{Threshold}) \land (\text{Duration} \ge 20 \text{ min})$$

1. **Unoccupied State**: PIR sensor reports no motion.
2. **Active Electrical Draw**: Measured current exceeds the threshold (default: `0.10 A`).
3. **Continuous Window**: The condition persists continuously for at least 20 minutes.
4. **De-duplication**: Only one persistent alert is created per continuous incident.
5. **Auto-Resolution**: If occupants enter (motion detected) or current falls below threshold, the wastage state is cleared.

---

## AI Assistant & Insights

- **Floating AI Assistant**: Accessible globally from the bottom-right corner without cluttering main navigation. Features custom SVG energy intelligence branding.
- **Zero Fake Data Policy**: When asked "What is the current power?", the assistant checks real telemetry. If no hardware is connected, it accurately reports `0.0 W (Waiting for hardware)`.
- **Domain Intelligence**: Answers questions about WattWise architecture, hardware wiring, wastage rules, sensors, analytics, and settings.

---

## Troubleshooting

### 1. Room Shows "Offline / Waiting"
- Verify that the ESP32 is powered on and connected to Wi-Fi.
- Confirm the `X-Device-Key` matches the key generated during provisioning.
- Verify that the sensor freshness window (`settings.sensorFreshnessSeconds`, default 90s) has not elapsed.

### 2. Login Returns 401 Unauthorized
- Ensure `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` match your login credentials.
- Verify `JWT_SECRET` is set in `.env`.

### 3. Port Already in Use (4000 / 5173)
- Adjust `PORT` in `.env` or run with custom port: `PORT=4001 npm start`.

---

## License

Proprietary · WattWise Energy Systems