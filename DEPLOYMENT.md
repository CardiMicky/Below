# Step-by-Step Deployment Guide: Vercel via GitHub

## Prerequisites
- A GitHub account
- Your project files ready
- Icons folder with at least icon-192.png and icon-512.png

---

## Step 1: Initialize Git Repository (if not already done)

Open your terminal/command prompt in your project folder and run:

```bash
# Initialize git (if not already initialized)
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial commit: Camera PWA app"
```

---

## Step 2: Create GitHub Repository

1. **Go to GitHub**: Open [github.com](https://github.com) and sign in
2. **Create New Repository**:
   - Click the **"+"** icon in the top right
   - Select **"New repository"**
3. **Repository Settings**:
   - **Repository name**: `camera-app` (or any name you prefer)
   - **Description**: "Live camera stream PWA"
   - **Visibility**: Choose **Public** (free) or **Private**
   - **DO NOT** check "Initialize with README" (you already have files)
   - Click **"Create repository"**

---

## Step 3: Push Your Code to GitHub

After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/camera-app.git

# Rename main branch if needed (GitHub uses 'main' by default)
git branch -M main

# Push your code
git push -u origin main
```

**Note**: If you're asked for credentials:
- Use a **Personal Access Token** (not your password)
- Create one at: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Give it `repo` permissions

---

## Step 4: Import to Vercel

1. **Go to Vercel**: Open [vercel.com](https://vercel.com) and sign in
   - You can sign in with your GitHub account (recommended)

2. **Import Project**:
   - Click **"Add New..."** button
   - Select **"Project"**
   - Click **"Import Git Repository"**
   - You'll see your GitHub repositories listed
   - Find and click **"Import"** next to your `camera-app` repository

---

## Step 5: Configure Vercel Project

1. **Project Settings**:
   - **Project Name**: `camera-app` (or customize)
   - **Framework Preset**: Select **"Other"** or **"Vite"** (doesn't matter for static sites)
   - **Root Directory**: Leave as `./` (default)

2. **Build Settings** (usually auto-detected):
   - **Build Command**: Leave empty (static site, no build needed)
   - **Output Directory**: Leave empty or set to `.`
   - **Install Command**: Leave empty

3. **Environment Variables**: 
   - None needed for this project
   - Click **"Deploy"**

---

## Step 6: Wait for Deployment

- Vercel will automatically:
  - Detect your files
  - Deploy your site
  - Provide you with a URL (e.g., `camera-app.vercel.app`)

**Deployment takes about 1-2 minutes**

---

## Step 7: Verify Deployment

1. **Check Your Site**:
   - Click the deployment URL provided by Vercel
   - Your camera app should load!

2. **Test PWA Features**:
   - Open on a mobile device
   - Look for "Add to Home Screen" prompt
   - Or use browser menu: "Add to Home Screen"

3. **Check Service Worker**:
   - Open browser DevTools (F12)
   - Go to **Application** tab → **Service Workers**
   - Should show "activated and running"

---

## Step 8: Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain if you have one
4. Follow DNS configuration instructions

---

## Step 9: Automatic Deployments (Already Set Up!)

✅ **Future updates are automatic!**

- Every time you push to GitHub:
  ```bash
  git add .
  git commit -m "Your update message"
  git push
  ```
- Vercel will automatically detect and deploy the changes
- You'll get a new deployment URL for each push

---

## Troubleshooting

### Icons Not Showing?
- Make sure your `Icons` folder is pushed to GitHub
- Check that file names match exactly: `icon-192.png` and `icon-512.png`
- Verify the paths in `manifest.json` match your folder name

### Service Worker Not Working?
- Make sure you're accessing via HTTPS (Vercel provides this automatically)
- Check browser console for errors
- Clear browser cache and reload

### 404 Errors?
- Verify all files are in the repository
- Check that `index.html` is in the root directory
- Make sure `vercel.json` is present

### Need to Update Icons?
1. Add new icon files to `Icons` folder
2. Update `manifest.json` with new icon entries
3. Commit and push:
   ```bash
   git add .
   git commit -m "Update icons"
   git push
   ```

---

## Quick Reference Commands

```bash
# Check git status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your message here"

# Push to GitHub (triggers Vercel deployment)
git push

# View deployment logs in Vercel dashboard
# (Go to your project → Deployments → Click on a deployment)
```

---

## Success Checklist

- ✅ Code pushed to GitHub
- ✅ Repository imported to Vercel
- ✅ Site deployed and accessible
- ✅ HTTPS enabled (automatic on Vercel)
- ✅ Service worker registered
- ✅ Icons visible in manifest
- ✅ Can install as PWA on mobile

**Your camera app is now live! 🎉**

