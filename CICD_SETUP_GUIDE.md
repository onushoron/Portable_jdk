# GitHub Actions CI/CD Setup Guide

## Quick Start

Your project is now configured with GitHub Actions for multi-platform JRE builds!

## What Was Created

✅ `.github/workflows/build-jre.yml` - Automated builds on push/PR
✅ `.github/workflows/release-jre.yml` - Release automation
✅ `.github/workflows/README.md` - Detailed workflow documentation

## How to Use

### Method 1: Automatic Builds (On Push)

Simply push your code to GitHub:

```bash
git add .
git commit -m "Add JRE builder with CI/CD"
git push origin main
```

The workflow will automatically:
1. Build JREs on Windows, macOS, and Linux
2. Create portable packages
3. Upload artifacts (available for 30 days)

### Method 2: Manual Trigger

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Build Multi-Platform JRE**
4. Click **Run workflow** button
5. Choose JDK version (11-21)
6. Click **Run workflow**

### Method 3: Create a Release

1. Go to **Releases** → **Create a new release**
2. Create a tag (e.g., `v1.0.0`)
3. Publish release
4. Workflow automatically builds and uploads JREs to the release

**OR** manually trigger release workflow:
1. Go to **Actions** tab
2. Select **Release Multi-Platform JRE**
3. Click **Run workflow**
4. Enter release tag: `v1.0.0`
5. Choose JDK version
6. Click **Run workflow**

## Downloading Built JREs

### From Actions Tab

1. Go to **Actions** tab
2. Click on a completed workflow run
3. Scroll down to **Artifacts** section
4. Download:
   - `jre-windows-17` (Windows JREs)
   - `jre-macos-17` (macOS JREs)
   - `jre-linux-17` (Linux JREs)

### From Releases

1. Go to **Releases** tab
2. Find your release (e.g., v1.0.0)
3. Download platform-specific packages:
   - `*-windows-x64.zip`
   - `*-mac-x64.tar.gz`
   - `*-linux-x64.tar.gz`

## First-Time Setup

### 1. Initialize Git Repository (if not already done)

```bash
cd I:\Programing\ADA\JRE\C_JRE
git init
git add .
git commit -m "Initial commit: Multi-platform JRE builder"
```

### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `jre-builder`)
3. **Don't** initialize with README (we already have files)

### 3. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/jre-builder.git
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Actions

GitHub Actions are enabled by default. Just push and workflows will run automatically!

### 5. Configure Permissions (Important!)

1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

## Workflow Triggers

### build-jre.yml

Runs on:
- ✅ Push to `main` or `master` branch
- ✅ Pull requests
- ✅ Manual trigger (with JDK version selection)

### release-jre.yml

Runs on:
- ✅ Creating a GitHub Release
- ✅ Manual trigger (with version and tag selection)

## Build Matrix

Each workflow run builds on 3 platforms simultaneously:

| Runner         | Builds                           | Time    |
|----------------|----------------------------------|---------|
| windows-latest | Windows x64, Windows ARM64       | ~5 min  |
| macos-latest   | macOS x64, macOS ARM64 (M1/M2)   | ~5 min  |
| ubuntu-latest  | Linux x64, Linux ARM64           | ~5 min  |

**Total time**: ~5 minutes (parallel execution)

## Cost & Limits

### Free Tier (Public Repositories)
- ✅ **Unlimited** minutes
- ✅ **Free** for public repos

### Free Tier (Private Repositories)
- ⚠️ 2,000 minutes/month
- Each full build uses ~15 minutes (3 platforms × 5 min)
- ~133 builds per month on free tier

### GitHub Actions Costs
- **Public repos**: Free forever
- **Private repos**: Free tier, then $0.008/minute (Linux/Windows), $0.016/minute (macOS)

## Monitoring Workflows

### Check Build Status

1. Go to **Actions** tab
2. See running/completed workflows
3. Click on a run to see detailed logs
4. Green checkmark ✅ = Success
5. Red X ❌ = Failed (click to see why)

### View Build Logs

1. Click on workflow run
2. Click on job (e.g., "Build JRE on ubuntu-latest")
3. View detailed step-by-step logs
4. Expand any step to see full output

## Troubleshooting

### Workflow Doesn't Start

- **Check**: Push was to `main` or `master` branch
- **Check**: GitHub Actions enabled in repository settings
- **Solution**: Manually trigger workflow from Actions tab

### Build Fails

- **Check**: JARs exist in `jars/` folder
- **Check**: Workflow logs for specific error
- **Solution**: Fix issue, commit, and push again

### Artifacts Not Available

- **Check**: Build completed successfully (green checkmark)
- **Check**: Scrolled to bottom of workflow run page
- **Note**: Artifacts expire after 30 days (configurable)

### Permission Denied on Release

- **Check**: Workflow permissions set to "Read and write"
- **Location**: Settings → Actions → General → Workflow permissions
- **Solution**: Enable write permissions and re-run

## Customization

### Change JDK Version

Edit `.github/workflows/build-jre.yml`, line 33:
```yaml
jdk_version: ['17']  # Change to 11, 16, 18, 19, 20, or 21
```

### Build On Different Branches

Edit trigger in workflow file:
```yaml
on:
  push:
    branches: [ main, master, develop ]  # Add more branches
```

### Change Artifact Retention

```yaml
retention-days: 30  # Change to 7, 90, etc.
```

## Security Best Practices

✅ No secrets needed for public repos
✅ JDKs from official Adoptium releases (verified)
✅ All downloads over HTTPS
✅ No third-party actions with secret access
⚠️ For private repos: Don't commit sensitive data

## What Happens Next

Once you push to GitHub:

1. **Immediately**: Workflows visible in Actions tab
2. **~1 minute**: Runners start, dependencies installed
3. **~5 minutes**: JREs built on all platforms
4. **~6 minutes**: Artifacts uploaded and available
5. **Done**: Download from Actions tab or Releases

## Example: Creating Your First Release

```bash
# 1. Commit your JAR files
git add jars/
git commit -m "Add application JARs"
git push

# 2. Create a tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 3. Go to GitHub → Releases → Draft a new release
# 4. Choose tag v1.0.0
# 5. Add release notes
# 6. Publish release

# Workflow automatically builds and uploads JREs!
```

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Wait for first workflow to complete (~5 min)
3. ✅ Download artifacts from Actions tab
4. ✅ Test JREs on each platform
5. ✅ Create your first release with automatic builds!

## Support

- 📖 Full workflow docs: `.github/workflows/README.md`
- 📖 Project docs: `readme.md`
- 📖 Quick reference: `QUICK_REFERENCE.md`
- 🐛 Issues: Create issue on GitHub
