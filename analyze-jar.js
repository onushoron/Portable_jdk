#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const JAR_INPUT = process.argv[2];
const JDK_VERSION = process.env.JDK_VERSION || '21';

// Find all JAR files
function findJarFiles(input) {
  if (!input) {
    // Check if 'jars' folder exists
    if (fs.existsSync('jars') && fs.statSync('jars').isDirectory()) {
      const jars = fs.readdirSync('jars')
        .filter(f => f.endsWith('.jar'))
        .map(f => path.join('jars', f));

      if (jars.length > 0) {
        return jars;
      }
    }

    // Check current directory for JARs
    const currentJars = fs.readdirSync('.')
      .filter(f => f.endsWith('.jar') && fs.statSync(f).isFile());

    if (currentJars.length > 0) {
      return currentJars;
    }

    console.error('Error: No JAR files found.');
    console.error('Usage: node analyze-jar.js [jar-file|folder]');
    console.error('       Place JAR files in ./jars/ folder or specify path');
    process.exit(1);
  }

  // Single JAR file specified
  if (fs.existsSync(input)) {
    const stats = fs.statSync(input);

    if (stats.isFile() && input.endsWith('.jar')) {
      return [input];
    }

    if (stats.isDirectory()) {
      const jars = fs.readdirSync(input)
        .filter(f => f.endsWith('.jar'))
        .map(f => path.join(input, f));

      if (jars.length === 0) {
        console.error(`Error: No JAR files found in directory: ${input}`);
        process.exit(1);
      }

      return jars;
    }
  }

  console.error(`Error: Path not found: ${input}`);
  process.exit(1);
}

// Find JDK for analysis
function findJDK() {
  // 1. Try downloaded JDKs
  const downloadedJdk = path.join(__dirname, 'jdk-downloads', `jdk-${JDK_VERSION}-windows-x64`);
  if (fs.existsSync(downloadedJdk)) {
    const jdepsPath = path.join(downloadedJdk, 'bin', 'jdeps.exe');
    if (fs.existsSync(jdepsPath)) {
      return downloadedJdk;
    }
  }

  // 2. Try system JAVA_HOME
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    const jdepsPath = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'jdeps.exe' : 'jdeps');
    if (fs.existsSync(jdepsPath)) {
      return process.env.JAVA_HOME;
    }
  }

  // 3. Try common installation paths
  const commonPaths = [
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.5.11-hotspot',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13.11-hotspot',
    'C:\\Program Files\\Java\\jdk-21',
    'C:\\Program Files\\Java\\jdk-17',
    '/usr/lib/jvm/java-21-openjdk-amd64',
    '/usr/lib/jvm/java-17-openjdk-amd64',
    '/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home',
    '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home'
  ];

  for (const jdkPath of commonPaths) {
    if (fs.existsSync(jdkPath)) {
      const jdepsPath = path.join(jdkPath, 'bin', process.platform === 'win32' ? 'jdeps.exe' : 'jdeps');
      if (fs.existsSync(jdepsPath)) {
        return jdkPath;
      }
    }
  }

  // 4. Try finding via system PATH
  try {
    const javacPath = execSync(process.platform === 'win32' ? 'where javac' : 'which javac',
      { encoding: 'utf8' }).trim().split('\n')[0];
    if (javacPath) {
      const jdkPath = path.dirname(path.dirname(javacPath));
      const jdepsPath = path.join(jdkPath, 'bin', process.platform === 'win32' ? 'jdeps.exe' : 'jdeps');
      if (fs.existsSync(jdepsPath)) {
        return jdkPath;
      }
    }
  } catch (e) {
    // javac not in PATH
  }

  return null;
}

function analyzeJAR(jarPath, jdkPath) {
  const jdeps = path.join(jdkPath, 'bin', process.platform === 'win32' ? 'jdeps.exe' : 'jdeps');

  try {
    // Try with multi-release flag first
    let output;
    try {
      output = execSync(`"${jdeps}" --multi-release 17 --print-module-deps "${jarPath}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    } catch (e) {
      // Fallback without multi-release flag
      output = execSync(`"${jdeps}" --print-module-deps "${jarPath}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    }

    if (!output || output.includes('Error') || output.includes('not found')) {
      return null;
    }

    // Parse modules
    const modules = output.split(',')
      .map(m => m.trim())
      .filter(m => m && !m.startsWith('-') && !m.includes('Error'));

    return modules.length > 0 ? modules : null;

  } catch (error) {
    return null;
  }
}

// Default modules for common application types
const DEFAULT_MODULES = [
  'java.base',
  'java.desktop',
  'java.xml',
  'java.logging',
  'java.naming',
  'java.sql',
  'java.management',
  'jdk.unsupported'
];

function main() {
  console.log('========================================');
  console.log('JAR Module Analyzer (Multi-JAR Support)');
  console.log('========================================\n');

  const jarFiles = findJarFiles(JAR_INPUT);
  const isMultiple = jarFiles.length > 1;

  console.log(`[✓] Found ${jarFiles.length} JAR file${isMultiple ? 's' : ''}:`);
  jarFiles.forEach((jar, idx) => {
    const stats = fs.statSync(jar);
    console.log(`  ${idx + 1}. ${path.basename(jar)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  });
  console.log();

  // Find JDK
  const jdkPath = findJDK();

  const allModules = new Set();
  const jarResults = [];

  if (jdkPath) {
    console.log(`[✓] Found JDK: ${jdkPath}\n`);

    if (isMultiple) {
      console.log('[INFO] Analyzing JARs...');
    }

    jarFiles.forEach((jarFile, idx) => {
      const jarName = path.basename(jarFile);

      if (isMultiple) {
        process.stdout.write(`  [${idx + 1}/${jarFiles.length}] ${jarName}... `);
      } else {
        console.log('[INFO] Analyzing JAR dependencies...');
      }

      const modules = analyzeJAR(jarFile, jdkPath);

      if (modules && modules.length > 0) {
        modules.forEach(m => allModules.add(m));
        jarResults.push({ jar: jarName, modules, success: true });

        if (isMultiple) {
          console.log(`✓ (${modules.length} modules)`);
        } else {
          console.log(`[✓] Detected ${modules.length} required modules\n`);
        }
      } else {
        jarResults.push({ jar: jarName, modules: [], success: false });

        if (isMultiple) {
          console.log('✗ (failed)');
        } else {
          console.log('[WARN] Could not detect modules\n');
        }
      }
    });

    if (isMultiple) console.log();
  } else {
    console.log('[WARN] No JDK found for analysis\n');
  }

  // Determine final module list
  let finalModules;
  let source;

  if (allModules.size > 0) {
    finalModules = Array.from(allModules).sort();
    source = 'jdeps';
  } else {
    console.log('[INFO] Using default module set\n');
    finalModules = DEFAULT_MODULES;
    source = 'default';
  }

  // Save results
  let outputFile;

  if (isMultiple) {
    outputFile = 'combined-modules.txt';
  } else {
    const baseName = path.basename(jarFiles[0], path.extname(jarFiles[0]));
    outputFile = `${baseName}-modules.txt`;
  }

  fs.writeFileSync(outputFile, finalModules.join(','));

  console.log('========================================');
  console.log('Analysis Results');
  console.log('========================================\n');

  if (isMultiple && jdkPath) {
    console.log('Per-JAR Results:');
    jarResults.forEach(result => {
      if (result.success) {
        console.log(`  ✓ ${result.jar}: ${result.modules.length} modules`);
      } else {
        console.log(`  ✗ ${result.jar}: analysis failed`);
      }
    });
    console.log();
  }

  console.log(`Combined Module List (${finalModules.length} modules):`);
  finalModules.forEach(m => console.log(`  - ${m}`));
  console.log(`\nModule String:\n  ${finalModules.join(',')}\n`);
  console.log(`Saved to: ${outputFile}`);
  console.log(`Source: ${source}\n`);

  // Estimate JRE size
  const baseSize = finalModules.includes('java.desktop') ? 45 : 25;
  const extraModules = finalModules.length - 4; // Base has ~4 core modules
  const estimatedSize = baseSize + (extraModules * 2);

  console.log(`Estimated JRE size: ${estimatedSize}-${estimatedSize + 10} MB per platform\n`);

  console.log('Next steps:');
  console.log(`  1. Run: npm run download`);
  console.log(`  2. Run: npm run build-jre`);
  console.log(`  3. Run: npm run build-portable ${jarFiles[0]}\n`);

  if (isMultiple) {
    console.log('Note: For multiple JARs, package them together:');
    console.log(`  - Create a launcher JAR that includes all dependencies`);
    console.log(`  - Or use a build tool (Maven/Gradle) to create an uber-JAR\n`);
  }
}

main();