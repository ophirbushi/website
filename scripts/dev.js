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
  (function() {
    let eventSource;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let isReloading = false;
    
    function connect() {
      if (isReloading) return; // Don't reconnect if we're about to reload
      
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('⚠️ Max reconnection attempts reached. Please refresh manually.');
        return;
      }
      
      // Close existing connection if any
      if (eventSource) {
        eventSource.close();
      }
      
      eventSource = new EventSource('/__reload__');
      
      eventSource.onopen = () => {
        console.log('✅ Connected to dev server');
        reconnectAttempts = 0; // Reset on successful connection
      };
      
      eventSource.onmessage = () => {
        console.log('🔄 Reloading...');
        isReloading = true;
        eventSource.close();
        location.reload();
      };
      
      eventSource.onerror = () => {
        if (isReloading) return; // Don't reconnect if we're reloading
        
        console.log('❌ Lost connection to dev server');
        eventSource.close();
        
        // Exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        reconnectAttempts++;
        
        console.log(\`Reconnecting in \${delay/1000}s (attempt \${reconnectAttempts}/\${maxReconnectAttempts})...\`);
        setTimeout(connect, delay);
      };
    }
    
    // Close connection when page is about to unload
    window.addEventListener('beforeunload', () => {
      if (eventSource) {
        eventSource.close();
      }
    });
    
    connect();
  })();
</script>
`;

// SSE clients
const clients = [];

// Flag to prevent serving during rebuild
let isRebuilding = false;

// Send keep-alive ping every 30 seconds to prevent connection timeout
const keepAliveInterval = setInterval(() => {
  // Clean up dead clients first (iterate backwards to safely splice)
  for (let i = clients.length - 1; i >= 0; i--) {
    const client = clients[i];
    try {
      if (!client.res || client.res.destroyed || client.res.writableEnded) {
        console.log(`[KEEPALIVE] Removing dead client ${i}`);
        clients.splice(i, 1);
      } else {
        client.res.write(': ping\n\n');
      }
    } catch (err) {
      console.log(`[KEEPALIVE] Error with client ${i}, removing:`, err.message);
      clients.splice(i, 1);
    }
  }

  if (clients.length > 0) {
    console.log(`[KEEPALIVE] Active SSE clients: ${clients.length}`);
  }
}, 30000);

// Clean up interval on exit
process.on('SIGINT', () => {
  clearInterval(keepAliveInterval);
  console.log('\n👋 Shutting down dev server...');
  process.exit(0);
});

// Simple HTTP server
function createServer() {
  return http.createServer((req, res) => {
    // Log all requests with timestamp
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[${timestamp}] ${req.method} ${req.url}`);

    // Handle SSE endpoint for live reload
    if (req.url === '/__reload__') {
      console.log(`[${timestamp}] SSE: New connection (total: ${clients.length + 1})`);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no'
      });

      // Send initial comment to establish connection
      res.write(': connected\n\n');

      // Store client with timestamp
      const client = { res, connectedAt: Date.now() };
      clients.push(client);

      req.on('close', () => {
        console.log(`[${timestamp}] SSE: Connection closed (remaining: ${clients.length - 1})`);
        const index = clients.indexOf(client);
        if (index !== -1) clients.splice(index, 1);
      });

      return;
    }

    // Serve files
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);

    // Set a timeout for the request
    const requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.log(`[TIMEOUT] Request timed out: ${req.url}`);
        res.writeHead(408, { 'Content-Type': 'text/plain' });
        res.end('Request timeout');
      }
    }, 5000);

    // Clean up timeout when response finishes
    res.on('finish', () => clearTimeout(requestTimeout));
    res.on('close', () => clearTimeout(requestTimeout));

    // If rebuilding, wait a bit before serving
    if (isRebuilding) {
      console.log(`[WAIT] Waiting for rebuild to complete: ${req.url}`);
      const waitStart = Date.now();
      const checkInterval = setInterval(() => {
        if (!isRebuilding) {
          clearInterval(checkInterval);
          console.log(`[WAIT] Rebuild complete, serving: ${req.url}`);
          serveFile();
        } else if (Date.now() - waitStart > 3000) {
          clearInterval(checkInterval);
          console.log(`[WAIT] Timeout waiting for rebuild: ${req.url}`);
          if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'text/plain' });
            res.end('Server is rebuilding, please refresh');
          }
        }
      }, 50);

      // Clean up interval if connection closes
      req.on('close', () => clearInterval(checkInterval));
      res.on('close', () => clearInterval(checkInterval));

      return;
    }

    serveFile();

    function serveFile() {
      // Handle directory requests - redirect to index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      // Check if file exists
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const notFoundPath = path.join(PUBLIC_DIR, '404.html');

        if (fs.existsSync(notFoundPath)) {
          try {
            let content = fs.readFileSync(notFoundPath, 'utf-8');
            content = content.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(content);
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error reading 404 page');
          }
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
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf'
      };

      const contentType = contentTypes[ext] || 'text/plain';

      try {
        // Read binary files as buffer, text files as UTF-8
        const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf'].includes(ext);

        if (isBinary) {
          const content = fs.readFileSync(filePath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        } else {
          let content = fs.readFileSync(filePath, 'utf-8');

          // Inject live reload script into HTML files
          if (ext === '.html') {
            content = content.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`);
          }

          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      } catch (err) {
        console.error('Error reading file:', filePath, err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error reading file');
      }
    }
  });
}

// Notify all connected clients to reload
function notifyClients() {
  console.log(`🔔 Notifying ${clients.length} client(s) to reload...`);

  // Clean up any stale clients first
  for (let i = clients.length - 1; i >= 0; i--) {
    try {
      const client = clients[i];
      if (!client.res || client.res.destroyed) {
        clients.splice(i, 1);
      }
    } catch (err) {
      clients.splice(i, 1);
    }
  }

  // Notify remaining clients
  clients.forEach((client, index) => {
    try {
      client.res.write('data: reload\n\n');
    } catch (err) {
      // Client might have disconnected
      clients.splice(index, 1);
    }
  });
}

// Watch for file changes
function watchFiles() {
  console.log('👀 Watching for changes...');

  let timeout;
  let lastBuild = 0;

  function onChange() {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      // Prevent builds that are too close together
      const now = Date.now();
      if (now - lastBuild < 200) {
        return;
      }

      console.log('\n📝 Changes detected, rebuilding...');
      isRebuilding = true;

      try {
        build();
        lastBuild = Date.now();
        isRebuilding = false;

        // Small delay before notifying to ensure files are written
        setTimeout(() => {
          notifyClients();
        }, 50);
      } catch (err) {
        console.error('Build error:', err);
        isRebuilding = false;
      }
    }, 150);
  }

  // Watch src directory recursively
  try {
    fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
      if (filename) {
        // Ignore certain files
        if (filename.includes('.swp') ||
          filename.includes('.tmp') ||
          filename.startsWith('.')) {
          return;
        }
        console.log(`  Changed: ${filename}`);
        onChange();
      }
    });
  } catch (err) {
    console.error('Error watching files:', err);
  }
}

// Start dev server
function startDevServer() {
  // Initial build
  try {
    build();
  } catch (err) {
    console.error('Initial build error:', err);
    process.exit(1);
  }

  // Create and start server
  const server = createServer();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please close the other process or use a different port.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 Dev server running at http://localhost:${PORT}`);
    console.log('   Press Ctrl+C to stop\n');
  });

  // Watch for changes
  watchFiles();
}

startDevServer();