<div align="center">
  <img src="https://raw.githubusercontent.com/sasiruliyanage2004/WFH-Tracking/main/desktop-agent/win-icon.ico" alt="Logo" width="80" height="80">

  <h1 align="center">WorkforceOS - WFH Tracking System</h1>

  <p align="center">
    A comprehensive, modular, and privacy-conscious Work From Home (WFH) monitoring and management solution.
    <br />
    <a href="#features"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="#installation">View Demo</a>
    ·
    <a href="https://github.com/sasiruliyanage2004/WFH-Tracking/issues">Report Bug</a>
    ·
    <a href="https://github.com/sasiruliyanage2004/WFH-Tracking/issues">Request Feature</a>
  </p>
</div>

---

## 📖 About The Project

**WorkforceOS** is an all-in-one suite designed to seamlessly manage remote employees. Built with modern web technologies, it provides employers with rich analytics while ensuring employees have a transparent and intuitive interface to manage their tasks and time.

The system is designed as a **Monorepo** consisting of three core modules:
1. **Desktop Agent**: A lightweight Electron application installed on the employee's machine. It handles time tracking, smart idle detection, and verification (webcam/screenshots) while strictly preserving user privacy and offline capabilities.
2. **Frontend Dashboard**: A responsive web portal for both employees and administrators to view live statistics, manage tasks, and oversee team productivity.
3. **Backend API**: A robust Node.js backend acting as the central nervous system, interfacing with the frontend, the desktop agents, and the Supabase database.

### 🚀 Built With

* [![React][React.js]][React-url]
* [![Electron][Electron.js]][Electron-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Node.js][Node.js]][Node-url]
* [![Express.js][Express.js]][Express-url]
* [![Supabase][Supabase]][Supabase-url]

---

## ✨ Key Features

* **Intelligent Time Tracking**: Accurately tracks active work hours versus idle time.
* **Smart Idle Breaks**: Automatically shifts into a break state after prolonged inactivity to ensure fair time logging.
* **Offline Caching**: The desktop agent caches tracking data locally if the internet connection drops, and syncs automatically when reconnected.
* **Verification & Security**: Optional, randomized webcam and screenshot captures for remote verification.
* **Task Management**: Employees can easily log their current active tasks, keeping managers informed of daily objectives.
* **Modular & Scalable**: Cleanly architected backend controllers and frontend hooks ensure the codebase remains maintainable.
* **Premium Installer**: Easy one-click setup executable (`WFH-Agent.exe`) built using `electron-builder` with custom branding.

---

## 📁 Repository Structure

```text
WFH-Tracking/
├── backend/               # Node.js + Express API
│   ├── src/controllers/   # Business logic
│   └── src/interfaces/    # API Routes
├── desktop-agent/         # Electron Application
│   ├── src/               # Main process (WindowManager, IdleDetector, etc.)
│   └── build/             # Installer assets and branding
└── frontend/              # React Web Portal
    ├── src/components/    # Reusable UI (Modals, StatCards)
    ├── src/hooks/         # Custom React hooks (e.g., useEmployeeDashboard)
    └── src/pages/         # Layout and main views
```

---

## 🛠️ Installation & Local Development

To get a local copy up and running, follow these simple steps.

### Prerequisites
* npm & Node.js (v18+ recommended)
* A [Supabase](https://supabase.com/) project for the database.

### 1. Backend Setup
```sh
cd backend
npm install
# Set up your .env file with your database credentials
npm run dev
```

### 2. Frontend Setup
```sh
cd frontend
npm install
npm run start
```

### 3. Desktop Agent Setup
```sh
cd desktop-agent
npm install
npm run start
```
*To build the production Windows installer:*
```sh
npm run build
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Built with ❤️ by Sasiru Liyanage</p>
</div>

<!-- Markdown Links & Images -->
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Electron.js]: https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white
[Electron-url]: https://www.electronjs.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[Express.js]: https://img.shields.io/badge/Express.js-404D59?style=for-the-badge
[Express-url]: https://expressjs.com/
[Supabase]: https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
