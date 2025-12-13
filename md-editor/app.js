// Get DOM elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const toggleDirectionBtn = document.getElementById('toggleDirection');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const autoDetectRTL = document.getElementById('autoDetectRTL');
const editorDirectionIndicator = document.getElementById('editorDirection');
const previewDirectionIndicator = document.getElementById('previewDirection');

// State
let manualDirection = null; // null means auto-detect, 'ltr' or 'rtl' for manual

// RTL detection - checks if text contains Hebrew, Arabic, or other RTL characters
function containsRTL(text) {
    const rtlChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return rtlChars.test(text);
}

// Simple markdown parser
function parseMarkdown(text) {
    // Process images and links BEFORE escaping HTML (they use < > characters)
    // Images
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '___IMAGE___$2___ALT___$1___IMAGEEND___');
    
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '___LINK___$2___TEXT___$1___LINKEND___');

    // Escape HTML
    text = text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    // Restore images and links with proper HTML
    text = text.replace(/___IMAGE___([^_]+)___ALT___([^_]*)___IMAGEEND___/g, '<img src="$1" alt="$2">');
    text = text.replace(/___LINK___([^_]+)___TEXT___([^_]+)___LINKEND___/g, '<a href="$1" target="_blank">$2</a>');

    // Headers
    text = text.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    text = text.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Code blocks
    text = text.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Blockquotes
    text = text.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

    // Horizontal rules
    text = text.replace(/^---$/gim, '<hr>');
    text = text.replace(/^\*\*\*$/gim, '<hr>');

    // Lists
    const lines = text.split('\n');
    let inList = false;
    let inOrderedList = false;
    let result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Unordered list
        if (line.match(/^[\*\-\+] /)) {
            if (!inList) {
                result.push('<ul>');
                inList = true;
            }
            result.push('<li>' + line.replace(/^[\*\-\+] /, '') + '</li>');
        }
        // Ordered list
        else if (line.match(/^\d+\. /)) {
            if (!inOrderedList) {
                result.push('<ol>');
                inOrderedList = true;
            }
            result.push('<li>' + line.replace(/^\d+\. /, '') + '</li>');
        }
        // Not a list item
        else {
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            if (inOrderedList) {
                result.push('</ol>');
                inOrderedList = false;
            }
            result.push(line);
        }
    }

    // Close any open lists
    if (inList) result.push('</ul>');
    if (inOrderedList) result.push('</ol>');

    text = result.join('\n');

    // Paragraphs (simple approach)
    text = text.replace(/\n\n/g, '</p><p>');
    text = '<p>' + text + '</p>';

    // Clean up empty paragraphs
    text = text.replace(/<p><\/p>/g, '');
    text = text.replace(/<p>(<h[1-6]>)/g, '$1');
    text = text.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    text = text.replace(/<p>(<ul>)/g, '$1');
    text = text.replace(/(<\/ul>)<\/p>/g, '$1');
    text = text.replace(/<p>(<ol>)/g, '$1');
    text = text.replace(/(<\/ol>)<\/p>/g, '$1');
    text = text.replace(/<p>(<blockquote>)/g, '$1');
    text = text.replace(/(<\/blockquote>)<\/p>/g, '$1');
    text = text.replace(/<p>(<pre>)/g, '$1');
    text = text.replace(/(<\/pre>)<\/p>/g, '$1');
    text = text.replace(/<p>(<hr>)<\/p>/g, '$1');

    return text;
}

// Update preview
function updatePreview() {
    const text = editor.value;
    const html = parseMarkdown(text);
    preview.innerHTML = html || '<p style="color: #cbd5e0;">Preview will appear here...</p>';

    // Update direction
    updateDirection();
}

// Update text direction
function updateDirection() {
    const text = editor.value;
    let isRTL = false;

    if (autoDetectRTL.checked && manualDirection === null) {
        // Auto-detect mode
        isRTL = containsRTL(text);
    } else if (manualDirection !== null) {
        // Manual mode
        isRTL = manualDirection === 'rtl';
    }

    // Apply direction
    if (isRTL) {
        editor.classList.add('rtl');
        editor.classList.remove('ltr');
        preview.classList.add('rtl');
        preview.classList.remove('ltr');
        editorDirectionIndicator.textContent = 'RTL';
        previewDirectionIndicator.textContent = 'RTL';
    } else {
        editor.classList.add('ltr');
        editor.classList.remove('rtl');
        preview.classList.add('ltr');
        preview.classList.remove('rtl');
        editorDirectionIndicator.textContent = 'LTR';
        previewDirectionIndicator.textContent = 'LTR';
    }
}

// Toggle direction manually
function toggleDirection() {
    const currentIsRTL = editor.classList.contains('rtl');
    
    if (currentIsRTL) {
        manualDirection = 'ltr';
    } else {
        manualDirection = 'rtl';
    }
    
    // Disable auto-detect when manually toggling
    autoDetectRTL.checked = false;
    
    updateDirection();
}

// Clear editor
function clearEditor() {
    if (editor.value && !confirm('Are you sure you want to clear the editor?')) {
        return;
    }
    editor.value = '';
    updatePreview();
    manualDirection = null;
}

// Download markdown file
function downloadMarkdown() {
    const text = editor.value;
    if (!text.trim()) {
        alert('Nothing to download!');
        return;
    }

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Load from localStorage on page load
function loadFromStorage() {
    const saved = localStorage.getItem('markdown-editor-content');
    if (saved) {
        editor.value = saved;
        updatePreview();
    }
}

// Save to localStorage
function saveToStorage() {
    localStorage.setItem('markdown-editor-content', editor.value);
}

// Event listeners
editor.addEventListener('input', () => {
    updatePreview();
    saveToStorage();
});

// Toolbar functionality
function insertMarkdown(action) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const beforeText = editor.value.substring(0, start);
    const afterText = editor.value.substring(end);
    
    let newText = '';
    let cursorOffset = 0;
    
    switch(action) {
        case 'h1':
            newText = `# ${selectedText || 'Heading 1'}`;
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'h2':
            newText = `## ${selectedText || 'Heading 2'}`;
            cursorOffset = selectedText ? newText.length : 3;
            break;
        case 'h3':
            newText = `### ${selectedText || 'Heading 3'}`;
            cursorOffset = selectedText ? newText.length : 4;
            break;
        case 'bold':
            newText = `**${selectedText || 'bold text'}**`;
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'italic':
            newText = `*${selectedText || 'italic text'}*`;
            cursorOffset = selectedText ? newText.length : 1;
            break;
        case 'strikethrough':
            newText = `~~${selectedText || 'strikethrough'}~~`;
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'ul':
            newText = `- ${selectedText || 'list item'}`;
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'ol':
            newText = `1. ${selectedText || 'list item'}`;
            cursorOffset = selectedText ? newText.length : 3;
            break;
        case 'quote':
            newText = `> ${selectedText || 'quote'}`;
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'link':
            newText = `[${selectedText || 'link text'}](url)`;
            cursorOffset = selectedText ? newText.length - 4 : 1;
            break;
        case 'image':
            newText = `![${selectedText || 'alt text'}](image-url)`;
            cursorOffset = selectedText ? newText.length - 11 : 2;
            break;
        case 'code':
            newText = `\`${selectedText || 'code'}\``;
            cursorOffset = selectedText ? newText.length : 1;
            break;
    }
    
    editor.value = beforeText + newText + afterText;
    editor.focus();
    editor.selectionStart = editor.selectionEnd = start + cursorOffset;
    
    updatePreview();
    saveToStorage();
}

// Add toolbar button listeners
document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        insertMarkdown(action);
    });
});

toggleDirectionBtn.addEventListener('click', toggleDirection);
clearBtn.addEventListener('click', clearEditor);
downloadBtn.addEventListener('click', downloadMarkdown);

autoDetectRTL.addEventListener('change', () => {
    if (autoDetectRTL.checked) {
        manualDirection = null;
        updateDirection();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+S or Cmd+S to download
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadMarkdown();
    }
    
    // Ctrl+D or Cmd+D to toggle direction
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleDirection();
    }
    
    // Ctrl+B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        insertMarkdown('bold');
    }
    
    // Ctrl+I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        insertMarkdown('italic');
    }
});

// Initialize
loadFromStorage();
updatePreview();
