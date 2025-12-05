const fs = require('fs');
const path = require('path');
const glob = require('glob');

const srcDir = path.join(__dirname, '../src');
const outDir = path.join(__dirname, '../public');
const layoutPath = path.join(srcDir, '_layout.html');

// Remove public folder if it exists
if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
    console.log(`Removed ${outDir}`);
}

// Create public folder
fs.mkdirSync(outDir, { recursive: true });
console.log(`Created ${outDir}`);

// Copy style.css from src to public
const styleSrc = path.join(srcDir, 'style.css');
const styleDest = path.join(outDir, 'style.css');
if (fs.existsSync(styleSrc)) {
    fs.copyFileSync(styleSrc, styleDest);
    console.log(`Copied style.css to ${styleDest}`);
}

// Read the layout template
const layout = fs.readFileSync(layoutPath, 'utf8');

// Find all .html files except _layout.html
const htmlFiles = glob.sync('**/*.html', {
    cwd: srcDir,
    nodir: true,
    ignore: ['_layout.html']
});

htmlFiles.forEach(relPath => {
    if (relPath === '_layout.html') return;
    const filePath = path.join(srcDir, relPath);
    const outPath = path.join(outDir, relPath);

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const content = fs.readFileSync(filePath, 'utf8');

    // Extract title from <title> tag if present, else use filename
    let titleMatch = content.match(/<title>(.*?)<\/title>/);
    let title = titleMatch ? titleMatch[1] : path.basename(relPath, '.html');

    // Remove DOCTYPE, html, head, body tags from content
    let mainContent = content
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<html[^>]*>/i, '')
        .replace(/<head>[\s\S]*?<\/head>/i, '')
        .replace(/<body[^>]*>/i, '')
        .replace(/<\/body>/i, '')
        .replace(/<\/html>/i, '')
        .trim();

    // Replace placeholders in layout
    const output = layout
        .replace('{{title}}', title)
        .replace('{{content}}', mainContent);

    fs.writeFileSync(outPath, output);
    console.log(`Built ${outPath}`);
});