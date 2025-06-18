// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All APIs exposed by the context bridge are available here.

// Listen for deep-link event from main process
window.electron.ipcRenderer.on("deep-link", (data) => {
  // data is already the first argument, no need to destructure
  displayDeepLinkData(data);
});

function displayDeepLinkData(data) {
  const dataContainer = document.getElementById("data-container");
  if (!dataContainer) return;

  console.log("Working script");

  dataContainer.innerHTML = `
    <h2>Deep Link Data Received!</h2>
    <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; font-family: monospace;">
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
  `;
}

// Check if there's a button for opening in browser
const browserButton = document.getElementById("open-in-browser");
if (browserButton) {
  browserButton.addEventListener("click", () => {
    window.shell.open();
  });
}