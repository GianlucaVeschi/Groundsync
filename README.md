<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1CKLTATqPAJgtVHt0K3xF7AR1VTpF1FuT

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

The app automatically deploys to GitHub Pages when you push to the `main` branch.

**Setup steps:**

1. Go to your GitHub repository settings
2. Navigate to Settings > Pages
3. Under "Build and deployment", select:
   - Source: **GitHub Actions**
4. Push to `main` branch to trigger deployment

Your app will be available at: `https://gianlucaveschi.github.io/Groundsync/`
