// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All APIs exposed by the context bridge are available here.
const { ipcRenderer } = require("electron");

// Listen for deep-link event from main process
ipcRenderer.on("deep-link", (event, data) => {
  displayDeepLinkData(data);
});

function displayDeepLinkData(data) {
  const dataContainer = document.getElementById("data-container");
  if (!dataContainer) return;

  dataContainer.innerHTML = `
    <h2>Deep Link Data</h2>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  `;
}

// Binds the buttons to the context bridge API.
document.getElementById("open-in-browser").addEventListener("click", () => {
  window.shell.open();
});
