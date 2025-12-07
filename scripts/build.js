const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const PUBLIC_DIR = path.join(__dirname, '../public');

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

// Simple template engine
function renderTemplate(content, layout, data = {}) {
  // Replace {{content}} in layout with page content
  let output = layout.replace('{{content}}', content);
  
  // Replace all {{key}} with data values
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    output = output.replace(regex, data[key]);
  });
  
  return output;
}

// Process a single page
function processPage(pagePath, layoutPath) {
  const pageContent = readFile(pagePath);
  
  // Check if page specifies no layout (<!-- layout: none -->)
  const layoutMatch = pageContent.match(/<!--\s*layout:\s*(.+?)\s*-->/);
  const useLayout = !layoutMatch || layoutMatch[1].trim().toLowerCase() !== 'none';
  
  // If no layout, return content as-is
  if (!useLayout) {
    return pageContent;
  }
  
  const layout = readFile(layoutPath);
  
  // Extract title from page (look for <!-- title: ... --> comment)
  const titleMatch = pageContent.match(/<!--\s*title:\s*(.+?)\s*-->/);
  const title = titleMatch ? titleMatch[1] : 'My Site';
  
  // Extract any other metadata
  const descMatch = pageContent.match(/<!--\s*description:\s*(.+?)\s*-->/);
  const description = descMatch ? descMatch[1] : '';
  
  // Render the page
  return renderTemplate(pageContent, layout, {
    title,
    description,
    year: new Date().getFullYear()
  });
}

// Copy static assets
function copyAssets() {
  const stylesDir = path.join(SRC_DIR, 'styles');
  const publicStylesDir = path.join(PUBLIC_DIR, 'styles');
  
  ensureDir(publicStylesDir);
  
  if (fs.existsSync(stylesDir)) {
    const files = fs.readdirSync(stylesDir);
    files.forEach(file => {
      fs.copyFileSync(
        path.join(stylesDir, file),
        path.join(publicStylesDir, file)
      );
    });
  }
}

// Build all pages
function build() {
  console.log('🔨 Building site...');
  
  // Ensure public directory exists
  ensureDir(PUBLIC_DIR);
  
  // Get layout
  const layoutPath = path.join(SRC_DIR, 'layouts', 'main.html');
  if (!fs.existsSync(layoutPath)) {
    console.error('❌ Layout file not found:', layoutPath);
    return;
  }
  
  // Process all pages
  const pagesDir = path.join(SRC_DIR, 'pages');
  if (!fs.existsSync(pagesDir)) {
    console.error('❌ Pages directory not found:', pagesDir);
    return;
  }
  
  const pages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  
  pages.forEach(page => {
    const pagePath = path.join(pagesDir, page);
    const outputPath = path.join(PUBLIC_DIR, page);
    
    const rendered = processPage(pagePath, layoutPath);
    fs.writeFileSync(outputPath, rendered);
    
    console.log(`✅ Built: ${page}`);
  });
  
  // Process all posts
  const postsDir = path.join(SRC_DIR, 'posts');
  if (fs.existsSync(postsDir)) {
    const publicPostsDir = path.join(PUBLIC_DIR, 'posts');
    ensureDir(publicPostsDir);
    
    const posts = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));
    
    posts.forEach(post => {
      const postPath = path.join(postsDir, post);
      const outputPath = path.join(publicPostsDir, post);
      
      const rendered = processPage(postPath, layoutPath);
      fs.writeFileSync(outputPath, rendered);
      
      console.log(`✅ Built post: ${post}`);
    });
  }
  
  // Copy assets
  copyAssets();
  console.log('✅ Copied styles');
  
  console.log('🎉 Build complete!');
}

// Run build
build();

module.exports = { build };
