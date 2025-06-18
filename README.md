# ZappedIn Launcher Electron App

A simple Electron application that can be triggered from a website and displays data passed from the web.

## Features

- 🚀 Launch Electron app from website
- 📊 Display data received from website
- 🎨 Modern, responsive UI
- 🔄 Multiple communication methods
- 📱 Cross-platform support

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Electron App

```bash
npm start$$
```

For development with DevTools:

```bash
npm run dev
```

### 3. Test the Integration

Open `website-example.html` in your browser to test the website-to-Electron communication.

## How It Works

### Method 1: Custom Protocol (Recommended)

The app registers a custom protocol `zappedin://` that can be triggered from any website:

```javascript
// From your website
const data = {
  message: "Hello from website!",
  user: {
    name: "John Doe",
    email: "john@example.com",
  },
  timestamp: new Date().toISOString(),
};

const protocolUrl = `zappedin://launch?data=${encodeURIComponent(
  JSON.stringify(data)
)}`;
window.location.href = protocolUrl;
```

### Method 2: Local Server (Alternative)

The app can also receive data via a local HTTP server (requires additional setup).

## File Structure

```
zappedin-launcher-electron/
├── main.js              # Main Electron process
├── renderer.js          # Renderer process script
├── index.html           # Electron app UI
├── styles.css           # App styling
├── website-example.html # Example website for testing
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Integration with Your Website

### Basic Integration

Add this JavaScript to your website:

```javascript
function launchElectronApp(data) {
  const protocolUrl = `zappedin://launch?data=${encodeURIComponent(
    JSON.stringify(data)
  )}`;
  window.location.href = protocolUrl;
}

// Example usage
launchElectronApp({
  message: "User clicked button",
  userId: "12345",
  action: "open-app",
});
```

### Advanced Integration

For more robust integration, you can:

1. **Check if app is installed:**

```javascript
function isElectronAppInstalled() {
  return new Promise((resolve) => {
    const testUrl = "zappedin://test";
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = testUrl;

    setTimeout(() => {
      document.body.removeChild(iframe);
      resolve(false); // If we reach here, app is not installed
    }, 1000);

    iframe.onload = () => {
      document.body.removeChild(iframe);
      resolve(true);
    };

    document.body.appendChild(iframe);
  });
}
```

2. **Handle fallback scenarios:**

```javascript
async function launchWithFallback(data) {
  const isInstalled = await isElectronAppInstalled();

  if (isInstalled) {
    launchElectronApp(data);
  } else {
    // Redirect to download page or show alternative
    window.location.href = "https://your-download-page.com";
  }
}
```

## Building for Distribution

### Create Executable

```bash
npm run build
```

This will create distributable packages in the `dist` folder.

### Platform-Specific Builds

```bash
# Windows
npm run build -- --win

# macOS
npm run build -- --mac

# Linux
npm run build -- --linux
```

## Customization

### Modify App Appearance

Edit `styles.css` to customize the app's look and feel.

### Add New Features

1. **New IPC handlers** in `main.js`:

```javascript
ipcMain.handle("new-feature", async (event, data) => {
  // Handle new feature
  return { success: true };
});
```

2. **New UI elements** in `index.html` and `renderer.js`

### Change Protocol Name

To use a different protocol name:

1. Update `main.js` line 67: `protocol.registerFileProtocol('yourprotocol', ...)`
2. Update website code to use `yourprotocol://` instead of `zappedin://`

## Troubleshooting

### App Won't Launch

1. Ensure Node.js and npm are installed
2. Run `npm install` to install dependencies
3. Check console for error messages

### Website Can't Trigger App

1. Ensure the Electron app is running
2. Check browser console for protocol errors
3. Verify the protocol URL format

### Data Not Displaying

1. Check the data format being sent
2. Ensure JSON is properly encoded
3. Check Electron app console for errors

## Security Considerations

- The app uses `nodeIntegration: true` for simplicity
- For production, consider using `contextIsolation: true` with preload scripts
- Validate all incoming data before processing
- Implement proper error handling

## License

MIT License - feel free to use this code in your projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions, please check the troubleshooting section above or create an issue in the repository.
