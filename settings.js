// Default settings
const DEFAULT_SETTINGS = {
  enabled: true
};

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enableToggle');
  const statusMessage = document.getElementById('statusMessage');

  // Load settings from Chrome storage
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  enableToggle.checked = settings.enabled;

  // Save settings when toggle changes
  enableToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;

    // Save to Chrome storage
    await chrome.storage.sync.set({ enabled });

    // Show confirmation message
    statusMessage.classList.add('show');
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 2000);

    // Notify content scripts to update
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateSettings',
        settings: { enabled }
      }).catch(() => {
        // Tab might not have content script loaded, that's okay
      });
    }
  });
});
