# COMSATSPrepHub

COMSATSPrepHub is a student-focused exam preparation platform for COMSATS University students. It brings together past papers, topic-based quizzes, AI-generated quiz support, GPA tracking, and a cleaner study workflow in one frontend app.

## Features

- Verified past paper browsing by subject
- Subject-based paper navigation and paper detail view
- Quiz system for practice and revision
- AI quiz generation using Gemini/OpenRouter/Groq-style integrations
- GPA calculator with CGPA/SGPA support
- User authentication via Supabase
- Dashboard and progress tracking
- Responsive UI with dark mode and mobile-friendly layout
- Command palette and app-style navigation

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Supabase
- Gemini / AI quiz support

## Project Structure

```text
.
├── api/                  # Backend/API-related code or route support
├── legacy/              # Older app code and assets
├── public/              # Static public files
├── src/                 # Main React frontend source
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page-level React components
│   ├── services/        # API and external service clients
│   ├── utils/           # Helper functions and utilities
│   ├── App.jsx          # Root app layout and routing
│   ├── main.jsx         # App bootstrap
│   └── index.css        # Global styles
├── .env.example         # Example environment variables
├── index.html           # Vite HTML entry
├── package.json         # Scripts and dependencies
├── tailwind.config.cjs  # Tailwind config
├── vite.config.js       # Vite config
├── llms.txt             # LLM-oriented project summary
└── README.md            # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Environment variables

Copy the example environment file and update it with your real credentials:

```bash
copy .env.example .env
```

Then set values such as:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- optional AI keys depending on your quiz generation setup

## Available Scripts

```bash
npm run dev
```
Runs the app in development mode with Vite.

```bash
npm run build
```
Builds the production version of the frontend.

```bash
npm run preview
```
Serves the production build locally.

```bash
npm run test
```
Runs the project test script.

```bash
npm run build:css
```
Builds Tailwind CSS for the legacy frontend assets.

```bash
npm run watch:css
```
Watches and rebuilds Tailwind CSS during development.

## Running the app locally

```bash
npm run dev
```

Then open the local URL shown in the terminal, typically:

```text
http://localhost:5173
```

## Notes

- This repository mixes modern React frontend code with legacy assets under the `legacy/` directory.
- Some features, like authentication and saved student data, rely on Supabase configuration.
- AI quiz generation may require API keys configured in the environment.

## Deployment

This project is designed to work well with Vercel-style static/frontend deployment. Configure environment variables in your hosting platform before deployment.

## License

This project is for educational use and is intended for COMSATS students. Check the repository and individual source files for any additional licensing or usage policies.
