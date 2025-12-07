const fs = require('fs');
const path = require('path');
const http = require('http');
const { build } = require('./build.js');

const PORT = 3000;
const SRC_DIR = path.join(__dirname, '../src');
const PUBLIC_DIR = path.join(__dirname, '../public');

// Live reload script to inject
const LIVE_RELOAD_SCRIPT = `
<script>
  const eventSource = new EventSource('/__reload__');
  eventSource.onmessage = () => {
    console.log('🔄 Reloading...');
    location.reload();
  };
  eventSource.onerror = () => {
    console.log('❌ Lost connection to dev server');
  };
</script>
`;

// SSE clients
const clients = [];

// Simple HTTP server
function createServer() {
  return http.createServer((req, res) => {
    // Handle SSE endpoint for live reload
    if (req.url === '/__reload__') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      clients.push(res);

      req.on('close', () => {
        const index = clients.indexOf(res);
        if (index !== -1) clients.splice(index, 1);
      });

      return;
    }

    // Serve files
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      const notFoundPath = path.join(PUBLIC_DIR, '404.html');

      if (fs.existsSync(notFoundPath)) {
        let content = fs.readFileSync(notFoundPath, 'utf-8');
        content = content.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      }
      return;
    }

    // Read and serve file
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    const contentType = contentTypes[ext] || 'text/plain';

    let content = fs.readFileSync(filePath, 'utf-8');

    // Inject live reload script into HTML files
    if (ext === '.html') {
      content = content.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`);
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// Notify all connected clients to reload
function notifyClients() {
  console.log(`🔔 Notifying ${clients.length} client(s) to reload...`);
  clients.forEach(client => {
    client.write('data: reload\n\n');
  });
}

// Watch for file changes
function watchFiles() {
  console.log('👀 Watching for changes...');

  let timeout;

  function onChange() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log('\n📝 Changes detected, rebuilding...');
      build();
      notifyClients();
    }, 100);
  }

  // Watch src directory recursively
  fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
    if (filename) {
      console.log(`  Changed: ${filename}`);
      onChange();
    }
  });
}

// Start dev server
function startDevServer() {
  // Initial build
  build();

  // Create and start server
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`\n🚀 Dev server running at http://localhost:${PORT}`);
    console.log('   Press Ctrl+C to stop\n');
  });

  // Watch for changes
  watchFiles();
}

startDevServer();
