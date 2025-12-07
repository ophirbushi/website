# Static Site Builder

A simple static website setup with shared layouts and live development.

## Features

- 🎨 **Shared Layouts** - Define header, footer, and navigation once
- ⚡ **Live Reload** - Instant browser refresh when you edit files
- 📝 **Simple Templates** - Use {{variables}} for dynamic content
- 🚀 **Fast Build** - Pure Node.js, no complex dependencies

## Quick Start

```bash
# Start development server
npm run dev

# Build for production
npm run build
```

Visit `http://localhost:3000` to see your site!

## Project Structure

```
static-site/
├── src/
│   ├── layouts/
│   │   └── main.html          # Shared layout (header, footer, nav)
│   ├── pages/
│   │   ├── index.html         # Home page
│   │   ├── about.html         # About page
│   │   └── contact.html       # Contact page
│   └── styles/
│       └── main.css           # Stylesheet
├── public/                    # Generated output (created by build)
├── scripts/
│   ├── build.js              # Build script
│   └── dev.js                # Dev server with live reload
└── package.json
```

## How It Works

1. **Edit source files** in `src/pages/` and `src/styles/`
2. **Shared layout** from `src/layouts/main.html` wraps all pages
3. **Build process** generates complete HTML files in `public/`
4. **Dev server** watches for changes and auto-reloads browser

## Creating Pages

Create a new HTML file in `src/pages/`:

```html
<!-- title: My Page Title -->
<!-- description: Page description for SEO -->

<section>
    <h1>My New Page</h1>
    <p>Content goes here!</p>
</section>
```

The layout will automatically wrap it with header, footer, and navigation.

## Template Variables

Use these in your layout or pages:

- `{{content}}` - Page content (layout only)
- `{{title}}` - Page title from comment
- `{{description}}` - Page description from comment
- `{{year}}` - Current year

## Customizing the Layout

Edit `src/layouts/main.html` to change:
- Header and navigation
- Footer
- Meta tags
- Global structure

All pages will automatically use the updated layout.

## Development Workflow

1. **Start dev server**: `npm run dev`
2. **Edit files** in `src/`
3. **Save** - browser refreshes automatically
4. **Build for production**: `npm run build`

## Tips

- Keep page content in `src/pages/` focused on the unique content
- Use the shared layout for common elements
- CSS in `src/styles/` is automatically copied to `public/styles/`
- The dev server runs on port 3000 by default

## Next Steps

- Add more pages in `src/pages/`
- Customize the design in `src/styles/main.css`
- Modify the layout in `src/layouts/main.html`
- Add images by creating a `src/images/` folder and updating the build script

Enjoy building!
