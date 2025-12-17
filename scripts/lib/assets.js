const fs = require('fs');
const path = require('path');

// Helper to read file
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

// Helper to ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Resolve CSS @import statements recursively
function resolveCssImports(cssFilePath, baseDir) {
  const content = readFile(cssFilePath);
  const importRegex = /@import\s+['"](.+?)['"]\s*;/g;

  let resolved = content.replace(importRegex, (match, importPath) => {
    // Resolve relative path
    const resolvedPath = path.resolve(path.dirname(cssFilePath), importPath);

    if (fs.existsSync(resolvedPath)) {
      // Recursively resolve imports in the imported file
      const importedContent = resolveCssImports(resolvedPath, baseDir);
      return `\n/* === Imported from ${importPath} === */\n${importedContent}\n`;
    } else {
      console.warn(`⚠️  CSS import not found: ${importPath}`);
      return `/* Import not found: ${importPath} */`;
    }
  });

  return resolved;
}

// Copy and process CSS files
function processCss(srcDir, publicDir) {
  const stylesDir = path.join(srcDir, 'styles');
  const publicStylesDir = path.join(publicDir, 'styles');
  ensureDir(publicStylesDir);

  if (fs.existsSync(stylesDir)) {
    const mainCssPath = path.join(stylesDir, 'main.css');
    if (fs.existsSync(mainCssPath)) {
      const bundledCss = resolveCssImports(mainCssPath, stylesDir);
      fs.writeFileSync(path.join(publicStylesDir, 'main.css'), bundledCss);
    }
  }
}

// Copy JS files
function copyJs(srcDir, publicDir) {
  const jsDir = path.join(srcDir, 'js');
  const publicJsDir = path.join(publicDir, 'js');

  ensureDir(publicJsDir);

  if (fs.existsSync(jsDir)) {
    const files = fs.readdirSync(jsDir);
    files.forEach(file => {
      fs.copyFileSync(
        path.join(jsDir, file),
        path.join(publicJsDir, file)
      );
    });
  }
}


/** copy directly to public */
function copyStaticAssetsDir(srcDir, publicDir) {
  const assetsDir = path.join(srcDir, 'assets');

  ensureDir(publicDir);

  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    files.forEach(file => {
      fs.copyFileSync(
        path.join(assetsDir, file),
        path.join(publicDir, file)
      );
    });
  }
}

// Copy all static assets
function copyAssets(srcDir, publicDir) {
  copyStaticAssetsDir(srcDir, publicDir);
  copyJs(srcDir, publicDir);
  processCss(srcDir, publicDir);
}

module.exports = {
  readFile,
  ensureDir,
  resolveCssImports,
  copyStaticAssetsDir,
  processCss,
  copyJs,
  copyAssets
};
