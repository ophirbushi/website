const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');
const { readFile } = require('./assets');

// Cache for partials to avoid reading the same file multiple times
const partialsCache = {};

// Extract metadata from HTML comments or YAML frontmatter
function extractMetadata(content, isMarkdown = false) {
  if (isMarkdown) {
    // Parse YAML frontmatter for Markdown files
    const { data } = matter(content);
    
    // Support both Hebrew and English field names
    const normalizedData = {};
    
    // Title: support 'title' or 'כותרת'
    normalizedData.title = data.title || data['כותרת'];
    
    // Date: support 'date' or 'תאריך'
    normalizedData.date = data.date || data['תאריך'];
    
    // Excerpt: support 'excerpt' or 'תקציר'
    normalizedData.excerpt = data.excerpt || data['תקציר'];
    
    // Description: support 'description' or 'תיאור'
    normalizedData.description = data.description || data['תיאור'];
    
    // Tags: support 'tags' or 'תגיות'
    normalizedData.tags = data.tags || data['תגיות'];
    
    // Thumbnail: support 'thumbnail' or 'מזעורית'
    normalizedData.thumbnail = data.thumbnail || data['מזעורית'];
    
    // Copy any other fields as-is
    Object.keys(data).forEach(key => {
      if (!normalizedData[key] && !['כותרת', 'תאריך', 'תקציר', 'תיאור', 'תגיות', 'מזעורית'].includes(key)) {
        normalizedData[key] = data[key];
      }
    });
    
    return normalizedData;
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

// Recursively find all posts in directory and subdirectories
function findPostsRecursively(dir, baseDir, prefix = '') {
  const results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Recursively scan subdirectories
      const newPrefix = prefix ? `${prefix}-${item.name}` : item.name;
      results.push(...findPostsRecursively(fullPath, baseDir, newPrefix));
    } else if (item.name.endsWith('.html') || item.name.endsWith('.md')) {
      // Get relative path from baseDir for reference
      const relativePath = path.relative(baseDir, fullPath);
      
      // Generate output filename with folder prefix
      const baseFilename = item.name.replace(/\.(html|md)$/, '');
      const outputFilename = prefix 
        ? `${prefix}-${baseFilename}.html`
        : `${baseFilename}.html`;
      
      results.push({
        sourcePath: fullPath,
        relativePath,
        filename: item.name,
        outputFilename,
        prefix
      });
    }
  }

  return results;
}

// Scan posts directory and get all posts with metadata
function scanPosts(srcDir) {
  const postsDir = path.join(srcDir, 'posts');

  if (!fs.existsSync(postsDir)) {
    return [];
  }

  // Find all posts recursively
  const postFiles = findPostsRecursively(postsDir, postsDir);

  const posts = postFiles.map(postFile => {
    const content = readFile(postFile.sourcePath);
    const isMarkdown = postFile.filename.endsWith('.md');
    const metadata = extractMetadata(content, isMarkdown);

    return {
      filename: postFile.filename,
      sourcePath: postFile.sourcePath,
      relativePath: postFile.relativePath,
      outputFilename: postFile.outputFilename,
      isMarkdown,
      slug: postFile.filename.replace(/\.(html|md)$/, ''),
      url: `/posts/${postFile.outputFilename}`,
      title: metadata.title || postFile.filename.replace(/\.(html|md)$/, ''),
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

// Generate HTML for post list (simple list for blog page)
function generatePostList(posts, limit = null) {
  const postsToShow = limit ? posts.slice(0, limit) : posts;

  return `<ul class="post-list">
${postsToShow.map(post => `  <li>
    <a href="${post.url}">
      <span class="post-title">${post.title}</span>
      <span class="post-date">${formatDate(post.date)}</span>
    </a>
  </li>`).join('\n')}
</ul>`;
}

// Generate HTML for post grid (card layout for homepage)
function generatePostGrid(posts, limit = null) {
  const postsToShow = limit ? posts.slice(0, limit) : posts;

  return `<ul class="post-grid">
${postsToShow.map(post => `  <li>
    <a href="${post.url}">
      <div class="post-card-image">
        ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${post.title}">` : `<svg class="post-card-image-placeholder" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>`}
      </div>
      <div class="post-card-content">
        <div class="post-card-title">${post.title}</div>
        ${post.excerpt ? `<div class="post-card-excerpt">${post.excerpt}</div>` : ''}
        <div class="post-card-date">${formatDate(post.date)}</div>
      </div>
    </a>
  </li>`).join('\n')}
</ul>`;
}

// Load a partial from the partials directory
function loadPartial(partialsDir, name) {
  // Check cache first
  if (partialsCache[name]) {
    return partialsCache[name];
  }

  const partialPath = path.join(partialsDir, `${name}.html`);

  if (!fs.existsSync(partialPath)) {
    console.warn(`⚠️  Partial not found: ${name}.html`);
    return `<!-- Partial not found: ${name} -->`;
  }

  const content = readFile(partialPath);
  partialsCache[name] = content;
  return content;
}

// Process partials in content
function processPartials(content, partialsDir) {
  // Match {{partial:name}} patterns
  const partialRegex = /\{\{partial:([a-zA-Z0-9-_]+)\}\}/g;

  return content.replace(partialRegex, (match, partialName) => {
    return loadPartial(partialsDir, partialName);
  });
}

// Process post lists in content
function processPostLists(content, posts, useGrid = false, currentPostUrl = null) {
  // Match {{posts}} or {{posts:N}} patterns
  content = content.replace(/\{\{posts(?::(\d+))?\}\}/g, (match, limit) => {
    const maxPosts = limit ? parseInt(limit) : null;
    // Use grid layout if specified (for homepage), otherwise use list
    return useGrid ? generatePostGrid(posts, maxPosts) : generatePostList(posts, maxPosts);
  });

  // Match {{related-posts:N}} pattern for related posts on article pages
  content = content.replace(/\{\{related-posts(?::(\d+))?\}\}/g, (match, limit) => {
    const maxPosts = limit ? parseInt(limit) : 3;
    // Filter out current post and get random related posts
    const otherPosts = currentPostUrl 
      ? posts.filter(p => p.url !== currentPostUrl)
      : posts;
    
    // Get random posts
    const shuffled = [...otherPosts].sort(() => 0.5 - Math.random());
    const relatedPosts = shuffled.slice(0, maxPosts);
    
    return generatePostGrid(relatedPosts, null);
  });

  return content;
}

// Simple template engine
function renderTemplate(content, layout, partialsDir, posts = [], data = {}) {
  // First, process partials in the content
  content = processPartials(content, partialsDir);
  
  // Process post lists and related posts in partials
  const currentPostUrl = data.currentPostUrl || null;
  const useGrid = data.useGrid || false;
  content = processPostLists(content, posts, useGrid, currentPostUrl);

  // Replace {{content}} in layout with page content
  let output = layout.replace('{{content}}', content);

  // Process partials in the layout too
  output = processPartials(output, partialsDir);
  
  // Process post lists in layout partials too
  output = processPostLists(output, posts, useGrid, currentPostUrl);

  // Replace all {{key}} with data values
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    output = output.replace(regex, data[key]);
  });

  return output;
}

// Process a single page
function processPage(pagePath, layoutPath, partialsDir, posts = [], postData = null) {
  const pageContent = readFile(pagePath);
  const isMarkdown = postData && postData.isMarkdown;
  
  // Detect if this is the homepage (index.html) or blog page
  const isHomepage = pagePath.endsWith('index.html') && !postData;
  const isBlogPage = pagePath.endsWith('blog.html') && !postData;
  const useGrid = isHomepage || isBlogPage;
  
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
    
    // Process post lists - use grid layout for homepage and blog page
    // Pass current post URL for related posts filtering
    const currentPostUrl = postData ? postData.url : null;
    processedContent = processPostLists(processedContent, posts, useGrid, currentPostUrl);

    // If this is a post, inject post variables
    if (postData) {
      processedContent = processedContent.replace(/\{\{post\.title\}\}/g, postData.title);
      processedContent = processedContent.replace(/\{\{post\.date\}\}/g, formatDate(postData.date));
      processedContent = processedContent.replace(/\{\{post\.excerpt\}\}/g, postData.excerpt || '');
    }

    // If no layout, still process partials
    if (!useLayout) {
      return processPartials(processedContent, partialsDir);
    }
  }

  const layout = readFile(layoutPath);
  const title = [metadata.title || (postData && postData.title), 'ישוע בלוג'].filter(seg => seg).join(' | ');
  const description = metadata.description || '';

  // Render the page
  return renderTemplate(processedContent, layout, partialsDir, posts, {
    title,
    description,
    year: new Date().getFullYear(),
    currentPostUrl: postData ? postData.url : null,
    useGrid
  });
}

// Generate posts JSON for client-side search
function generatePostsJson(posts, publicDir) {
  const searchData = posts.map(post => {
    // Read the post content using sourcePath (which includes the full path)
    const content = readFile(post.sourcePath);
    
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

  const jsonPath = path.join(publicDir, 'posts.json');
  fs.writeFileSync(jsonPath, JSON.stringify(searchData, null, 2));
  console.log('✅ Generated posts.json');
}

// Clear partials cache
function clearPartialsCache() {
  Object.keys(partialsCache).forEach(key => delete partialsCache[key]);
}

module.exports = {
  extractMetadata,
  formatDate,
  findPostsRecursively,
  scanPosts,
  generatePostList,
  generatePostGrid,
  loadPartial,
  processPartials,
  processPostLists,
  renderTemplate,
  processPage,
  generatePostsJson,
  clearPartialsCache
};
