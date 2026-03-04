# OpenTab

<img src=".docs/cover.png" alt="cover">
<br>
<br>

[中文版](.docs/README_zh.md) 

OpenTab is a browser new tab page extension built with **Vue 3 + TypeScript + Vite**, designed for Edge and Chrome. The project emphasizes a **"local-first" approach**: all configurations, bookmarks, website categories, and UI customizations are stored locally without relying on backend services.

## Screenshots

<img src=".docs/cover1.jpg" 
     alt="Main Interface Screenshot" 
     style="max-width: 350px; height: auto; display: block; margin: 16px auto;">

<br>

<img src=".docs/cover2.png" 
     alt="Quick Ring Feature" 
     style="max-width: 350px; height: auto; display: block; margin: 16px auto;">

## Features

### New Tab Homepage

- **Search Bar**: Supports Bing, Google, Baidu, and custom search engines
- **Website Grid**: Display bookmarks with category browsing and quick access
- **Mouse Wheel Navigation**: Scroll to switch between categories
- **Performance Optimized**: Minimal resource loading with stable performance

### Personalization Settings

- **Custom Wallpaper**: Set your preferred background image
- **Icon Size & Radius**: Adjust icon dimensions and corner radius
- **Sidebar Toggle**: Hide/show sidebar as needed

### Data Management

- **One-Click Export**: Export configuration files for backup
- **Cross-Device Sync**: Import and restore configurations on different devices

### Quick Ring (New Feature) ⭐

- **Hotkey Activation**: Hold modifier key + left-click anywhere on any webpage to trigger
- **Configurable Triggers**: Supports Ctrl, Alt, and Shift modifiers
- **Adjustable Size**: Customize ring size to your preference
- **Up to 8 Shortcuts**: Store quick access to frequently visited sites

## Tech Stack

| Component      | Technology                     |
| -------------- | ------------------------------ |
| **Framework**  | Vue 3                          |
| **Language**   | TypeScript                     |
| **Build Tool** | Vite                           |
| **Styling**    | Tailwind CSS                   |
| **Storage**    | Chrome Storage API + IndexedDB |

## Project Structure

```
openTab/
├─ src/
│  ├─ background/       # Background scripts
│  ├─ components/       # Vue components
│  ├─ content/          # Content scripts
│  ├─ utils/           # Utility functions
│  ├─ views/           # Page views
│  ├─ manifest.json    # Extension manifest
│  └─ main.ts          # Application entry
├─ public/             # Static assets
├─ dist/               # Build output
└─ package.json
```

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **Package Manager**: pnpm (recommended) or npm

### Installation

1. **Install dependencies**:

   ```bash
   pnpm install
   # or
   npm install
   ```

2. **Start development server**:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

## Loading the Extension

### Build the Extension

```bash
pnpm build
# or
npm run build
```

The build output will be in the `dist/` directory.

### Load in Edge

1. Navigate to `edge://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist` directory from your project folder

### Load in Chrome

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist` directory from your project folder

> **Note**: Chrome Web Store publication is planned for the future. The extension is compatible with all Chromium-based browsers.

## Building for Production

```bash
pnpm build
```

The production-ready extension will be created in the `dist/` directory.

## FAQ

### Why isn't it available on the Chrome Web Store?

Currently, we don't have a Chrome developer account. We're considering applying for one in the future. This project was initially developed as a personal hobby project.

### Which browsers are supported?

OpenTab supports most modern browsers:

- **Edge**: Available in the Microsoft Edge Add-ons store
- **Chrome**: Not yet published, but compatible
- **Chromium-based browsers**: Compatible with any Chromium-based browser (e.g., Brave, Opera)

### How secure is this extension?

OpenTab prioritizes security by design:

- **100% local storage**: All data is stored locally on your device
- **No backend dependencies**: No server communication required
- **No data collection**: Your bookmarks and preferences never leave your computer

The project was created specifically to address security concerns with existing new tab extensions that have backend vulnerabilities.

### Is this project AI-generated?

Yes, this project was developed with AI assistance. The entire codebase is open source, and we welcome contributions via fork and pull request.

### What's planned for future versions?

We're open to community feedback and feature requests. Future development will focus on:

- Enhanced personalization options
- Improved performance
- Community-requested features

We also offer custom development services for personalized new tab pages tailored to your specific needs.

## Contributing

We welcome contributions! Here's how to get involved:

1. **Fork** this repository
2. **Create** a feature branch for your changes
3. **Commit** your modifications with clear descriptions
4. **Submit** a Pull Request explaining:
   - What changes you made
   - Why you made them
   - How to verify the changes

## License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

See the [LICENSE](LICENSE) file for details.

---
