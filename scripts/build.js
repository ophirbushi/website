const fs = require('fs');
const path = require('path');
const { ensureDir, copyAssets } = require('./lib/assets');
const { 
  scanPosts, 
  processPage, 
  generatePostsJson, 
  clearPartialsCache 
} = require('./lib/content');

const SRC_DIR = path.join(__dirname, '../src');
const PUBLIC_DIR = path.join(__dirname, '../public');
const PARTIALS_DIR = path.join(SRC_DIR, 'partials');

// Build all pages
function build() {
  console.log('🔨 Building site...');

  // Clear partials cache on each build
  clearPartialsCache();

  // Ensure public directory exists
  ensureDir(PUBLIC_DIR);

  // Scan all posts first
  const posts = scanPosts(SRC_DIR);
  console.log(`📝 Found ${posts.length} posts`);

  // Generate posts JSON for search
  generatePostsJson(posts, PUBLIC_DIR);

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

    const rendered = processPage(pagePath, layoutPath, PARTIALS_DIR, posts);
    fs.writeFileSync(outputPath, rendered);

    console.log(`✅ Built: ${page}`);
  });

  // Process all posts
  const postsDir = path.join(SRC_DIR, 'posts');
  if (fs.existsSync(postsDir)) {
    const publicPostsDir = path.join(PUBLIC_DIR, 'posts');
    ensureDir(publicPostsDir);

    posts.forEach(postData => {
      // Use sourcePath for reading the post content
      const rendered = processPage(postData.sourcePath, layoutPath, PARTIALS_DIR, posts, postData);
      const outputPath = path.join(publicPostsDir, postData.outputFilename);
      
      fs.writeFileSync(outputPath, rendered);

      console.log(`✅ Built post: ${postData.relativePath} → ${postData.outputFilename}`);
    });
  }

  // Copy assets
  copyAssets(SRC_DIR, PUBLIC_DIR);
  console.log('✅ Copied assets');

  console.log('🎉 Build complete!');
}

// Run build
build();

module.exports = { build };