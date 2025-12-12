# JRE Builder - Quick Reference

## Available Commands

### Analysis
```bash
npm run analyze              # Analyze JAR files in ./jars/
npm run analyze:folder       # Analyze specific folder
```

### Download JDKs
```bash
npm run download             # Download JDK 21 (default)
npm run download:11          # Download JDK 11
npm run download:16          # Download JDK 16
npm run download:17          # Download JDK 17
npm run download:18          # Download JDK 18
npm run download:19          # Download JDK 19
npm run download:20          # Download JDK 20
npm run download:21          # Download JDK 21
```

### Build JRE (All Platforms)
```bash
npm run build-jre            # Auto-detect JDK version
npm run build-jre:11         # Build with JDK 11
npm run build-jre:16         # Build with JDK 16
npm run build-jre:17         # Build with JDK 17
npm run build-jre:18         # Build with JDK 18
npm run build-jre:19         # Build with JDK 19
npm run build-jre:20         # Build with JDK 20
npm run build-jre:21         # Build with JDK 21
```

### Build JRE (Specific Platform)
```bash
npm run build-jre:windows    # Windows x64 only
npm run build-jre:windows-arm # Windows ARM64 only
npm run build-jre:mac-x64    # macOS x64 only
npm run build-jre:mac-arm    # macOS ARM64 only
npm run build-jre:linux      # Linux x64 only
npm run build-jre:linux-arm  # Linux ARM64 only
```

### Create Portable Packages
```bash
npm run build-portable       # Package all built JREs
```

### Complete Workflow
```bash
npm run build-all            # Download + Build + Package (all-in-one)
```

### Cleanup
```bash
npm run clean                # Remove jdk-downloads, jre-builds, portable-releases
```

## Supported JDK Versions

- **JDK 11** (LTS) - 11.0.25
- **JDK 16** - 16.0.2
- **JDK 17** (LTS) - 17.0.13
- **JDK 18** - 18.0.2.1
- **JDK 19** - 19.0.2
- **JDK 20** - 20.0.2
- **JDK 21** (LTS) - 21.0.5

## Supported Platforms

- Windows x64
- Windows ARM64
- macOS x64 (Intel)
- macOS ARM64 (Apple Silicon)
- Linux x64
- Linux ARM64

## Auto-Detection

The build script automatically detects available JDK versions by:
1. Scanning `jdk-downloads` directory
2. Finding extracted JDK directories (format: `jdk-{version}-{platform}`)
3. Using the highest available version
4. Falling back to environment variable `JDK_VERSION` if set

## Environment Variables

```bash
# Windows
set JDK_VERSION=17&& npm run build-jre

# Linux/macOS
export JDK_VERSION=17 && npm run build-jre
```

## Current Status

✅ JDK 17 installed and detected
✅ Windows x64 JRE built successfully (47.6 MB)
✅ Ready to build portable packages

## Typical Workflow

1. **Analyze your JARs**:
   ```bash
   npm run analyze
   ```

2. **Download required JDK**:
   ```bash
   npm run download:17
   ```

3. **Build JRE**:
   ```bash
   npm run build-jre:17
   ```

4. **Create portable package**:
   ```bash
   npm run build-portable
   ```

## Notes

- Cross-platform builds require native OS (use CI/CD for multiple platforms)
- JRE size typically ranges from 40-60 MB per platform
- Built JREs are optimized for distribution (no java.exe included)
