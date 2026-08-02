# ISP Multi-Account Connection Status Checker

A production-quality full-stack Network Operations Center (NOC) dashboard built with React, Node.js, Express, and Axios/Cheerio for automated ISP account status monitoring on Kurigram ISP Portal.

---

## Features

- **Automated ISP Account Login & Verification**: Automatically authenticates into user accounts at `https://user.kurigramisp.com/customer/login`, parses HTML for connection status badges (`ONLINE` / `OFFLINE`), and records response latencies.
- **Worker Queue & Concurrency Controls**: Supports 1, 3, 5, or 10 concurrent account check workers without crashing or overloading system memory.
- **Multiple Import Formats**: Supports CSV upload, TXT files, and manual multi-account pasting (Format: `username, password` or `username: password`).
- **NOC Analytics Dashboard**: Real-time status cards (Total, Online, Offline, Failed, Current Queue, Last Scan Time) with progress bars and live estimated time remaining.
- **Automated Scan Scheduling**: Periodic auto-rescan options (5 min, 10 min, 15 min, 30 min, 60 min).
- **Data Export & Audit Logs**: Export status reports to CSV or JSON formats and inspect comprehensive system execution logs.

---

## Environment Setup (.env)

Create or update `.env` file at root:

```env
PORT=3000
HEADLESS=true
CONCURRENT_BROWSERS=5
LOGIN_URL="https://user.kurigramisp.com/customer/login"
```

---

## How to Run locally

### Backend & Frontend Combined Dev Mode

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Production Build & Start

```bash
npm run build
npm start
```
