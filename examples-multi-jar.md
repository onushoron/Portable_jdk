# Multi-JAR Analysis Examples

## 📦 Example 1: Single JAR

```bash
# Analyze
npm run analyze aspose-words-23.12.jar

# Output:
# Found 1 JAR file:
#   1. aspose-words-23.12.jar (16.68 MB)
# 
# Detected Modules (8):
#   - java.base
#   - java.desktop
#   - java.xml
#   - java.logging
#   - java.naming
#   - java.sql
#   - java.management
#   - jdk.unsupported
#
# Saved to: aspose-words-23.12-modules.txt
```

## 📦 Example 2: Multiple JARs in Folder

```bash
# Setup
mkdir jars
copy app.jar jars\
copy postgresql-42.7.1.jar jars\
copy jackson-databind-2.16.0.jar jars\

# Analyze
npm run analyze:folder

# Output:
# Found 3 JAR files:
#   1. app.jar (2.5 MB)
#   2. postgresql-42.7.1.jar (1.2 MB)
#   3. jackson-databind-2.16.0.jar (1.8 MB)
#
# Analyzing JARs...
#   [1/3] app.jar... ✓ (6 modules)
#   [2/3] postgresql-42.7.1.jar... ✓ (4 modules)
#   [3/3] jackson-databind-2.16.0.jar... ✓ (3 modules)
#
# Per-JAR Results:
#   ✓ app.jar: 6 modules
#   ✓ postgresql-42.7.1.jar: 4 modules
#   ✓ jackson-databind-2.16.0.jar: 3 modules
#
# Combined Module List (8 modules):
#   - java.base
#   - java.desktop
#   - java.logging
#   - java.naming
#   - java.sql
#   - java.xml
#   - jdk.crypto.ec
#   - jdk.unsupported
#
# Saved to: combined-modules.txt
```

## 📦 Example 3: Entire Application Stack

**Scenario:** Spring Boot app with multiple dependencies

```bash
# Structure
jars/
├── myapp-1.0.0.jar
├── spring-boot-3.2.0.jar
├── spring-web-6.1.0.jar
├── tomcat-embed-core-10.1.0.jar
├── jackson-databind-2.16.0.jar
├── hibernate-core-6.4.0.jar
└── postgresql-42.7.1.jar

# Analyze
npm run analyze:folder

# Result: combined-modules.txt with ~12 unique modules
# JRE size: ~55 MB (instead of 300 MB full JDK)
```

## 📦 Example 4: Auto-Detection

```bash
# Just place JARs in ./jars/ and run
npm run analyze

# Automatically finds and analyzes all JARs
```

## 📦 Example 5: Command-Line Options

```bash
# Analyze specific JAR
node analyze-jar.js myapp.jar

# Analyze folder
node analyze-jar.js ./libs

# Analyze with custom JDK version
JDK_VERSION=17 node analyze-jar.js myapp.jar
```

## 📊 Module Deduplication

The analyzer automatically combines and deduplicates modules:

```
JAR 1: java.base, java.sql, java.logging
JAR 2: java.base, java.xml, java.logging  
JAR 3: java.base, java.desktop

Combined: java.base, java.sql, java.logging, java.xml, java.desktop
(5 unique modules instead of 9 total)
```

## 🎯 Best Practices

### 1. Analyze Before Building

```bash
# Always analyze first to get optimal module list
npm run analyze:folder
npm run build-jre
```

### 2. Include All Runtime Dependencies

```bash
# Include both your app and all runtime JARs
jars/
├── your-app.jar          # Your application
├── lib1.jar              # Runtime dependency
├── lib2.jar              # Runtime dependency
└── driver.jar            # Database driver
```

### 3. Test the Generated JRE

```bash
# After building portable package, test it
cd portable-releases
unzip your-app-*-windows-x64-portable.zip
cd your-app-*/

# Test JRE
jre\bin\java.exe -version

# Test with your app
jre\bin\java.exe -jar your-app.jar
```

### 4. Exclude Build-Time Dependencies

Only include JARs needed at **runtime**:
- ✅ Include: JDBC drivers, HTTP clients, JSON parsers
- ❌ Exclude: Test frameworks (JUnit), build tools (Maven plugins)

## 🔧 Advanced Usage

### Custom Module Addition

```bash
# Analyze
npm run analyze:folder

# Add extra modules manually
echo java.base,java.xml,java.sql,java.security.jgss > custom-modules.txt

# Build with custom list
npm run build-jre
```

### Selective Analysis

```bash
# Only analyze specific JARs
node analyze-jar.js app.jar,lib1.jar,lib2.jar
```

### Module Priority

Build system checks in this order:
1. Environment variable (`MODULES=...`)
2. `custom-modules.txt`
3. `combined-modules.txt` (from multi-JAR analysis)
4. `your-app-modules.txt` (from single JAR analysis)
5. Default module set

## 📝 Output Files

- **Single JAR**: `your-app-modules.txt`
- **Multiple JARs**: `combined-modules.txt`
- **Manual override**: `custom-modules.txt`

All files use the same format: comma-separated module names.

## 🚨 Troubleshooting

### "Analysis failed" for some JARs

Some JARs (like test JARs) may fail analysis. This is normal:

```bash
# Output:
Per-JAR Results:
  ✓ app.jar: 6 modules
  ✗ test-utils.jar: analysis failed  # OK to ignore
  ✓ lib.jar: 4 modules
```

The combined list will still include modules from successful analyses.

### Missing modules at runtime

If your app fails with `NoClassDefFoundError`:

```bash
# Manually add the missing module
echo java.base,java.xml,...,java.security.jgss > custom-modules.txt
npm run build-jre
```

### Too many modules detected

Some JARs reference optional dependencies. You can:
1. Use the auto-detected list (safe but larger)
2. Manually create `custom-modules.txt` with only required modules
3. Test and iterate

## 🎉 Real-World Example

**Complete workflow for complex app:**

```bash
# 1. Organize dependencies
mkdir jars
copy target\myapp.jar jars\
copy lib\*.jar jars\

# 2. Analyze all JARs
npm run analyze:folder

# Result: combined-modules.txt (12 modules, ~55 MB JRE)

# 3. Review and optimize (optional)
notepad combined-modules.txt
# Remove unnecessary modules if you know what you're doing

# 4. Build for all platforms
npm run download
npm run build-jre

# 5. Create portable packages
npm run build-portable myapp.jar

# 6. Test on target platform
# Extract and run on Windows, Mac, Linux
```

Result: 6 portable packages, each ~70 MB (55 MB JRE + 15 MB app), ready to distribute! 🚀
