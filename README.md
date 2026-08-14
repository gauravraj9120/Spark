# 💖 Spark - Premium Dating Web Application

**Spark** is a high-fidelity, single-page dating web application (SPA) designed with premium dark aesthetics, glassmorphism UI layouts, and a real-time client-server architecture. It supports a dual hybrid engine: running on a Python backend with real-time WebSockets, or running completely client-side in offline simulation mode.

---

## 🌟 Key Features

### 1. Swiping Gesture Engine
* **Smooth Draggables**: Drag profile cards left (Nope), right (Like), or up (Super Like) using mouse drag or mobile touch inputs.
* **Swipe Controls**: Action buttons under the deck for clicking to swipe, and an **Undo** action button to revert cards and matched profiles dynamically.
* **Match Celebrations**: Immersive full-screen overlay with custom animated confetti bursts on simulated match triggers.

### 2. Real-Time Chat & Bot Simulator
* **WebSockets Integration**: Bi-directional message relay with the Python server for instant transmission.
* **Typing Indicator**: Real-time server-side typing status updates (`showTypingIndicator`) before bot replies.
* **Offline Backup**: Seamless Local Storage fallback when running offline.

### 3. Simulated Video & Voice Calls
* **Web Audio Ringback Synthesis**: Generates realistic US ringtones (440Hz + 480Hz dual oscillator pulses) via the browser Web Audio API, removing external assets.
* **Local Webcam PiP**: Mirrors local webcam input directly into a picture-in-picture stream overlay, with checkmark avatar fallbacks if denied or absent.
* **Subtitles**: Captions dialogue timeline synchronized for bot matches (Sophia, Marcus, Elena, Alex, Chloe, Liam).
* **Call Logging**: Automatically logs call durations to the chat conversation history when a call closes.

### 4. Custom Themes & Preferences
* **Theme Swapper**: Select from custom accents (Pink Spark, Royal Purple, Ocean Blue) inside settings.
* **Preference Sliders**: Adjust age constraints and distance filters dynamically.

---

## 🛠️ Technology Stack

* **Frontend**: Vanilla HTML5, CSS3 (variables, transitions, keyframe animations), JavaScript ES6. Loaded with Google Fonts (Outfit) and FontAwesome CDN icons.
* **Backend**: Python 3.14+, FastAPI, Uvicorn, WebSockets.
* **Database**: JSON file persistence (`database.json`) automatically seeded with mock profiles.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have **Python 3.x** installed. Install the server dependencies:
```bash
pip install fastapi uvicorn
```

### Launching the Backend Server (Online Mode)
Start the Uvicorn server on port 8000:
* **PowerShell**: Run `./run_backend.ps1` (or double-click the file).
* **Manual Command**:
  ```bash
  python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
  ```
Once running, open your browser and navigate to: **[http://localhost:8000/](http://localhost:8000/)**

### Running Offline (Offline Mode)
To run the app as a pure client-side mockup:
* Double-click [index.html](file:///d:/Projects_store/index.html) to open it in your browser directly. All state will save to browser `localStorage`.

### Android Project (Android Studio)
To build and install the native Android wrapper:
1. Open **Android Studio** and click **Open an Existing Project**.
2. Select the `spark-android` directory.
3. Once Gradle syncs, run the app on an Emulator or a connected hardware device. It maps local sync loops automatically via IP `http://10.0.2.2:8000/`.

### Desktop App (Electron)
To run the desktop application wrapper:
1. Make sure you have **Node.js** installed, then open your terminal inside the desktop directory:
   ```bash
   cd spark-desktop
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the desktop application:
   ```bash
   npm start
   ```
   This boots the Spark dating app in a mobile-framed standalone window that auto-grants camera inputs.

