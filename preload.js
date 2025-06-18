import { contextBridge, ipcRenderer } from "electron/renderer";

contextBridge.exposeInMainWorld('electron' ,{
  ipcRenderer: {
    on(channel, func) {
      const validChannels = ['deep-link'];
      if(validChannels.includes(channel)) {
        // striping down event
        ipcRenderer.on(channel, (event, ...args) => func(args));
      }
    }
  }
})

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
