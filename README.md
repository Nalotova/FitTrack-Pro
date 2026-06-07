# FitTrack Pro: Agentic AI Fitness Coach

## 🎯 Overview
FitTrack Pro is not a generic public SaaS fitness tracker. It is a highly personalized, autonomous **Agentic AI system** designed to act as an elite biomechanics and strength programming coach. Built with React, Firebase, and the Gemini API, the system creates a closed-loop feedback cycle: it absorbs user biometric and training data, analyzes progress in real-time, and autonomously updates the underlying training program and biomechanical cues through structured function calling.

## 🧠 Core Architecture: The Agentic Workflow
The true power of this system lies in its agentic nature. Rather than just acting as a conversational chatbot, the Gemini AI operates as a stateful controller with direct access to the user's database.

1. **Input & Contextualization:** The application state (Firebase Firestore) continuously aggregates the user's workout logs, strength records (1RMs, volume thresholds), body measurements, and technical execution notes.
2. **Analysis:** When the user interacts with the AI Coach, the system serializes up to the last 50 workouts, 30 measurements, and 50 strength records into a dense JSON payload, which is injected directly into the LLM's system prompt context. 
3. **Execution (Function Calling):** Based on the deep analysis of this data, the AI determines if intervention is required. Through structured tool calling, the agent can autonomously:
   - `update_program`: Mutate the JSON schema of the user's current training macrocycle (adjusting sets, reps, RPE, or prescribing new exercises based on periodization).
   - `update_technique`: Update the individual biomechanical focus points and cues for specific exercises in the user's knowledge base.
   - `update_profile`: Modify broad user goals (e.g., smoothly transitioning from 'hypertrophy' to 'strength' blocks).
   - `save_measurement`: Log new biometrics inferred from conversation or parsed from uploaded progress images.
4. **Feedback Loop:** The UI executes these structural mutations against the Firestore database and feeds the confirmation matrix back to the agent without breaking the conversation flow.

## 🛠️ Tech Stack
* **Frontend:** React, TypeScript, Tailwind CSS, Vite, Framer Motion
* **Backend & State:** Firebase Auth, Cloud Firestore (with strict schema-validating Security Rules), Firebase Storage
* **Agent Intelligence:** Google Gemini API (`@google/genai`), utilizing `gemini-2.5-pro` for deep reasoning, multi-modal analysis (audio/vision), and structured JSON output.
* **Component Library:** Headless UI patterns implemented with Tailwind.

## ⚙️ Technical Overview & Agent Logic

The local application state is synchronized with Firestore via active real-time listeners (`onSnapshot`). 

### The Gemini Integration & Prompt Engineering
When the user sends a message (or audio clip, or image), the front-end constructs an expansive context window. The agent logic works by prepending a strict system instruction detailing its persona (an elite Russian-speaking biomechanics coach) and injecting the exact user state:

```typescript
const dataContext = `
  ПЕРЕМЕННЫЕ ПОЛЬЗОВАТЕЛЯ (ДЛЯ АНАЛИЗА):
  - ПРОФИЛЬ: ${JSON.stringify(userProfile)}
  - ТРЕНИРОВКИ: ${JSON.stringify(workouts.slice(0, 50))}
  - ЗАМЕРЫ: ${JSON.stringify(measurements.slice(0, 30))}
  - СИЛОВЫЕ РЕКОРДЫ: ${JSON.stringify(strengthRecords.slice(0, 50))}
  - ТЕКУЩАЯ ПРОГРАММА: ${JSON.stringify(programData)}
  - ТЕХНИКА ВЫПОЛНЕНИЯ: ${JSON.stringify(techData)}
`;
```

The model is equipped with a `tools` array containing OpenAPI-style schemas for database mutations. If the model determines that a user's bench press is stalling (based on the `strengthRecords` JSON), it will formulate a response explaining the plateau, and simultaneously emit a function call to `update_program` to increase volume or swap in an accessory lift.

The React client listens for `functionCall` parts in the Gemini response, parses the structured JSON arguments, validates them, commits the transaction to Firestore, and appends a `functionResponse` back to the conversation history. This allows the AI to "know" that its prescribed changes were successfully saved to the user's database.

## 🚀 Quick Start (Development)

To run this project locally, you need a configured Firebase project and a Gemini API key.

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd fittrack-pro
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env.example` file in the root directory and configure accordingly:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_workspace.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```
4. **Deploy Firestore Rules:**
   Ensure database security by deploying the highly strict rules defined in `firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. **Run the Development Server:**
   ```bash
   npm run dev
   ```

## 🔐 Security & Data Privacy
Since this is a deeply personalized agent handling sensitive biometric data, security is foundational. The system implements a robust set of Firestore Security Rules, completely locking down read and write operations. Every collection (`workouts`, `measurements`, `strength`, `programs`, `tech`, `users`) restricts access strictly to the authenticated `request.auth.uid`. Furthermore, complex schema validations (e.g., `isValidWorkoutUpdate`) are performed at the database level to ensure that even if the AI hallucinates, it cannot corrupt the database schema.

## 📜 License
Private proprietary software.
