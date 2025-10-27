// Get VS Code API
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

// Helper function to send messages
function sendMessage(type: string, payload?: any) {
  vscode.postMessage({ type, payload });
}

// Event handlers
document.getElementById('addSourceBtn')?.addEventListener('click', () => {
  sendMessage('addSource');
});

document.getElementById('syncRulesBtn')?.addEventListener('click', () => {
  sendMessage('syncRules');
});

document.getElementById('generateConfigsBtn')?.addEventListener('click', () => {
  sendMessage('generateConfigs');
});

document.querySelectorAll('.template-card').forEach((card) => {
  card.addEventListener('click', () => {
    const template = card.getAttribute('data-template');
    if (template) {
      sendMessage('useTemplate', { type: template });
    }
  });
});

document.getElementById('viewDocsBtn')?.addEventListener('click', () => {
  sendMessage('viewDocs');
});

document.getElementById('getHelpBtn')?.addEventListener('click', () => {
  sendMessage('getHelp');
});

document.getElementById('dismissBtn')?.addEventListener('click', () => {
  sendMessage('dismiss');
});
