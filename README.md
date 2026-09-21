<div align="center">

<img src="./public/logo.png" alt="COMSATSPrepHub logo" width="120" />

# COMSATSPrepHub

### Prepare smarter. Practice better. Score higher.

<p>
  A focused exam-preparation workspace for COMSATS University students.
  Find past papers, practise with quizzes, generate AI-powered tests, and
  keep your academic progress in one place.
</p>

<p>
  <a href="https://comsatsprephub.vercel.app">Live demo</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/MushtaqAhmadSaqi/Full-front-end/issues">Report an issue</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/MushtaqAhmadSaqi/Full-front-end">View source</a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=20232A" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3" />
  <img src="https://img.shields.io/badge/License-Educational-1E3A8A?style=for-the-badge" alt="Educational use" />
</p>

</div>

<p align="center">
  <img src="./public/readme-study-loop.svg" alt="Animated COMSATSPrepHub study loop" width="900" />
</p>

## At a glance

| 📚 Past papers | 🧠 Practice quizzes | ✨ AI quiz generator | 🧮 GPA calculator |
|:---:|:---:|:---:|:---:|
| Browse by subject | Revise key topics | Build custom tests | Calculate SGPA and CGPA |

## Why COMSATSPrepHub?

Exam preparation should not mean searching through scattered files and old
messages. COMSATSPrepHub brings the most useful study tools into a
mobile-friendly workspace that is quick to navigate and easy to return to.

## ✨ Features

- **Past paper library** — Browse papers by subject and open detailed paper views.
- **Practice quizzes** — Test your knowledge with topic-based revision quizzes.
- **AI quiz generation** — Generate personalised COMSATS-style quizzes.
- **GPA calculator** — Calculate semester GPA and cumulative GPA using COMSATS grading rules.
- **Student dashboard** — Keep useful study information and progress in one place.
- **Authentication** — Sign in with Supabase for account-based features.
- **Dark mode** — Study comfortably in light or dark themes.
- **Responsive design** — Works across desktop, tablet, and mobile screens.
- **Command palette** — Jump between pages with `Ctrl + K` or `Cmd + K`.

## 🧭 Typical study flow

```mermaid
flowchart LR
    A[Choose a subject] --> B[Browse past papers]
    B --> C[Review important topics]
    C --> D[Practice with a quiz]
    D --> E[Track your progress]
    C --> F[Generate an AI quiz]
    F --> D
    E --> G[Calculate GPA]
```

## 🛠️ Built with

| Technology | Role |
|---|---|
| [React](https://react.dev/) | Component-based user interface |
| [Vite](https://vitejs.dev/) | Development server and production builds |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [Framer Motion](https://motion.dev/) | UI animations and transitions |
| [Supabase](https://supabase.com/) | Authentication and cloud data services |
| Gemini / Groq / OpenRouter | AI-powered quiz generation |

## 📁 Project structure

```text
.
├── api/                  # Serverless API routes
├── legacy/              # Older app code and legacy assets
├── public/              # Logos, icons, and README media
├── src/
│   ├── components/      # Reusable UI components
│   ├── constants/       # Shared application constants
│   ├── pages/           # Page-level React components
│   ├── services/        # Supabase and AI integrations
│   ├── utils/           # Shared helpers
│   ├── App.jsx          # Root layout and client-side navigation
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── .env.example         # Environment variable template
├── package.json          # Scripts and dependencies
├── tailwind.config.cjs   # Tailwind configuration
├── vite.config.js        # Vite configuration
└── README.md             # Project documentation
```

## 🚀 Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm
- Supabase credentials for authentication features
- An AI provider key for AI quiz generation

### 1. Clone and install

```bash
git clone https://github.com/MushtaqAhmadSaqi/Full-front-end.git
cd Full-front-end
npm install
```

### 2. Configure environment variables

Create a local `.env` file from the template:

```bash
copy .env.example .env
```

Then add the credentials for the services you want to use:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

> **Keep secrets server-side.** Never commit `.env` or expose server-side API
> keys in browser code. `.env.example` contains placeholders only.

### 3. Start developing

```bash
npm run dev
```

Open the local URL shown in the terminal, usually
[`http://localhost:5173`](http://localhost:5173).

## 📜 Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run the GPA logic test |
| `npm run analyze` | Build in analyze mode |
| `npm run build:css` | Build Tailwind CSS for legacy assets |
| `npm run watch:css` | Watch and rebuild legacy Tailwind CSS |

## 🌐 Deployment

The project is ready for Vercel-style deployment:

1. Import the repository into Vercel.
2. Add the required environment variables in project settings.
3. Deploy the `main` branch.
4. Verify authentication and AI quiz generation in the deployed environment.

Try the hosted app at
[comsatsprephub.vercel.app](https://comsatsprephub.vercel.app).

## 🤝 Contributing

Contributions and suggestions are welcome. Before opening a pull request:

1. Create a focused branch for your change.
2. Run `npm run build`.
3. Run `npm run test`.
4. Include a clear description and screenshots for UI changes.

## 📌 Notes

- The project contains modern React code and legacy assets under `legacy/`.
- Authentication and saved student data depend on Supabase configuration.
- AI quiz generation depends on the configured provider and available API keys.
- Past papers are provided for educational revision and self-assessment.

## 📄 License

This project is intended for educational use by COMSATS students. Review the
repository and individual source files for any additional usage or licensing
requirements.

<div align="center">

Made for COMSATS students 💙

</div>
