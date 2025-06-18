const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("shell", {
  open: () => ipcRenderer.send("shell:open"),
  ipcRenderer: {
    on: (channel, listener) => {
      const validChannels = ["deep-link"];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
      }
    },
  },
});
