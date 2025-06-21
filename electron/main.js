// Modules to control application life and create native browser window
import { app, ipcMain, shell, Tray, Menu, nativeImage } from "electron/main";
import path from "node:path";
import { fileURLToPath } from "node:url";
import LinkedInContext from "./BrowserContext.js";
import { Notification } from "electron";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("zappedin", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("zappedin");
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", async (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, process deep links without showing window
    const deepLinkUrl = commandLine.find((arg) =>
      arg.startsWith("zappedin://")
    );

    if (deepLinkUrl) {
      try {
        // Parse the URL properly
        const url = new URL(deepLinkUrl);
        const linkedinAccountId = url.searchParams.get("linkedin_account_id");
        const token = url.searchParams.get("token");

        if (linkedinAccountId && token) {
          const usrData = await fetchAccountData(linkedinAccountId, token);

          // Show notification instead of focusing window
          showNotification(
            "ZappedIn",
            `Processing account: ${usrData.data.username}`
          );

          try {
            const linkedinContext = new LinkedInContext();
            await linkedinContext.init(usrData.data);
          } catch (error) {
            console.error("Error initializing browser context:", error);
            showNotification(
              "ZappedIn Error",
              "Failed to initialize browser context"
            );
          }

          return; // Exit early, don't show the error dialog
        }
      } catch (error) {
        console.error("Error parsing deep link data:", error);
        showNotification(
          "ZappedIn Error",
          `Failed to parse deep link data: ${error.message}`
        );
        return; // Exit early, don't show the welcome dialog
      }
    }
  });

  app.whenReady().then(() => {
    createTray();
    // Handle the initial launch with protocol (if app wasn't running)
    if (process.argv.length > 1) {
      const deepLinkUrl = process.argv.find((arg) =>
        arg.startsWith("zappedin://")
      );

      if (deepLinkUrl) {
        try {
          const url = new URL(deepLinkUrl);
          const dataParam = url.searchParams.get("data");

          if (dataParam) {
            const data = JSON.parse(decodeURIComponent(dataParam));
            // Process in background without showing window
            mainWindow.webContents.once("did-finish-load", () => {
              // Send data to renderer if needed, but don't show window
              mainWindow.webContents.send("deep-link", data);
            });
          }
        } catch (error) {
          console.error("Error parsing initial deep link data:", error);
        }
      }
    }
  });

  app.on("open-url", (event, url) => {
    // Handle macOS deep links
    try {
      const urlObj = new URL(url);
      const dataParam = urlObj.searchParams.get("data");

      if (dataParam && mainWindow) {
        const data = JSON.parse(decodeURIComponent(dataParam));
        showNotification("ZappedIn", "Deep link processed");
        return;
      }
    } catch (error) {
      console.error("Error parsing macOS deep link data:", error);
      showNotification(
        "ZappedIn Error",
        `Failed to parse macOS deep link: ${error.message}`
      );
      return;
    }
  });
}

async function fetchAccountData(accountId, token) {
  try {
    const response = await fetch(
      `http://localhost:6001/api/v1/linkedin-account/get-by-id/${accountId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Api Request Failed");
    }

    const accountData = await response.json();

    console.log(accountData);

    if (!accountData.data.username) {
      throw new Error("Username field missing in the accountData");
    }

    return accountData;
  } catch (error) {
    console.log("Error Fetching account data", error);
    throw error;
  }
}

function createTray() {
  // Create tray icon - try to load from assets folder
  const iconPath = path.join(__dirname, "assets", "icon.png");

  try {
    // Try to create icon from file
    const icon = nativeImage.createFromPath(iconPath);

    if (!icon.isEmpty()) {
      tray = new Tray(icon.resize({ width: 16, height: 16 }));
    } else {
      // Create a simple programmatic icon if file doesn't exist
      const canvas = nativeImage.createFromDataURL(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwiChYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYW"
      );
      tray = new Tray(canvas);
    }
  } catch (error) {
    console.error("Error creating tray icon:", error);
    // Create a minimal tray using a simple data URL
    const canvas = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwiChYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYW"
    );
    tray = new Tray(canvas);
  }

  // Set tooltip
  tray.setToolTip("ZappedIn - Running in background");

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Handle tray click events
  tray.on("click", () => {
    // Toggle window visibility on tray click
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  tray.on("right-click", () => {
    tray.popUpContextMenu();
  });
}

function showNotification(title, body) {
  // Show system notification instead of dialog
  try {
    new Notification({
      title: title,
      body: body,
      silent: false,
    }).show();
  } catch (error) {
    console.log(`${title}: ${body}`);
    console.error("Notification error:", error);
  }
}

// Prevent app from quitting when all windows are closed
app.on("window-all-closed", function () {
  // Keep the app running even when all windows are closed
  // The app will continue to run in the background with the tray icon
});

// Ensure app quits properly when user explicitly quits
app.on("before-quit", () => {
  app.isQuiting = true;
});

// Handle window controls via IPC
ipcMain.on("shell:open", () => {
  const pageDirectory = __dirname.replace("app.asar", "app.asar.unpacked");
  const pagePath = path.join("file://", pageDirectory, "index.html");
  shell.openExternal(pagePath);
});

// Add IPC handlers for tray interactions
ipcMain.on("hide-window", () => {
  mainWindow.hide();
});

ipcMain.on("show-notification", (event, title, message) => {
  showNotification(title, message);
});
