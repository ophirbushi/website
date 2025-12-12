const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = 3001;
const POSTS_DIR = path.join(__dirname, 'src', 'posts');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Parse metadata from HTML comments
function parseMetadata(content) {
  const metadata = {
    title: '',
    date: '',
    excerpt: ''
  };
  
  const titleMatch = content.match(/<!--\s*title:\s*(.+?)\s*-->/);
  const dateMatch = content.match(/<!--\s*date:\s*(.+?)\s*-->/);
  const excerptMatch = content.match(/<!--\s*excerpt:\s*(.+?)\s*-->/);
  
  if (titleMatch) metadata.title = titleMatch[1];
  if (dateMatch) metadata.date = dateMatch[1];
  if (excerptMatch) metadata.excerpt = excerptMatch[1];
  
  return metadata;
}

// Extract main content (everything after metadata comments)
function extractContent(content) {
  // Remove metadata comments and get the rest
  let cleaned = content.replace(/<!--\s*title:\s*.+?\s*-->\s*/g, '');
  cleaned = cleaned.replace(/<!--\s*date:\s*.+?\s*-->\s*/g, '');
  cleaned = cleaned.replace(/<!--\s*excerpt:\s*.+?\s*-->\s*/g, '');
  return cleaned.trim();
}

// Reconstruct file with metadata and content
function reconstructFile(metadata, content) {
  return `<!-- title: ${metadata.title} -->
<!-- date: ${metadata.date} -->
<!-- excerpt: ${metadata.excerpt} -->

${content}`;
}

// Dashboard - List all posts
app.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(POSTS_DIR);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    
    const posts = await Promise.all(
      htmlFiles.map(async (file) => {
        const content = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
        const metadata = parseMetadata(content);
        return {
          filename: file,
          ...metadata
        };
      })
    );

    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>מערכת ניהול תוכן</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 {
            color: white;
            margin-bottom: 2rem;
            font-size: 2.5rem;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          }
          .posts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
          }
          .post-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            text-decoration: none;
            color: inherit;
            display: block;
          }
          .post-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 12px rgba(0,0,0,0.15);
          }
          .post-title {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            color: #667eea;
          }
          .post-date {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
          }
          .post-excerpt {
            color: #333;
            line-height: 1.6;
          }
          .post-filename {
            font-size: 0.8rem;
            color: #999;
            margin-top: 0.5rem;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📝 מערכת ניהול תוכן</h1>
          <div class="posts-grid">
            ${posts.map(post => `
              <a href="/edit/${post.filename}" class="post-card">
                <h2 class="post-title">${post.title || 'ללא כותרת'}</h2>
                <p class="post-date">${post.date || 'ללא תאריך'}</p>
                <p class="post-excerpt">${post.excerpt || 'ללא תקציר'}</p>
                <p class="post-filename">${post.filename}</p>
              </a>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading posts: ' + error.message);
  }
});

// Editor page
app.get('/edit/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(POSTS_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = parseMetadata(content);
    const mainContent = extractContent(content);

    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>עריכת: ${metadata.title}</title>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            padding: 2rem;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #eee;
          }
          h1 {
            color: #667eea;
            font-size: 2rem;
          }
          .back-link {
            text-decoration: none;
            color: #667eea;
            padding: 0.5rem 1rem;
            border: 2px solid #667eea;
            border-radius: 6px;
            transition: all 0.2s;
          }
          .back-link:hover {
            background: #667eea;
            color: white;
          }
          .form-group {
            margin-bottom: 1.5rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #333;
          }
          input[type="text"],
          textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            font-family: inherit;
            transition: border-color 0.2s;
          }
          input[type="text"]:focus,
          textarea:focus {
            outline: none;
            border-color: #667eea;
          }
          .button-group {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
          }
          button {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 600;
          }
          .btn-save {
            background: #667eea;
            color: white;
            flex: 1;
          }
          .btn-save:hover {
            background: #5568d3;
          }
          .btn-ai {
            background: #764ba2;
            color: white;
            flex: 1;
          }
          .btn-ai:hover {
            background: #63408a;
          }
          .btn-ai:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .status {
            margin-top: 1rem;
            padding: 1rem;
            border-radius: 6px;
            display: none;
          }
          .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>עריכת מאמר</h1>
            <a href="/" class="back-link">← חזרה לרשימה</a>
          </div>
          
          <form id="editForm">
            <input type="hidden" name="filename" value="${filename}">
            
            <div class="form-group">
              <label for="title">כותרת:</label>
              <input type="text" id="title" name="title" value="${metadata.title}" required>
            </div>
            
            <div class="form-group">
              <label for="date">תאריך:</label>
              <input type="text" id="date" name="date" value="${metadata.date}" required>
            </div>
            
            <div class="form-group">
              <label for="excerpt">תקציר:</label>
              <textarea id="excerpt" name="excerpt" rows="3" required>${metadata.excerpt}</textarea>
            </div>
            
            <div class="form-group">
              <label for="content">תוכן:</label>
              <textarea id="content" name="content">${mainContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            </div>
            
            <div class="button-group">
              <button type="button" class="btn-ai" id="aiBtn">✨ שפר עם AI</button>
              <button type="submit" class="btn-save">💾 שמור</button>
            </div>
          </form>
          
          <div id="status" class="status"></div>
        </div>

        <script>
          // Initialize TinyMCE with RTL support
          tinymce.init({
            selector: '#content',
            directionality: 'rtl',
            language: 'he_IL',
            height: 500,
            menubar: true,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | blocks | ' +
              'bold italic forecolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | code | help',
            content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; direction: rtl; }',
            language_url: 'https://cdn.jsdelivr.net/npm/tinymce-lang/langs/he_IL.js'
          });

          // Show status message
          function showStatus(message, type = 'info') {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = 'status ' + type;
            status.style.display = 'block';
            setTimeout(() => {
              status.style.display = 'none';
            }, 5000);
          }

          // AI Enhancement
          document.getElementById('aiBtn').addEventListener('click', async () => {
            const btn = document.getElementById('aiBtn');
            btn.disabled = true;
            btn.textContent = '⏳ מעבד...';
            
            try {
              const content = tinymce.get('content').getContent();
              
              showStatus('שולח לבינה מלאכותית...', 'info');
              
              const response = await fetch('/api/enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
              });
              
              if (!response.ok) {
                throw new Error('AI request failed');
              }
              
              const data = await response.json();
              tinymce.get('content').setContent(data.enhanced);
              showStatus('התוכן שופר בהצלחה! ✨', 'success');
            } catch (error) {
              showStatus('שגיאה בשיפור התוכן: ' + error.message, 'error');
            } finally {
              btn.disabled = false;
              btn.textContent = '✨ שפר עם AI';
            }
          });

          // Save form
          document.getElementById('editForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
              filename: document.querySelector('[name="filename"]').value,
              title: document.getElementById('title').value,
              date: document.getElementById('date').value,
              excerpt: document.getElementById('excerpt').value,
              content: tinymce.get('content').getContent()
            };
            
            try {
              showStatus('שומר...', 'info');
              
              const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
              });
              
              if (!response.ok) {
                throw new Error('Save failed');
              }
              
              showStatus('נשמר בהצלחה! ✅', 'success');
            } catch (error) {
              showStatus('שגיאה בשמירה: ' + error.message, 'error');
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error loading post: ' + error.message);
  }
});

// API: Enhance content with AI
app.post('/api/enhance', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment variables' });
    }
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `אתה עורך תוכן מקצועי. שפר והרחב את התוכן הבא תוך שמירה על הסגנון והעיצוב ה-HTML. הוסף עומק, שפר את הזרימה, והפוך אותו למעניין יותר. החזר רק את ה-HTML המשופר ללא הסברים נוספים.

התוכן:
${content}`
      }]
    });
    
    const enhanced = message.content[0].text;
    res.json({ enhanced });
  } catch (error) {
    console.error('AI Enhancement error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Save post
app.post('/api/save', async (req, res) => {
  try {
    const { filename, title, date, excerpt, content } = req.body;
    
    const filePath = path.join(POSTS_DIR, filename);
    const fileContent = reconstructFile({ title, date, excerpt }, content);
    
    await fs.writeFile(filePath, fileContent, 'utf-8');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 CMS Server running at http://localhost:${PORT}`);
  console.log(`📁 Managing posts in: ${POSTS_DIR}`);
  console.log(`🔑 Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set'}\n`);
});
