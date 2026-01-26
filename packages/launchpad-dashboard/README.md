# 🚀 Launchpad Dashboard

> Gravito Ground Station - Real-time mission control and telemetry dashboard.

**Launchpad Dashboard** (@gravito/launchpad-dashboard) is a high-tech, industrial-grade monitoring interface designed for Gravito's telemetry data. It provides a real-time, "Mission Control" style view of your distributed systems, services, and modules.

## ✨ Features

- **📡 Real-time Telemetry**: Secure uplink stream visualization for active modules and services.
- **🖥️ Mission Control UI**: A highly immersive, CRT-inspired interface with scanlines and industrial data readouts.
- **📊 Resource Monitoring**: Live tracking of CPU usage (Propulsion), memory allocation (Payload), and system latency.
- **📟 Terminal Log Stream**: Integrated terminal for each module showing live execution logs with CRT effects.
- **🔗 Global Command Log**: A centralized terminal at the bottom for global system events and assignments.
- **⚡ Performance Oriented**: Built with React 19 and Vite for lightning-fast HMR and minimal overhead.

## 📦 Installation

```bash
# In the launchpad-dashboard package directory
bun install
```

## 🚀 Usage

### Development

To start the dashboard in development mode with Hot Module Replacement (HMR):

```bash
bun run dev
```

### Build

To create an optimized production build:

```bash
bun run build
```

## 🛠️ Technical Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Typography**: Space Mono & Inter (Industrial aesthetic)

## 🏗️ Architecture

- **`src/App.tsx`**: The main dashboard layout including Houston header, mission grid, and global terminal.
- **`src/hooks/useTelemetry.ts`**: Handles the logic for receiving and processing live telemetry data.
- **`src/utils.ts`**: Styling utilities and tailwind-merge configuration.

## 🛡️ Telemetry Security

Launchpad Dashboard uses a secure uplink status indicator to ensure that you are always viewing verified data from your Ground Station.

## 📝 License

MIT © Carl Lee
