# GitHub Actions Workflows

This directory contains automated CI/CD workflows for building multi-platform JREs.

## Available Workflows

### 1. Build Multi-Platform JRE (`build-jre.yml`)

**Triggers:**
- Push to `main` or `master` branch
- Pull requests
- Manual trigger via GitHub UI (with JDK version selection)

**What it does:**
- Builds JREs on Windows, macOS, and Linux simultaneously
- Analyzes JAR dependencies
- Downloads specified JDK version
- Builds optimized JREs for each platform
- Creates portable packages
- Uploads build artifacts (retained for 30 days)

**Manual Trigger:**
1. Go to "Actions" tab in GitHub
2. Select "Build Multi-Platform JRE"
3. Click "Run workflow"
4. Choose JDK version (11-21)
5. Click "Run workflow"

### 2. Release Multi-Platform JRE (`release-jre.yml`)

**Triggers:**
- Creating a new GitHub Release
- Manual trigger via GitHub UI

**What it does:**
- Builds JREs for all platforms
- Creates portable packages
- Uploads packages to GitHub Release
- Archives artifacts (retained for 90 days)

**Manual Release:**
1. Go to "Actions" tab in GitHub
2. Select "Release Multi-Platform JRE"
3. Click "Run workflow"
4. Choose JDK version
5. Enter release tag (e.g., v1.0.0)
6. Click "Run workflow"

## Workflow Artifacts

After successful builds, artifacts are available in:
- **Actions tab** → Select workflow run → Scroll to "Artifacts" section
- **Releases page** (for release workflow)

### Artifact Structure

```
jre-windows-17/
├── jre-builds/
│   ├── jre-win-x64/
│   └── jre-win-arm64/
└── portable-releases/
    └── *.zip

jre-macos-17/
├── jre-builds/
│   ├── jre-mac-x64/
│   └── jre-mac-arm64/
└── portable-releases/
    └── *.tar.gz

jre-linux-17/
├── jre-builds/
│   ├── jre-linux-x64/
│   └── jre-linux-arm64/
└── portable-releases/
    └── *.tar.gz
```

## Environment Variables

Workflows support these environment variables:
- `JDK_VERSION`: JDK version to download and build (11, 16, 17, 18, 19, 20, 21)

## Platform Support

| Platform | Windows x64 | Windows ARM64 | macOS x64 | macOS ARM64 | Linux x64 | Linux ARM64 |
|----------|-------------|---------------|-----------|-------------|-----------|-------------|
| Build    | ✅          | ✅            | ✅        | ✅          | ✅        | ✅          |
| Host OS  | Windows     | Windows       | macOS     | macOS       | Linux     | Linux       |

## Cost Considerations

GitHub Actions provides:
- **Free tier**: 2,000 minutes/month for public repositories
- **Private repos**: 2,000 minutes/month for free accounts, more for paid plans
- **Matrix builds**: Uses 3x runners (Windows, macOS, Linux) simultaneously

**Estimated usage per run:**
- ~5-10 minutes per platform
- ~15-30 minutes total (parallel execution)

## Troubleshooting

### Build Fails on Specific Platform

Check the workflow logs for the failed platform. Common issues:
- JDK download timeout → Re-run workflow
- JARs not found → Ensure JARs are committed to repository
- Module detection failed → Manually specify modules in `custom-modules.txt`

### Artifacts Not Uploaded

Ensure `portable-releases` directory is created. Check:
```bash
npm run build-portable
```

### Permission Issues

If release upload fails, ensure:
1. GitHub Actions has write permissions: Settings → Actions → General → Workflow permissions
2. Set to "Read and write permissions"

## Local Testing

Test workflow steps locally:
```bash
# Install dependencies
npm install

# Analyze JARs
npm run analyze

# Download JDK 17
npm run download:17

# Build JRE
npm run build-jre:17

# Create portable packages
npm run build-portable
```

## Customization

### Change Default JDK Version

Edit `build-jre.yml`, line 35:
```yaml
jdk_version: ['17']  # Change to desired version
```

### Add More Platforms

Currently supports all platforms that can be cross-compiled. To add custom platforms, modify `build-jre-all-platforms.js`.

### Modify Retention Period

Change artifact retention in workflow files:
```yaml
retention-days: 30  # Change to desired days
```

## Security

- Workflows use official GitHub Actions
- No secrets required for public repositories
- JDKs downloaded from official Adoptium releases
- All downloads verified with HTTPS

## Support

For issues with workflows:
1. Check workflow run logs in Actions tab
2. Review this README
3. Check main project documentation
