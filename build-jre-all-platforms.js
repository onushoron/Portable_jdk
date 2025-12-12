#!/usr/bin/env node

/**
 * Custom JRE Builder for Multi-Platform Deployment
 * Creates minimal JRE for Aspose.Words using jlink
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), 'jre-builds');
const JDK_DIR = path.join(process.cwd(), 'jdk-downloads');

// Auto-detect available JDK version
function detectAvailableJDK() {
  if (!fs.existsSync(JDK_DIR)) {
    return null;
  }

  // Look for extracted JDK directories
  const dirs = fs.readdirSync(JDK_DIR).filter(d => {
    const fullPath = path.join(JDK_DIR, d);
    return fs.statSync(fullPath).isDirectory() && d.startsWith('jdk-');
  });

  if (dirs.length === 0) {
    return null;
  }

  // Extract version from directory name (e.g., 'jdk-17-windows-x64' -> '17')
  const versions = new Set();
  dirs.forEach(dir => {
    const match = dir.match(/^jdk-(\d+)/);
    if (match) {
      versions.add(match[1]);
    }
  });

  if (versions.size === 0) {
    return null;
  }

  // Prefer environment variable, then highest version available
  const availableVersions = Array.from(versions).sort((a, b) => parseInt(b) - parseInt(a));
  return availableVersions[0];
}

const JDK_VERSION = process.env.JDK_VERSION || detectAvailableJDK() || '21';

// Default modules for Aspose.Words
const DEFAULT_MODULES = 'java.base,java.desktop,java.xml,java.logging,java.naming,java.sql,java.management,jdk.unsupported';

// Auto-detect modules from analysis
let MODULES = DEFAULT_MODULES;
let modulesSource = 'default';

// Check for auto-generated module files from analyze-jar.js
const autoModuleFiles = fs.readdirSync(process.cwd())
  .filter(f => f.endsWith('-modules.txt'))
  .sort((a, b) => {
    // Prefer most recently modified
    const statsA = fs.statSync(a);
    const statsB = fs.statSync(b);
    return statsB.mtimeMs - statsA.mtimeMs;
  });

if (autoModuleFiles.length > 0 && !process.env.MODULES) {
  const latestModuleFile = autoModuleFiles[0];
  try {
    const customModules = fs.readFileSync(latestModuleFile, 'utf-8').trim();
    if (customModules) {
      MODULES = customModules;
      modulesSource = latestModuleFile;
      console.log(`${colors.blue}[AUTO]${colors.reset} Using modules from: ${latestModuleFile}\n`);
    }
  } catch (error) {
    // Ignore, use default
  }
}

// Check for custom-modules.txt (manual override)
if (fs.existsSync('custom-modules.txt') && !process.env.MODULES) {
  try {
    const customModules = fs.readFileSync('custom-modules.txt', 'utf-8').trim();
    if (customModules) {
      MODULES = customModules;
      modulesSource = 'custom-modules.txt';
      console.log(`${colors.blue}[CUSTOM]${colors.reset} Using modules from: custom-modules.txt\n`);
    }
  } catch (error) {
    // Ignore, use default
  }
}

// Allow environment variable override (highest priority)
if (process.env.MODULES) {
  MODULES = process.env.MODULES;
  modulesSource = 'environment variable';
  console.log(`${colors.blue}[ENV]${colors.reset} Using modules from environment variable\n`);
}

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

// Check if JDK exists and has jlink
function checkJdk(platform, jdkPath) {
  if (!fs.existsSync(jdkPath)) {
    log.error(`JDK not found at: ${jdkPath}`);
    log.info('Please run node download-jdks.js first');

    // Show what exists in jdk-downloads for debugging
    if (fs.existsSync(JDK_DIR)) {
      const dirs = fs.readdirSync(JDK_DIR).filter(d =>
        fs.statSync(path.join(JDK_DIR, d)).isDirectory()
      );
      if (dirs.length > 0) {
        log.info(`Available JDK directories: ${dirs.join(', ')}`);
      }
    }

    return false;
  }

  // Check for jlink
  const jlinkPaths = [
    path.join(jdkPath, 'bin', 'jlink'),
    path.join(jdkPath, 'bin', 'jlink.exe'),
    path.join(jdkPath, 'Contents', 'Home', 'bin', 'jlink'), // macOS
  ];

  const jlinkFound = jlinkPaths.some(p => fs.existsSync(p));

  if (!jlinkFound) {
    log.error(`jlink not found in JDK at: ${jdkPath}`);
    log.info('Checked paths:');
    jlinkPaths.forEach(p => log.info(`  - ${p}`));
    return false;
  }

  return true;
}

// Get jlink path
function getJlinkPath(jdkPath) {
  const possiblePaths = [
    path.join(jdkPath, 'bin', 'jlink'),
    path.join(jdkPath, 'bin', 'jlink.exe'),
    path.join(jdkPath, 'Contents', 'Home', 'bin', 'jlink'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
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

// Build JRE
function buildJre(platform, jdkPath, outputName) {
  log.info(`Building JRE for ${platform}...`);

  // Get jlink path
  const jlinkCmd = getJlinkPath(jdkPath);
  if (!jlinkCmd) {
    log.error(`jlink not found for ${platform}`);
    return false;
  }

  const outputPath = path.join(OUTPUT_DIR, outputName);

  // Remove existing output
  if (fs.existsSync(outputPath)) {
    log.info(`Removing existing JRE: ${outputPath}`);
    fs.rmSync(outputPath, { recursive: true, force: true });
  }

  // Build jlink command
  const args = [
    '--add-modules', MODULES,
    '--output', outputPath,
    '--strip-debug',
    '--compress=2',
    '--no-header-files',
    '--no-man-pages',
    '--strip-native-commands'
  ];

  log.info('Running jlink...');

  try {
    // Run jlink
    const result = spawnSync(jlinkCmd, args, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      log.error('jlink failed');
      if (result.stderr) {
        log.error(`stderr: ${result.stderr}`);
      }
      return false;
    }

    // Check if output directory was created
    if (!fs.existsSync(outputPath)) {
      log.error('JRE build failed - output directory not created');
      return false;
    }

    // Calculate size
    const size = getDirectorySize(outputPath);
    log.success(`Built ${platform} JRE: ${formatSize(size)}`);

    return true;
  } catch (error) {
    log.error(`jlink failed for ${platform}: ${error.message}`);
    return false;
  }
}

// Helper function to find JDK path with fallback naming conventions
function findJdkPath(platform, archVariants = []) {
  // Try primary naming convention
  let jdkPath = path.join(JDK_DIR, `jdk-${JDK_VERSION}-${platform}`);
  if (fs.existsSync(jdkPath)) {
    return jdkPath;
  }

  // Try alternative naming conventions
  for (const variant of archVariants) {
    jdkPath = path.join(JDK_DIR, `jdk-${JDK_VERSION}-${variant}`);
    if (fs.existsSync(jdkPath)) {
      return jdkPath;
    }
  }

  // Return primary path even if it doesn't exist (for error reporting)
  return path.join(JDK_DIR, `jdk-${JDK_VERSION}-${platform}`);
}

// Build Windows x64
function buildWindowsX64() {
  log.header('Building Windows x64 JRE');
  const jdkPath = findJdkPath('windows-x64');

  if (!checkJdk('Windows x64', jdkPath)) {
    return false;
  }

  return buildJre('Windows x64', jdkPath, 'jre-win-x64');
}

// Build Windows ARM64
function buildWindowsARM64() {
  log.header('Building Windows ARM64 JRE');
  const jdkPath = findJdkPath('windows-arm64');

  if (!checkJdk('Windows ARM64', jdkPath)) {
    return false;
  }

  return buildJre('Windows ARM64', jdkPath, 'jre-win-arm64');
}

// Build macOS x64
function buildMacOSX64() {
  log.header('Building macOS x64 JRE');
  let jdkPath = path.join(JDK_DIR, `jdk-${JDK_VERSION}-macos-x64`);

  // macOS has Contents/Home structure
  const homePath = path.join(jdkPath, 'Contents', 'Home');
  if (fs.existsSync(homePath)) {
    jdkPath = homePath;
  }

  if (!checkJdk('macOS x64', jdkPath)) {
    return false;
  }

  return buildJre('macOS x64', jdkPath, 'jre-mac-x64');
}

// Build macOS ARM64
function buildMacOSARM64() {
  log.header('Building macOS ARM64 (Apple Silicon) JRE');
  let jdkPath = findJdkPath('macos-arm64', ['macos-aarch64']);

  // macOS has Contents/Home structure
  const homePath = path.join(jdkPath, 'Contents', 'Home');
  if (fs.existsSync(homePath)) {
    jdkPath = homePath;
  }

  if (!checkJdk('macOS ARM64', jdkPath)) {
    return false;
  }

  return buildJre('macOS ARM64', jdkPath, 'jre-mac-arm64');
}

// Build Linux x64
function buildLinuxX64() {
  log.header('Building Linux x64 JRE');
  const jdkPath = path.join(JDK_DIR, `jdk-${JDK_VERSION}-linux-x64`);

  if (!checkJdk('Linux x64', jdkPath)) {
    return false;
  }

  return buildJre('Linux x64', jdkPath, 'jre-linux-x64');
}

// Build Linux ARM64
function buildLinuxARM64() {
  log.header('Building Linux ARM64 JRE');
  const jdkPath = findJdkPath('linux-arm64', ['linux-aarch64']);

  if (!checkJdk('Linux ARM64', jdkPath)) {
    return false;
  }

  return buildJre('Linux ARM64', jdkPath, 'jre-linux-arm64');
}

// Check prerequisites
function checkPrerequisites() {
  log.header('Checking Prerequisites');

  let missing = false;

  // Check JDK directory
  if (!fs.existsSync(JDK_DIR)) {
    log.error(`JDK directory not found: ${JDK_DIR}`);
    log.info('Please run node download-jdks.js first');
    missing = true;
  }

  if (missing) {
    return false;
  }

  log.success('All prerequisites met');
  return true;
}

// Main function
async function main() {
  log.header('Custom JRE Builder for Aspose.Words');

  // Check prerequisites
  if (!checkPrerequisites()) {
    process.exit(1);
  }

  // Create output directory
  ensureDir(OUTPUT_DIR);

  log.info(`JDK Version: ${JDK_VERSION}`);
  log.info(`Modules: ${MODULES}`);
  log.info(`Output Directory: ${OUTPUT_DIR}`);
  console.log();

  // Platform builders
  const builders = {
    'windows-x64': { name: 'Windows x64', fn: buildWindowsX64 },
    'windows-arm64': { name: 'Windows ARM64', fn: buildWindowsARM64 },
    'macos-x64': { name: 'macOS x64', fn: buildMacOSX64 },
    'macos-arm64': { name: 'macOS ARM64', fn: buildMacOSARM64 },
    'linux-x64': { name: 'Linux x64', fn: buildLinuxX64 },
    'linux-arm64': { name: 'Linux ARM64', fn: buildLinuxARM64 },
  };

  // Determine which platforms to build
  if (process.argv.length > 2) {
    const platform = process.argv[2];
    log.info(`Building for specific platform: ${platform}\n`);

    if (!builders[platform]) {
      log.error(`Unknown platform: ${platform}`);
      log.info('Available platforms: ' + Object.keys(builders).join(', '));
      process.exit(1);
    }

    const success = builders[platform].fn();
    process.exit(success ? 0 : 1);
  } else {
    log.info('Building for all platforms...\n');

    // Build all
    const results = {};
    for (const [key, { name, fn }] of Object.entries(builders)) {
      try {
        results[name] = fn();
      } catch (error) {
        log.error(`Failed to build ${name}: ${error.message}`);
        results[name] = false;
      }
    }

    // Summary
    log.header('Build Summary');

    for (const [name, success] of Object.entries(results)) {
      const status = success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      console.log(`${status} ${name}`);
    }

    // Show sizes
    console.log();
    if (fs.existsSync(OUTPUT_DIR)) {
      const dirs = fs.readdirSync(OUTPUT_DIR);
      for (const dir of dirs.sort()) {
        const dirPath = path.join(OUTPUT_DIR, dir);
        if (fs.statSync(dirPath).isDirectory()) {
          const size = getDirectorySize(dirPath);
          console.log(`${colors.green}✓${colors.reset} ${dir}: ${formatSize(size)}`);
        }
      }
    }

    console.log();
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    log.success(`Build complete! ${successCount}/${totalCount} platforms built successfully`);
    log.info(`Custom JREs are in: ${OUTPUT_DIR}`);
    console.log();
    log.info('Next steps:');
    console.log('  1. Test each JRE: ./jre-builds/jre-<platform>/bin/java -version');
    console.log('  2. Create portable versions: node create-portable.js');
    console.log('  3. Distribute to users');

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

module.exports = { buildJre, checkJdk };