# Vercel Deployment Guide

This guide will help you deploy the application to Vercel.

## Prerequisites

1. GitHub, GitLab, or Bitbucket account
2. Vercel account (sign up at [vercel.com](https://vercel.com))
3. Node.js 18+ installed locally

## Deployment Steps

### 1. Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Set Up Environment Variables

1. Create a new file called `.env.local` in the project root
2. Copy the contents from `.env.local.example` to `.env.local`
3. Replace `your_api_key_here` with your actual Strike API key

```env
NEXT_PUBLIC_API_BASE_URL=https://api-prod-v21.strike.money/v2/api
STRIKE_API_KEY=your_actual_api_key_here
```

### 3. Deploy to Vercel

#### Option A: Deploy with Vercel CLI (Recommended)

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Login to your Vercel account:
   ```bash
   vercel login
   ```

3. In your project directory, run:
   ```bash
   vercel
   ```

4. Follow the prompts to complete the deployment.

#### Option B: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import your Git repository
4. Configure project settings:
   - Framework Preset: Next.js
   - Root Directory: (leave blank if root)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://api-prod-v21.strike.money/v2/api`
   - `STRIKE_API_KEY`: Your Strike API key
6. Click "Deploy"

### 4. Configure Custom Domain (Optional)

1. Go to your project in Vercel Dashboard
2. Navigate to "Domains"
3. Add your custom domain and follow the verification steps

## Development

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable Name | Required | Default | Description |
|--------------|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `https://api-prod-v21.strike.money/v2/api` | Base URL for the Strike API |
| `STRIKE_API_KEY` | Yes | - | Your Strike API key |

## Troubleshooting

- **Build Fails**: Check the build logs in Vercel for specific error messages
- **API Errors**: Verify your API key and that the required environment variables are set
- **Environment Variables**: Make sure all required variables are set in Vercel project settings
