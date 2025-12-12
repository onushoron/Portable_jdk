#!/usr/bin/env node

/**
 * Portable Version Builder
 * Creates self-contained portable packages for Aspose.Words with embedded JRE
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');

// Configuration
const VERSION = '1.0.0';
const OUTPUT_DIR = path.join(process.cwd(), 'portable-releases');
const JRE_DIR = path.join(process.cwd(), 'jre-builds');
const JARS_DIR = path.join(process.cwd(), 'jars');

// Find JAR files
function findJarFiles() {
  const jarsDir = JARS_DIR;
  if (!fs.existsSync(jarsDir)) {
    return [];
  }

  const files = fs.readdirSync(jarsDir);
  return files.filter(f => f.endsWith('.jar')).map(f => path.join(jarsDir, f));
}

const JAR_FILES = findJarFiles();

// Colors
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

// Logging
const log = {
  header: (msg) => {
    console.log(`\n${colors.green}========================================${colors.reset}`);
    console.log(`${colors.green}${msg}${colors.reset}`);
    console.log(`${colors.green}========================================${colors.reset}\n`);
  },
  info: (msg) => console.log(`${colors.yellow}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.blue}[STEP]${colors.reset} ${msg}`),
};

// Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy directory recursively
function copyDirectory(src, dest) {
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Get directory size
function getDirectorySize(dirPath) {
  let totalSize = 0;

  function calculateSize(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        calculateSize(fullPath);
      } else {
        totalSize += stat.size;
      }
    }
  }

  try {
    calculateSize(dirPath);
  } catch (error) {
    // Ignore
  }

  return totalSize;
}

// Format bytes
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Create Windows launcher
function createLauncherWindows(pkgDir, jarFiles) {
  const jarList = jarFiles.map(j => path.basename(j)).join(', ');
  const launcher = `@echo off
setlocal

REM Get script directory
set "APP_DIR=%~dp0"
set "JRE_DIR=%APP_DIR%jre"
set "JAVA_EXE=%JRE_DIR%\\bin\\java.exe"

REM Check if JRE exists
if not exist "%JAVA_EXE%" (
    echo ERROR: Java Runtime not found!
    echo Expected location: %JAVA_EXE%
    pause
    exit /b 1
)

REM Run with first JAR file (add your logic here)
set "JAR_FILE=%APP_DIR%${path.basename(jarFiles[0])}"
"%JAVA_EXE%" -jar "%JAR_FILE%" %*
`;

  const launcherFile = path.join(pkgDir, 'launch.bat');
  fs.writeFileSync(launcherFile, launcher, 'utf-8');
  log.info(`Created launcher: launch.bat`);
}

// Create Unix launcher
function createLauncherUnix(pkgDir, jarFiles) {
  const launcher = `#!/bin/bash

# Get script directory
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
JRE_DIR="$APP_DIR/jre"
JAVA_BIN="$JRE_DIR/bin/java"
JAR_FILE="$APP_DIR/${path.basename(jarFiles[0])}"

# Check if JRE exists
if [ ! -f "$JAVA_BIN" ]; then
    echo "ERROR: Java Runtime not found!"
    echo "Expected location: $JAVA_BIN"
    exit 1
fi

# Run with JAR file
"$JAVA_BIN" -jar "$JAR_FILE" "$@"
`;

  const launcherFile = path.join(pkgDir, 'launch.sh');
  fs.writeFileSync(launcherFile, launcher, 'utf-8');
  fs.chmodSync(launcherFile, 0o755);
  log.info(`Created launcher: launch.sh`);
}

// Create README
function createReadme(platform, pkgDir) {
  let readme;

  if (platform === 'windows') {
    readme = `========================================
Aspose.Words Portable Edition
========================================

SYSTEM REQUIREMENTS:
- Windows 10/11 (64-bit)
- 4GB RAM minimum
- 500MB free disk space

HOW TO RUN:
1. Double-click launch.bat
2. Or run from command line: launch.bat input.docx output.pdf

USAGE EXAMPLES:
launch.bat input.docx output.pdf
launch.bat document.doc output.html

FOLDER STRUCTURE:
- launch.bat              : Launcher script
- jre/                    : Embedded Java Runtime
- aspose-words-25.10.jar  : Aspose.Words library

NOTES:
- No installation required
- No admin rights needed
- All data contained in this folder
- Can be run from USB drive
- Antivirus may scan on first run (normal)

TROUBLESHOOTING:
- If app doesn't start, check that all files were extracted
- Verify JRE exists in jre/bin/java.exe
- Check Windows Defender/Antivirus settings

For support: support@yourcompany.com
`;
  } else {
    readme = `========================================
Aspose.Words Portable Edition
========================================

SYSTEM REQUIREMENTS:
- macOS 11+ or Linux (Ubuntu 20.04+, Fedora 35+)
- 4GB RAM minimum
- 500MB free disk space

HOW TO RUN:
1. Make executable: chmod +x launch.sh
2. Run: ./launch.sh input.docx output.pdf

USAGE EXAMPLES:
./launch.sh input.docx output.pdf
./launch.sh document.doc output.html

FOLDER STRUCTURE:
- launch.sh               : Launcher script
- jre/                    : Embedded Java Runtime
- aspose-words-25.10.jar  : Aspose.Words library

NOTES:
- No installation required
- Runs from any location
- All data contained in this folder
- Can be run from external drive

TROUBLESHOOTING:
- If permission denied: chmod +x launch.sh
- Verify JRE exists: ls jre/bin/java
- On macOS: xattr -cr . (if Gatekeeper blocks)

For support: support@yourcompany.com
`;
  }

  const readmeFile = path.join(pkgDir, 'README.txt');
  fs.writeFileSync(readmeFile, readme, 'utf-8');
  log.info(`Created README: README.txt`);
}

// Create ZIP archive
async function createZipArchive(pkgDir) {
  return new Promise((resolve, reject) => {
    const archivePath = path.join(path.dirname(pkgDir), `${path.basename(pkgDir)}.zip`);
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archivePath));
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(pkgDir, path.basename(pkgDir));
    archive.finalize();
  });
}

// Create TAR.GZ archive using archiver (pure JavaScript)
async function createTarGzArchive(pkgDir) {
  return new Promise((resolve, reject) => {
    const archivePath = path.join(path.dirname(pkgDir), `${path.basename(pkgDir)}.tar.gz`);
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('tar', {
      gzip: true,
      gzipOptions: { level: 9 }
    });

    output.on('close', () => resolve(archivePath));
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(pkgDir, path.basename(pkgDir));
    archive.finalize();
  });
}

// Create portable package
async function createPortablePackage(platform, arch, jreName) {
  log.step(`Building portable package: ${platform}-${arch}`);

  // Check JRE exists
  const jrePath = path.join(JRE_DIR, jreName);
  if (!fs.existsSync(jrePath)) {
    log.error(`JRE not found: ${jrePath}`);
    log.info('Please run node build-jre-all-platforms.js first');
    return false;
  }

  // Check JARs exist
  if (JAR_FILES.length === 0) {
    log.error(`No JAR files found in: ${JARS_DIR}`);
    log.info('Please add JAR files to the jars/ directory');
    return false;
  }

  // Create package directory
  const pkgName = `aspose-words-${VERSION}-${platform}-${arch}-portable`;
  const pkgDir = path.join(OUTPUT_DIR, pkgName);

  if (fs.existsSync(pkgDir)) {
    fs.rmSync(pkgDir, { recursive: true, force: true });
  }

  ensureDir(pkgDir);

  // Copy JRE
  log.info('Copying JRE...');
  copyDirectory(jrePath, path.join(pkgDir, 'jre'));

  // Copy JAR files
  log.info(`Copying ${JAR_FILES.length} JAR file(s)...`);
  for (const jarFile of JAR_FILES) {
    fs.copyFileSync(jarFile, path.join(pkgDir, path.basename(jarFile)));
  }

  // Create launcher
  if (platform === 'windows') {
    createLauncherWindows(pkgDir, JAR_FILES);
  } else {
    createLauncherUnix(pkgDir, JAR_FILES);
  }

  // Create README
  createReadme(platform, pkgDir);

  // Calculate package size
  const size = getDirectorySize(pkgDir);
  log.info(`Package size: ${formatSize(size)}`);

  // Create archive
  try {
    log.info('Creating archive...');

    let archivePath;
    if (platform === 'windows') {
      archivePath = await createZipArchive(pkgDir);
    } else {
      archivePath = await createTarGzArchive(pkgDir);
    }

    const archiveSize = fs.statSync(archivePath).size;
    log.success(`Created: ${path.basename(archivePath)} (${formatSize(archiveSize)})`);
    return true;
  } catch (error) {
    log.error(`Failed to create archive: ${error.message}`);
    return false;
  }
}

// Check prerequisites
function checkPrerequisites() {
  log.header('Checking Prerequisites');

  let missing = false;

  // Check JRE directory
  if (!fs.existsSync(JRE_DIR)) {
    log.error(`JRE directory not found: ${JRE_DIR}`);
    log.info('Please run node build-jre-all-platforms.js first');
    missing = true;
  }

  // Check JAR files
  if (JAR_FILES.length === 0) {
    log.error(`No JAR files found in: ${JARS_DIR}`);
    log.info('Please add JAR files to the jars/ directory');
    missing = true;
  } else {
    log.info(`Found ${JAR_FILES.length} JAR file(s): ${JAR_FILES.map(j => path.basename(j)).join(', ')}`);
  }

  if (missing) {
    return false;
  }

  log.success('All prerequisites met');
  return true;
}

// Main function
async function main() {
  log.header('Portable Version Builder for Aspose.Words');

  // Check prerequisites
  if (!checkPrerequisites()) {
    process.exit(1);
  }

  // Create output directory
  ensureDir(OUTPUT_DIR);

  log.info(`Version: ${VERSION}`);
  log.info(`Output Directory: ${OUTPUT_DIR}`);
  console.log();

  // Platform configurations
  const platforms = [
    ['windows', 'x64', 'jre-win-x64'],
    ['macos', 'x64', 'jre-mac-x64'],
    ['macos', 'arm64', 'jre-mac-arm64'],
    ['linux', 'x64', 'jre-linux-x64'],
    ['linux', 'arm64', 'jre-linux-arm64'],
  ];

  // Build specific platform or all
  if (process.argv.length > 2) {
    const target = process.argv[2];
    log.info(`Building for: ${target}\n`);

    // Find matching platform
    for (const [platform, arch, jreName] of platforms) {
      if (`${platform}-${arch}` === target) {
        const success = await createPortablePackage(platform, arch, jreName);
        process.exit(success ? 0 : 1);
      }
    }

    log.error(`Unknown platform: ${target}`);
    log.info('Available: windows-x64, macos-x64, macos-arm64, linux-x64, linux-arm64');
    process.exit(1);
  } else {
    log.info('Building portable versions for all platforms...\n');

    const results = {};
    for (const [platform, arch, jreName] of platforms) {
      const name = `${platform}-${arch}`;
      console.log('\n' + '='.repeat(60));

      try {
        results[name] = await createPortablePackage(platform, arch, jreName);
      } catch (error) {
        log.error(`Failed to create ${name}: ${error.message}`);
        results[name] = false;
      }

      console.log('='.repeat(60));
    }

    // Summary
    log.header('Build Summary');

    for (const [name, success] of Object.entries(results)) {
      const status = success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      console.log(`${status} ${name}`);
    }

    // Show archives
    console.log();
    const archives = [
      ...fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.zip')),
      ...fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.tar.gz'))
    ];

    for (const archive of archives.sort()) {
      const archivePath = path.join(OUTPUT_DIR, archive);
      const size = fs.statSync(archivePath).size;
      console.log(`${colors.green}✓${colors.reset} ${archive} - ${formatSize(size)}`);
    }

    console.log();
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    log.success(`Portable versions built: ${successCount}/${totalCount}`);
    log.info(`Location: ${OUTPUT_DIR}`);
    console.log();
    log.info('Next steps:');
    console.log('  1. Test each portable version on target OS');
    console.log('  2. Verify launcher scripts work correctly');
    console.log('  3. Distribute to users!');

    process.exit(successCount === totalCount ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { createPortablePackage };