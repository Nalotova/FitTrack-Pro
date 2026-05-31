# FitTrack Pro

An AI-powered fitness tracking app with an embedded coaching agent that can analyze progress, adapt training programs, update exercise technique guidance, and record body measurements directly inside the application.

FitTrack Pro is more than a workout diary. It combines workout logging, body composition tracking, strength analytics, Firebase persistence, and a Gemini-powered assistant that works with the user's real training context.

## Project Highlights

- AI fitness coach embedded inside the product, not just a chatbot
- Agent-style actions: update workout programs, create technique cards, and save measurements
- Workout, strength, weight, and body composition tracking in one interface
- Firebase authentication, Firestore realtime data, and Storage integration
- Progress dashboards with charts and workout history
- PWA-oriented mobile experience with theme support
- Multimodal coach input: text, images/files, and voice messages

## Core Idea

Most fitness apps only store what the user enters. FitTrack Pro adds an AI layer that can reason over the user's profile, workout history, strength records, body measurements, and uploaded media.

The coach can then respond with advice or perform structured actions inside the app, such as replacing the training program or adding new body measurement records.

## Key Features

### Workout Tracking

- Daily workout view with configurable training days
- Exercise sets, reps, weights, RPE, notes, cardio, and bodyweight/static exercise support
- Workout completion flow that saves history and moves the user to the next training day
- Automatic strength record extraction from completed workouts
- Current workout state persistence so the user can continue later

### AI Coach Agent

The coach uses Google Gemini and receives structured context from the app:

- User profile and goal type
- Current training program
- Workout history
- Strength records
- Body measurements and progress data
- Technique reference cards
- Uploaded photos, screenshots, documents, or audio messages

The agent can call internal app tools to:

- `update_training_program` - replace the user's training plan with a structured program
- `update_tech_data` - create or update exercise technique guidance
- `add_bioimpedance_measurement` - save body composition and measurement data

This turns the assistant from a passive chat into an action-capable product feature.

### Progress Analytics

- Weight and body composition tracking
- Strength records and exercise progress
- Training volume, reps, and workout history
- Charts powered by Recharts
- Goal-aware progress context for the coach

### Technique Library

- Exercise technique cards with movement cues
- AI-generated technique guidance after program creation
- Manual editing support for technique content

### Authentication and Persistence

- Google sign-in via Firebase Auth
- Firestore collections for workouts, measurements, strength records, program data, coach messages, and technique cards
- Firebase Storage support for uploaded media
- Offline/online state awareness and Firestore error handling

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Styling and UI | Tailwind CSS, Motion, Lucide React |
| AI | Google Gemini API via `@google/genai` |
| Auth and Data | Firebase Auth, Firestore, Firebase Storage |
| Charts | Recharts |
| Dates | date-fns |
| Markdown | react-markdown |
| App Experience | PWA manifest, responsive/mobile-first UI, dark/light theme |

## Architecture

```text
React / Vite App
  |
  |-- Workout UI
  |-- Progress dashboards
  |-- Strength and body measurement tracking
  |-- Technique library
  |-- AI Coach chat
        |
        | sends structured context + user message + media
        v
Google Gemini
  |
  |-- text response
  |-- function calls for app actions
        |
        |-- update_training_program
        |-- update_tech_data
        |-- add_bioimpedance_measurement
        v
Firebase
  |
  |-- Auth: Google login
  |-- Firestore: user data, workouts, measurements, messages
  |-- Storage: uploaded media
```

## What I Built

- Designed a fitness app around real user workflows: training today, tracking progress, reviewing history, and adjusting goals
- Implemented workout logging with different exercise types: strength, cardio, bodyweight, and static holds
- Built a Gemini-powered coach that can use app context and trigger structured updates inside the product
- Integrated Firebase Auth, Firestore realtime listeners, and Storage-based media handling
- Created progress views for body metrics, workout history, strength records, and charts
- Added persistent coach messages, current workout state, theme settings, and PWA metadata
- Implemented program and technique editors so AI-generated content remains editable by the user

## Why This Project Matters

FitTrack Pro demonstrates product engineering around an AI agent that is connected to application state. The AI feature is not isolated from the product: it reads the user's data, reasons about goals and progress, and can modify the app's structured records.

For recruiters, this project shows experience with:

- Building a large React/TypeScript single-page application
- Designing an AI-assisted user workflow with tool/function calling
- Integrating Firebase authentication and realtime persistence
- Modeling structured fitness data and progress analytics
- Handling user-generated media and multimodal AI inputs
- Turning AI output into editable, persistent product state

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Auth, Firestore, and Storage configured
- Google Gemini API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEY_2=optional_backup_key
```

Firebase configuration is loaded from `firebase-applet-config.json`.

### Run Locally

```bash
npm run dev
```

The app runs on port `3000` by default.

### Build

```bash
npm run build
```

### Type Check

```bash
npm run lint
```

## Data Model Overview

The app works with several core entities:

- `UserProfile` - user identity, role, age, gender, goals, reminders
- `Workout` - completed workout sessions with exercises, sets, cardio data, notes, and volume
- `StrengthRecord` - best sets and strength progress per exercise
- `WeightMeasurement` - body weight, body composition, measurements, BMI, photos, and related metrics
- `TechItem` - technique guidance cards for exercises
- Coach messages - persistent AI conversation history with optional media attachments

## Privacy and Safety Notes

This app handles personal health and body data. A production version should use strict Firestore security rules, clear consent language, secure media retention policies, and careful handling of AI-generated fitness recommendations.

The AI coach should be treated as a supportive training assistant, not as medical advice or a replacement for a certified fitness or healthcare professional.

## Roadmap

- Add a public demo mode with sample data
- Add screenshots and a short product walkthrough to this README
- Move AI requests through a backend proxy for stronger API key protection
- Add automated tests for core workout and agent flows
- Add clearer Firebase setup documentation
- Add export/import flows for user fitness history
- Improve safety checks for injury, recovery, and overtraining signals

## License

This project contains an Apache-2.0 SPDX header in the source files.