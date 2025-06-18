// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain, shell, dialog } from "electron/main";
import path from "node:path";
import LinkedInContext from "./launcher/BrowserContext.js";

let mainWindow;

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
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      const deepLinkUrl = commandLine.find((arg) =>
        arg.startsWith("zappedin://")
      );

      if (deepLinkUrl) {
        try {
          // Parse the URL properly
          const url = new URL(deepLinkUrl);
          const dataParam = url.searchParams.get("data");

          if (dataParam) {
            const data = JSON.parse(decodeURIComponent(dataParam));

            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            // Send the actual parsed data
            // mainWindow.webContents.send("deep-link", data);

            try {
              const linkedinContext = new LinkedInContext();
              await linkedinContext.init();
            } catch (error) {
              console.error("Error initializing browser context:", error);
            }

            return; // Exit early, don't show the error dialog
          }
        } catch (error) {
          console.error("Error parsing deep link data:", error);
          dialog.showErrorBox(
            "Error",
            `Failed to parse deep link data: ${error.message}`
          );
          return; // Exit early, don't show the welcome dialog
        }
      }

      // Only restore window if no deep link was processed
      if (mainWindow.isMinimized()) mainWindow.restore();
    }

    // Only show this dialog if no deep link was found
    const deepLinkUrl = commandLine.find((arg) =>
      arg.startsWith("zappedin://")
    );

    if (!deepLinkUrl) {
      dialog.showErrorBox(
        "Welcome Back",
        `You arrived from: ${commandLine.join(" ")}`
      );
    }
  });

  // Create mainWindow, load the rest of the app, etc...
  app.whenReady().then(() => {
    createWindow();

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
            // Wait for window to be ready before sending data
            mainWindow.webContents.once("did-finish-load", () => {
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
        mainWindow.webContents.send("deep-link", data);
        return;
      }
    } catch (error) {
      console.error("Error parsing macOS deep link data:", error);
      dialog.showErrorBox(
        "Error",
        `Failed to parse macOS deep link: ${error.message}`
      );
      return;
    }

    // Only show this if not a deep link
    if (!url.startsWith("zappedin://")) {
      dialog.showErrorBox("Welcome Back", `You arrived from: ${url}`);
    }
  });
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 400,
    height: 400,
    webPreferences: {
      preload: path.join(process.cwd(), "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// Handle window controls via IPC
ipcMain.on("shell:open", () => {
  const pageDirectory = __dirname.replace("app.asar", "app.asar.unpacked");
  const pagePath = path.join("file://", pageDirectory, "index.html");
  shell.openExternal(pagePath);
});
