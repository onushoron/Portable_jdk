#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const AdmZip = require('adm-zip');
const tar = require('tar');

const JDK_VERSION = process.env.JDK_VERSION || process.argv[2] || '21';
const DOWNLOAD_DIR = './jdk-downloads';

// JDK version configurations (Adoptium/Temurin releases)
const VERSION_CONFIG = {
  '11': { release: 'jdk-11.0.25%2B9', version: '11.0.25_9', prefix: 'OpenJDK11U' },
  '16': { release: 'jdk-16.0.2%2B7', version: '16.0.2_7', prefix: 'OpenJDK16U' },
  '17': { release: 'jdk-17.0.13%2B11', version: '17.0.13_11', prefix: 'OpenJDK17U' },
  '18': { release: 'jdk-18.0.2.1%2B1', version: '18.0.2.1_1', prefix: 'OpenJDK18U' },
  '19': { release: 'jdk-19.0.2%2B7', version: '19.0.2_7', prefix: 'OpenJDK19U' },
  '20': { release: 'jdk-20.0.2%2B9', version: '20.0.2_9', prefix: 'OpenJDK20U' },
  '21': { release: 'jdk-21.0.5%2B11', version: '21.0.5_11', prefix: 'OpenJDK21U' }
};

// Generate platform configurations dynamically
function getPlatformConfig() {
  const config = VERSION_CONFIG[JDK_VERSION];
  if (!config) {
    console.error(`Unsupported JDK version: ${JDK_VERSION}`);
    console.error(`Supported versions: ${Object.keys(VERSION_CONFIG).join(', ')}`);
    process.exit(1);
  }

  const baseUrl = `https://github.com/adoptium/temurin${JDK_VERSION}-binaries/releases/download/${config.release}`;

  return {
    'windows-x64': {
      url: `${baseUrl}/${config.prefix}-jdk_x64_windows_hotspot_${config.version}.zip`,
      type: 'zip',
      jdkPath: (extractDir) => {
        const entries = fs.readdirSync(extractDir);
        const jdkDir = entries.find(e => e.startsWith('jdk-'));
        return jdkDir ? path.join(extractDir, jdkDir) : extractDir;
      }
    },
    'windows-arm64': {
      url: `${baseUrl}/${config.prefix}-jdk_aarch64_windows_hotspot_${config.version}.zip`,
      type: 'zip',
      jdkPath: (extractDir) => {
        const entries = fs.readdirSync(extractDir);
        const jdkDir = entries.find(e => e.startsWith('jdk-'));
        return jdkDir ? path.join(extractDir, jdkDir) : extractDir;
      }
    },
    'macos-x64': {
      url: `${baseUrl}/${config.prefix}-jdk_x64_mac_hotspot_${config.version}.tar.gz`,
      type: 'tar.gz',
      jdkPath: (extractDir) => {
        const entries = fs.readdirSync(extractDir);
        const jdkDir = entries.find(e => e.startsWith('jdk-'));
        if (jdkDir) {
          const contentsHome = path.join(extractDir, jdkDir, 'Contents', 'Home');
          if (fs.existsSync(contentsHome)) return contentsHome;
        }
        return extractDir;
      }
    },
    'macos-arm64': {
      url: `${baseUrl}/${config.prefix}-jdk_aarch64_mac_hotspot_${config.version}.tar.gz`,
      type: 'tar.gz',
      jdkPath: (extractDir) => {
        const entries = fs.readdirSync(extractDir);
        const jdkDir = entries.find(e => e.startsWith('jdk-'));
        if (jdkDir) {
          const contentsHome = path.join(extractDir, jdkDir, 'Contents', 'Home');
          if (fs.existsSync(contentsHome)) return contentsHome;
        }
        return extractDir;
      }
    },
    'linux-x64': {
      url: `${baseUrl}/${config.prefix}-jdk_x64_linux_hotspot_${config.version}.tar.gz`,
      type: 'tar.gz',
      jdkPath: (extractDir) => {
        const entries = fs.readdirSync(extractDir);
        const jdkDir = entries.find(e => e.startsWith('jdk-'));
        return jdkDir ? path.join(extractDir, jdkDir) : extractDir;
      }
    },
    'linux-arm64': {
      url: `${baseUrl}/${config.prefix}-jdk_aarch64_linux_hotspot_${config.version}.tar.gz`,
      type: 'tar.gz',
      jdkPath: (extractDir) => {
        const entries = fs.readdirSync(extractDir);
        const jdkDir = entries.find(e => e.startsWith('jdk-'));
        return jdkDir ? path.join(extractDir, jdkDir) : extractDir;
      }
    }
  };
}

const PLATFORMS = getPlatformConfig();


// Create download directory
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const file = fs.createWriteStream(dest);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let lastProgress = 0;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }

      totalBytes = parseInt(response.headers['content-length'], 10);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = Math.floor((downloadedBytes / totalBytes) * 100);

        if (progress !== lastProgress && progress % 10 === 0) {
          process.stdout.write(`\r  [INFO] Progress: ${progress}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})`);
          lastProgress = progress;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        process.stdout.write('\r  [✓] Downloaded: ' + formatBytes(downloadedBytes) + '                \n');
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });

    file.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function extractZip(archivePath, extractDir) {
  console.log('  [INFO] Extracting ZIP...');
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(extractDir, true);
  console.log('  [✓] Extracted');
}

function extractTarGz(archivePath, extractDir) {
  return new Promise((resolve, reject) => {
    console.log('  [INFO] Extracting TAR.GZ...');
    console.log('  [INFO]   (This may take a moment...)');

    tar.x({
      file: archivePath,
      cwd: extractDir,
      strict: false,
      preservePaths: false,
      filter: (path, entry) => {
        // Skip symlinks on Windows
        if (process.platform === 'win32' && entry.type === 'SymbolicLink') {
          return false;
        }
        return true;
      },
      onwarn: (message, data) => {
        // Ignore warnings about symlinks and other non-critical issues
        if (!message.includes('unsupported entry type') &&
          !message.includes('invalid entry')) {
          console.warn('  [WARN]', message);
        }
      },
      onentry: (entry) => {
        // Log progress for large files (optional)
        if (entry.size > 10 * 1024 * 1024) { // > 10MB
          console.log(`  [INFO]   Extracting: ${entry.path}`);
        }
      }
    })
      .then(() => {
        console.log('  [✓] Extracted');
        resolve();
      })
      .catch(reject);
  });
}

async function downloadAndExtractPlatform(platform, config) {
  const archiveName = path.basename(new URL(config.url).pathname);
  const archivePath = path.join(DOWNLOAD_DIR, archiveName);
  const extractDir = path.join(DOWNLOAD_DIR, `jdk-${JDK_VERSION}-${platform}-temp`);
  const finalDir = path.join(DOWNLOAD_DIR, `jdk-${JDK_VERSION}-${platform}`);

  console.log(`\n[${Object.keys(PLATFORMS).indexOf(platform) + 1}/${Object.keys(PLATFORMS).length}] ${platform}:`);

  // Determine correct jlink executable name for target platform (not host)
  const isWindowsPlatform = platform.includes('windows');
  const jlinkExe = isWindowsPlatform ? 'jlink.exe' : 'jlink';

  // Check if final directory exists and is valid
  if (fs.existsSync(finalDir)) {
    const jdkPath = config.jdkPath(finalDir);
    const jlinkPath = path.join(jdkPath, 'bin', jlinkExe);

    if (fs.existsSync(jlinkPath)) {
      console.log('  [✓] Already exists and verified');
      return;
    } else {
      console.log('  [INFO] Existing installation invalid, re-extracting...');
      fs.rmSync(finalDir, { recursive: true, force: true });
    }
  }

  // Download if needed
  if (!fs.existsSync(archivePath) || fs.statSync(archivePath).size < 1024 * 1024) {
    console.log('  [INFO] Downloading...');
    try {
      await downloadFile(config.url, archivePath);
    } catch (error) {
      console.error(`  [✗] Download failed: ${error.message}`);
      return;
    }
  } else {
    console.log('  [INFO] Archive already downloaded');
  }

  // Clean temp extraction directory
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });

  // Extract
  try {
    if (config.type === 'zip') {
      extractZip(archivePath, extractDir);
    } else if (config.type === 'tar.gz') {
      await extractTarGz(archivePath, extractDir);
    }

    // Debug: Show what was extracted
    console.log('  [INFO] Checking extracted contents...');
    const extractedItems = fs.readdirSync(extractDir);
    console.log(`  [DEBUG] Found ${extractedItems.length} items: ${extractedItems.join(', ')}`);

    // Find and move JDK to final location
    const jdkPath = config.jdkPath(extractDir);

    if (!fs.existsSync(jdkPath)) {
      console.log(`  [DEBUG] JDK path not found: ${jdkPath}`);
      console.log('  [DEBUG] Looking for alternative paths...');

      // List contents to help debug
      extractedItems.forEach(item => {
        const itemPath = path.join(extractDir, item);
        if (fs.statSync(itemPath).isDirectory()) {
          console.log(`  [DEBUG]   Directory: ${item}`);
          try {
            const subItems = fs.readdirSync(itemPath);
            console.log(`  [DEBUG]     Contains: ${subItems.slice(0, 5).join(', ')}...`);
          } catch (e) { }
        }
      });

      throw new Error('JDK directory not found after extraction');
    }

    console.log(`  [INFO] Found JDK at: ${path.basename(jdkPath)}`);

    // Verify jlink exists (use correct executable name for target platform)
    const jlinkPath = path.join(jdkPath, 'bin', jlinkExe);
    if (!fs.existsSync(jlinkPath)) {
      console.log(`  [DEBUG] jlink not found at: ${jlinkPath}`);
      throw new Error(`jlink not found in extracted JDK (looking for ${jlinkExe})`);
    }

    console.log(`  [✓] Verified: ${jlinkExe} exists`);

    // Move to final location
    if (fs.existsSync(finalDir)) {
      fs.rmSync(finalDir, { recursive: true, force: true });
    }
    fs.renameSync(jdkPath, finalDir);

    // Clean up temp directory
    fs.rmSync(extractDir, { recursive: true, force: true });

    console.log(`  [✓] Ready at: ${finalDir}`);

  } catch (error) {
    console.error(`  [✗] Extraction failed: ${error.message}`);
    // Clean up on failure
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
  }
}

async function main() {
  console.log('========================================');
  console.log(`JDK ${JDK_VERSION} Downloader`);
  console.log('========================================\n');

  for (const [platform, config] of Object.entries(PLATFORMS)) {
    await downloadAndExtractPlatform(platform, config);
  }

  console.log('\n========================================');
  console.log('Download Complete!');
  console.log('========================================\n');
}

main().catch(console.error);