# Multi-Platform JRE Builder

Production-grade tool to build minimal custom JREs and portable packages for Windows, macOS, and Linux.

## 🎯 Features

- ✅ **Multi-Platform**: Windows (x64/ARM64), macOS (Intel/ARM), Linux (x64/ARM64)
- ✅ **6 Platforms Supported**: All major desktop and server platforms
- ✅ **Minimal JREs**: 25-50 MB instead of 300+ MB
- ✅ **Automatic Analysis**: Detects required Java modules from JAR
- ✅ **Cross-Platform Build**: Build on Windows, run everywhere
- ✅ **Smart Caching**: Skip re-downloads, instant rebuilds
- ✅ **Production Ready**: Proper error handling, resume capability
- ✅ **CI/CD Ready**: GitHub Actions workflow included

## 📦 Prerequisites

- Node.js 14+ 
- 1 GB disk space per platform
- Internet connection (first run only)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Analyze Your JAR (Optional but Recommended)

**Single JAR:**
```bash
npm run analyze your-app.jar
```

**Multiple JARs in folder:**
```bash
# Place all JARs in ./jars/ folder
mkdir jars
copy *.jar jars\

# Analyze all JARs
npm run analyze:folder

# Or specify custom folder
node analyze-jar.js path/to/jars
```

**Auto-detect:**
```bash
# If you have JARs in ./jars/ folder
npm run analyze
# Automatically finds and analyzes all JARs
```

This creates a combined module list from all your JARs.

### 3. Download JDKs for All Platforms

```bash
npm run download
```

Downloads and extracts JDKs for all 5 platforms (~1 GB total).

### 4. Build Custom JREs

```bash
npm run build-jre
```

Automatically uses analyzed modules or defaults.

### 5. Create Portable Packages

```bash
npm run build-portable your-app.jar
```

Creates ready-to-distribute packages for all platforms.

## 📁 Output Structure

```
your-project/
├── jdk-downloads/           # Downloaded JDKs (cached)
│   ├── jdk-21-windows-x64/
│   ├── jdk-21-windows-arm64/
│   ├── jdk-21-macos-x64/
│   ├── jdk-21-macos-arm64/
│   ├── jdk-21-linux-x64/
│   └── jdk-21-linux-arm64/
│
├── jre-builds/              # Custom JREs
│   ├── jre-windows-x64/     (35 MB)
│   ├── jre-windows-arm64/   (35 MB)
│   ├── jre-macos-x64/       (37 MB)
│   ├── jre-macos-arm64/     (36 MB)
│   ├── jre-linux-x64/       (34 MB)
│   └── jre-linux-arm64/     (35 MB)
│
└── portable-releases/       # Ready to distribute
    ├── your-app-1.0.0-windows-x64-portable.zip
    ├── your-app-1.0.0-windows-arm64-portable.zip
    ├── your-app-1.0.0-macos-x64-portable.tar.gz
    ├── your-app-1.0.0-macos-arm64-portable.tar.gz
    ├── your-app-1.0.0-linux-x64-portable.tar.gz
    └── your-app-1.0.0-linux-arm64-portable.tar.gz
```

## 🎛️ Advanced Usage

### Build for Specific Platform

```bash
# Download single platform
npm run download:21

# Build JRE for Windows only
npm run build-jre:windows

# Create portable package for Windows
node create-portable.js your-app.jar windows-x64
```

### Use Different JDK Version

```bash
# Download JDK 17
set JDK_VERSION=17
npm run download

# Build with JDK 17
set JDK_VERSION=17
npm run build-jre
```

### Custom Module Selection

**Option 1: Analyze single JAR**
```bash
npm run analyze your-app.jar
npm run build-jre  # Auto-uses your-app-modules.txt
```

**Option 2: Analyze multiple JARs**
```bash
# Place JARs in ./jars/ folder
mkdir jars
copy app.jar jars\
copy lib1.jar jars\
copy lib2.jar jars\

# Analyze all
npm run analyze:folder
# Creates: combined-modules.txt

npm run build-jre  # Auto-uses combined-modules.txt
```

**Option 3: Manual override**
```bash
echo java.base,java.xml,java.logging > custom-modules.txt
npm run build-jre  # Uses custom-modules.txt
```

**Option 4: Environment variable**
```bash
set MODULES=java.base,java.xml
npm run build-jre
```

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run analyze <jar>` | Analyze single JAR and detect required modules |
| `npm run analyze <folder>` | Analyze all JARs in a folder |
| `npm run analyze:folder` | Analyze all JARs in ./jars/ folder |
| `npm run download` | Download JDKs for all platforms (JDK 21) |
| `npm run download:17` | Download JDK 17 for all platforms |
| `npm run build-jre` | Build custom JREs for all platforms |
| `npm run build-jre:windows` | Build JRE for Windows only |
| `npm run build-portable <jar>` | Create portable packages for all platforms |
| `npm run build-all` | Do everything: download + build + package |
| `npm run clean` | Remove all generated files |

## 🔍 Platform-Specific Details

### Windows (x64 & ARM64)
- **Archive**: ZIP
- **JDK Structure**: `jdk-21.0.5+11/bin/jlink.exe`
- **Launcher**: `run.bat` (double-click to run)
- **Size**: ~35 MB JRE + your JAR
- **ARM64**: Native support for Windows on ARM devices

### macOS (Intel & Apple Silicon)
- **Archive**: TAR.GZ
- **JDK Structure**: `jdk-21.0.5+11/Contents/Home/bin/jlink`
- **Launcher**: `run.sh` (chmod +x required)
- **Size**: ~37 MB JRE + your JAR
- **Apple Silicon**: Optimized for M1/M2/M3 chips

### Linux (x64 & ARM64)
- **Archive**: TAR.GZ
- **JDK Structure**: `jdk-21.0.5+11/bin/jlink`
- **Launcher**: `run.sh` (chmod +x required)
- **Size**: ~34 MB JRE + your JAR
- **ARM64**: Perfect for Raspberry Pi 4/5, ARM servers

## 🧩 Module Priorities

The build system uses this priority order for module selection:

1. **Environment Variable** (`MODULES=java.base,java.xml`)
2. **Manual Override** (`custom-modules.txt`)
3. **Auto-Detected** (`your-app-modules.txt` from analysis)
4. **Default Set** (comprehensive fallback)

## 💡 Tips & Best Practices

### Minimize JRE Size

```bash
# Analyze to find exact modules needed
npm run analyze minimal-cli-app.jar

# Result: Only 2-3 modules needed
# JRE size: 25 MB instead of 45 MB!
```

### Build Windows-Only (Fastest)

```bash
# Skip other platforms for faster builds
npm run build-jre:windows
node create-portable.js your-app.jar windows-x64
```

### Verify Portable Package

```bash
# Extract and test
unzip portable-releases/your-app-*-windows-x64-portable.zip
cd your-app-*/
run.bat  # or ./run.sh on Unix
```

### Resume Failed Downloads

```bash
# Script automatically resumes if interrupted
npm run download
# Already downloaded files are skipped
# Only incomplete downloads restart
```

## 🐛 Troubleshooting

### "jlink not found"

```bash
# Clean and re-download
npm run clean
npm run download
```

### "No JDK found for analysis"

Install JDK system-wide or set `JAVA_HOME`:

```bash
# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-21

# Unix
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
```

### Symlink Errors on Windows

This is normal! The script automatically skips symlinks that Windows can't handle. JDK still works perfectly.

### Module Detection Failed

```bash
# Use default modules
npm run build-jre

# Or specify manually
set MODULES=java.base,java.desktop
npm run build-jre
```

## 📊 Size Comparison

| Application Type | Full JDK | Custom JRE | Savings |
|------------------|----------|------------|---------|
| CLI Tool | 300 MB | 25 MB | 92% |
| REST API | 300 MB | 30 MB | 90% |
| Desktop App | 300 MB | 45 MB | 85% |
| Full-Featured | 300 MB | 50 MB | 83% |

## 🔄 Workflow Examples

### Complete Build (All Platforms)

```bash
npm install
npm run analyze your-app.jar
npm run download
npm run build-jre
npm run build-portable your-app.jar
```

### Multi-JAR Application

**For applications with multiple JARs:**

```bash
# 1. Organize JARs
mkdir jars
copy app.jar jars\
copy lib1.jar jars\
copy lib2.jar jars\

# 2. Analyze all JARs
npm run analyze:folder
# Creates: combined-modules.txt with all required modules

# 3. Build JRE with combined modules
npm run download
npm run build-jre

# 4. Package main JAR (or create uber-JAR first)
npm run build-portable app.jar
```

**Note:** For multi-JAR apps, consider:
- Creating an uber-JAR (fat JAR) with all dependencies
- Using a launcher JAR with proper Class-Path in MANIFEST.MF
- Manually copying all JARs to the portable package

### Quick Windows Build

```bash
npm install
npm run download:21
npm run build-jre:windows
node create-portable.js your-app.jar windows-x64
```

### Update Existing Build

```bash
# Modify your JAR
npm run analyze your-new-app.jar

# Rebuild (downloads cached, fast!)
npm run build-jre
npm run build-portable your-new-app.jar
```

## 📝 Files Included

- **download-jdks.js** - Download and extract JDKs for all platforms
- **analyze-jar.js** - Analyze JAR and detect required modules
- **build-jre-all-platforms.js** - Build custom JREs with jlink
- **create-portable.js** - Package JRE + JAR + launcher
- **package.json** - NPM scripts and dependencies

## 🎓 How It Works

1. **Download**: Fetches official Adoptium JDKs for each platform
2. **Extract**: Handles platform-specific archive structures (ZIP/TAR.GZ)
3. **Analyze**: Uses `jdeps` to detect required Java modules
4. **Build**: Runs `jlink` to create minimal custom JREs
5. **Package**: Bundles JRE + JAR + launcher into portable archives

## 🚀 CI/CD Integration

### GitHub Actions

This project includes a ready-to-use GitHub Actions workflow. Create `.github/workflows/test-build.yml` from the artifact above.

**Features:**
- ✅ Tests on Windows, macOS, and Linux runners
- ✅ Builds all 6 platform variants
- ✅ Uploads artifacts automatically
- ✅ Runs on push, PR, or manual trigger

**Usage:**
```bash
# Commit the workflow file
git add .github/workflows/test-build.yml
git commit -m "Add CI/CD workflow"
git push

# View results in GitHub Actions tab
```

**Artifacts Generated:**
- `windows-portable-packages/` - Windows x64 & ARM64 ZIPs
- `macos-portable-packages/` - macOS Intel & ARM TAR.GZ
- `linux-portable-packages/` - Linux x64 & ARM64 TAR.GZ

### Other CI Systems

**GitLab CI:**
```yaml
build:
  stage: build
  script:
    - npm install
    - npm run download
    - npm run build-jre
    - npm run build-portable your-app.jar
  artifacts:
    paths:
      - portable-releases/
```

**Jenkins:**
```groovy
pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh 'npm install'
        sh 'npm run download'
        sh 'npm run build-jre'
        sh 'npm run build-portable your-app.jar'
        archiveArtifacts 'portable-releases/*'
      }
    }
  }
}
```

## 📄 License

MIT License - Use freely in commercial and personal projects.
