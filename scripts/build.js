const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const SRC_DIR = path.join(__dirname, '../src');
const PUBLIC_DIR = path.join(__dirname, '../public');
const PARTIALS_DIR = path.join(SRC_DIR, 'partials');

// Cache for partials to avoid reading the same file multiple times
const partialsCache = {};

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

// Extract metadata from HTML comments or YAML frontmatter
function extractMetadata(content, isMarkdown = false) {
  if (isMarkdown) {
    // Parse YAML frontmatter for Markdown files
    const { data } = matter(content);
    return data;
  }

  // Parse HTML comments for HTML files
  const metadata = {};

  const titleMatch = content.match(/<!--\s*title:\s*(.+?)\s*-->/);
  if (titleMatch) metadata.title = titleMatch[1];

  const dateMatch = content.match(/<!--\s*date:\s*(.+?)\s*-->/);
  if (dateMatch) metadata.date = dateMatch[1];

  const excerptMatch = content.match(/<!--\s*excerpt:\s*(.+?)\s*-->/);
  if (excerptMatch) metadata.excerpt = excerptMatch[1];

  const descMatch = content.match(/<!--\s*description:\s*(.+?)\s*-->/);
  if (descMatch) metadata.description = descMatch[1];

  return metadata;
}

// Format date for display (Hebrew format)
function formatDate(dateStr) {
  if (!dateStr) return '';

  // Expecting dd-mm-yyyy
  const [day, month, year] = dateStr.split('-').map(Number);
  if (!day || !month || !year) return dateStr; // fallback if format is wrong

  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const monthName = months[month - 1];
  return `${day} ב${monthName} ${year}`;
}

// Scan posts directory and get all posts with metadata
function scanPosts() {
  const postsDir = path.join(SRC_DIR, 'posts');

  if (!fs.existsSync(postsDir)) {
    return [];
  }

  const posts = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.html') || f.endsWith('.md'))
    .map(filename => {
      const filePath = path.join(postsDir, filename);
      const content = readFile(filePath);
      const isMarkdown = filename.endsWith('.md');
      const metadata = extractMetadata(content, isMarkdown);
      
      // Generate output filename (always .html)
      const outputFilename = isMarkdown 
        ? filename.replace('.md', '.html')
        : filename;

      return {
        filename,
        outputFilename,
        isMarkdown,
        slug: filename.replace(/\.(html|md)$/, ''),
        url: `/posts/${outputFilename}`,
        title: metadata.title || filename.replace(/\.(html|md)$/, ''),
        date: metadata.date || '',
        excerpt: metadata.excerpt || '',
        ...metadata
      };
    })
    .sort((a, b) => {
      // Sort by date descending (newest first)
      if (!a.date || !b.date) return 0;
      return new Date(b.date) - new Date(a.date);
    });

  return posts;
}

// Generate HTML for post list
function generatePostList(posts, limit = null) {
  const postsToShow = limit ? posts.slice(0, limit) : posts;

  return `<ul class="post-list">
${postsToShow.map(post => `  <li>
    <a href="${post.url}">
      <span class="post-title">${post.title}</span>
      <span class="post-date">${post.date}</span>
    </a>
  </li>`).join('\n')}
</ul>`;
}

// Load a partial from the partials directory
function loadPartial(name) {
  // Check cache first
  if (partialsCache[name]) {
    return partialsCache[name];
  }

  const partialPath = path.join(PARTIALS_DIR, `${name}.html`);

  if (!fs.existsSync(partialPath)) {
    console.warn(`⚠️  Partial not found: ${name}.html`);
    return `<!-- Partial not found: ${name} -->`;
  }

  const content = readFile(partialPath);
  partialsCache[name] = content;
  return content;
}

// Process partials in content
function processPartials(content) {
  // Match {{partial:name}} patterns
  const partialRegex = /\{\{partial:([a-zA-Z0-9-_]+)\}\}/g;

  return content.replace(partialRegex, (match, partialName) => {
    return loadPartial(partialName);
  });
}

// Process post lists in content
function processPostLists(content, posts) {
  // Match {{posts}} or {{posts:N}} patterns
  content = content.replace(/\{\{posts(?::(\d+))?\}\}/g, (match, limit) => {
    const maxPosts = limit ? parseInt(limit) : null;
    return generatePostList(posts, maxPosts);
  });

  return content;
}

// Simple template engine
function renderTemplate(content, layout, data = {}) {
  // First, process partials in the content
  content = processPartials(content);

  // Replace {{content}} in layout with page content
  let output = layout.replace('{{content}}', content);

  // Process partials in the layout too
  output = processPartials(output);

  // Replace all {{key}} with data values
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    output = output.replace(regex, data[key]);
  });

  return output;
}

// Process a single page
function processPage(pagePath, layoutPath, posts = [], postData = null) {
  const pageContent = readFile(pagePath);
  const isMarkdown = postData && postData.isMarkdown;
  
  let processedContent;
  let metadata;

  if (isMarkdown) {
    // Parse Markdown with frontmatter
    const { data, content } = matter(pageContent);
    metadata = data;
    
    // Convert Markdown to HTML
    let htmlContent = marked(content);
    
    // Extract leading image if present (for better formatting like HTML posts)
    let leadingImage = '';
    const imgMatch = htmlContent.match(/^<p>(<img[^>]+>)<\/p>\s*/);
    if (imgMatch) {
      leadingImage = '    ' + imgMatch[1] + '\n\n';
      htmlContent = htmlContent.replace(imgMatch[0], '');
    }
    
    // Add proper indentation to HTML content for better readability
    const indentedContent = htmlContent
      .split('\n')
      .map(line => line.trim() ? '        ' + line : '')
      .join('\n');
    
    // Wrap in article structure if it's a post
    if (postData) {
      processedContent = `<article>
    <header>
        <h1>${postData.title}</h1>
        <p class="meta">${formatDate(postData.date)}</p>
    </header>

${leadingImage}    <div class="prose">
${indentedContent}
    </div>

    {{partial:back-to-blog}}
</article>`;
    } else {
      processedContent = htmlContent;
    }
  } else {
    // HTML file processing
    processedContent = pageContent;
    metadata = extractMetadata(processedContent, false);
    
    // Check if page specifies no layout (<!-- layout: none -->)
    const layoutMatch = processedContent.match(/<!--\s*layout:\s*(.+?)\s*-->/);
    const useLayout = !layoutMatch || layoutMatch[1].trim().toLowerCase() !== 'none';
    
    // Process post lists first
    processedContent = processPostLists(processedContent, posts);

    // If this is a post, inject post variables
    if (postData) {
      processedContent = processedContent.replace(/\{\{post\.title\}\}/g, postData.title);
      processedContent = processedContent.replace(/\{\{post\.date\}\}/g, formatDate(postData.date));
      processedContent = processedContent.replace(/\{\{post\.excerpt\}\}/g, postData.excerpt || '');
    }

    // If no layout, still process partials
    if (!useLayout) {
      return processPartials(processedContent);
    }
  }

  const layout = readFile(layoutPath);
  const title = [metadata.title || (postData && postData.title), 'ישוע בלוג'].filter(seg => seg).join(' | ');
  const description = metadata.description || '';

  // Render the page
  return renderTemplate(processedContent, layout, {
    title,
    description,
    year: new Date().getFullYear()
  });
}

// Copy static assets
function copyAssets() {
  const assetDirs = ['styles', 'js'];

  for (let dirName of assetDirs) {
    const assetsDir = path.join(SRC_DIR, dirName);
    const publicDir = path.join(PUBLIC_DIR, dirName);

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
}

// Generate posts JSON for client-side search
function generatePostsJson(posts) {
  const searchData = posts.map(post => {
    // Read the post content to include in search
    const postPath = path.join(SRC_DIR, 'posts', post.filename);
    const content = readFile(postPath);
    
    let plainText;
    if (post.isMarkdown) {
      // For Markdown, extract content without frontmatter
      const { content: mdContent } = matter(content);
      plainText = mdContent.replace(/[#*_`\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      // Strip HTML tags for plain text search
      plainText = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return {
      title: post.title,
      url: post.url,
      date: post.date,
      excerpt: post.excerpt,
      content: plainText.substring(0, 1000) // Limit content length
    };
  });

  const jsonPath = path.join(PUBLIC_DIR, 'posts.json');
  fs.writeFileSync(jsonPath, JSON.stringify(searchData, null, 2));
  console.log('✅ Generated posts.json');
}

// Build all pages
function build() {
  console.log('🔨 Building site...');

  // Clear partials cache on each build
  Object.keys(partialsCache).forEach(key => delete partialsCache[key]);

  // Ensure public directory exists
  ensureDir(PUBLIC_DIR);

  // Scan all posts first
  const posts = scanPosts();
  console.log(`📝 Found ${posts.length} posts`);

  // Generate posts JSON for search
  generatePostsJson(posts);

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

    const rendered = processPage(pagePath, layoutPath, posts);
    fs.writeFileSync(outputPath, rendered);

    console.log(`✅ Built: ${page}`);
  });

  // Process all posts
  const postsDir = path.join(SRC_DIR, 'posts');
  if (fs.existsSync(postsDir)) {
    const publicPostsDir = path.join(PUBLIC_DIR, 'posts');
    ensureDir(publicPostsDir);

    posts.forEach(postData => {
      const postPath = path.join(postsDir, postData.filename);
      const outputPath = path.join(publicPostsDir, postData.outputFilename);

      const rendered = processPage(postPath, layoutPath, posts, postData);
      fs.writeFileSync(outputPath, rendered);

      console.log(`✅ Built post: ${postData.filename} → ${postData.outputFilename}`);
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