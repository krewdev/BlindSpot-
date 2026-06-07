# BlindSpot (Phantom Duel) — PvP Data Annotation & Crypto Payout Arena

BlindSpot is a next-generation, gamified Web3 AI data annotation platform and competitive arena. Players compete in various head-to-head duels to annotate visual and textual data, verify consensus, audit safety prompts, and even run security pen-testing CTFs. 

Every action logs high-fidelity human telemetry that is directly piped to fine-tune state-of-the-art AI models. In return, players earn `BLND` tokens and commit cryptographic Proof-of-Labels (PoL) to the Solana blockchain.

---

## 🎮 Game Modes

1. **👁️ Vision Hunt (Computer Vision)**
   * Detect objects in images that current AI models missed (e.g., pedestrians, vehicles).
   * Highlights model blindspots.
   * Prompts real-time CSS/canvas coordinates drawing.

2. **⚖️ The Judge (RLHF Preference Alignment)**
   * Side-by-side model response comparison (coding, logic, safety, creativity).
   * Upvotes the best output with descriptive reasoning.
   * Directly drives RLHF (Reinforcement Learning from Human Feedback) tuning.

3. **💬 Caption Clash (Image-Text Alignment)**
   * Human-annotated bounding boxes from *Vision Hunt* are cropped.
   * Competitors write highly specific captions describing the crop to reach text consensus.
   * Trains multi-modal vision-language models.

4. **🕵️ Bug Bounty / Cyber Siege (Security Agent Telemetry)**
   * Real-time interactive terminal shell CTF.
   * Compete head-to-head to locate API vulnerabilities, execute exploits, and read flag keys.
   * Logs sequence logs and command telemetry to train AI security agents to patch vulnerabilities.

---

## 🛠️ Tech Stack & Architecture

* **Frontend**: React 19, Next.js 16 (Turbopack), TailwindCSS
* **State Management**: Zustand
* **Icons & UI**: Lucide-react, Glassmorphic gradients, CSS micro-animations
* **Data Layer**: Supabase (with Sandbox / local-offline fallback mode)
* **Web3 Integration**: Solana Proof-of-Label cryptographic on-chain verification mock

---

## 🚀 Getting Started

### Prerequisites

* Node.js v18+
* npm, yarn, or pnpm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the arena in your browser.

### Testing & Linting

* Run unit tests (Vitest):
  ```bash
  npm run test
  ```
* Run linter:
  ```bash
  npm run lint
  ```
* Run production build check:
  ```bash
  npm run build
  ```
