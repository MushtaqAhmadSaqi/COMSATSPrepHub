# Contributing to COMSATSPrepHub

Thank you for helping COMSATS students prepare smarter!

## Development Workflow
1. Clone the repository and run `npm install`.
2. Copy `.env.example` to `.env` (Guest Mode works out-of-the-box without keys).
3. Start the dev server with `npm run dev`.
4. Before opening a Pull Request, ensure all checks pass:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
