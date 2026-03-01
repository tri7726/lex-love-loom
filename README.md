# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the
[Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and
start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push
changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed -
[install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once
  you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Lovable (Recommended)

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and
click on Share -> Publish.

### Vercel (Manual/Automated)

This project is optimized for deployment on [Vercel](https://vercel.com/):

1. Import your GitHub repository into Vercel.
2. The build command (`npm run build`) and output directory (`dist`) will be
   automatically detected.
3. Configure your Environment Variables (from your local `.env` or Supabase
   project settings).

## CI/CD Pipeline

We have implemented a GitHub Actions pipeline to ensure code quality:

1. **CI Pipeline** (`.github/workflows/ci.yml`): Runs on every push/PR to
   `main`.
   - Linting with ESLint.
   - Type-checking with TypeScript.
   - Unit tests with Vitest.
   - Production build verification.
2. **Supabase Deployment** (`.github/workflows/supabase-deploy.yml`):
   - Automatically deploys Supabase Edge Functions when files in
     `supabase/functions/` are modified.
   - Requires `SUPABASE_ACCESS_TOKEN` secret in GitHub.

## Custom Domain

To connect a domain, navigate to Project > Settings > Domains and click Connect
Domain.
[Read more here](https://docs.lovable.dev/features/custom-domain#custom-domain)
