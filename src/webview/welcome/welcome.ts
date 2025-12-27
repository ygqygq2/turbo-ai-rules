// Get VS Code API
declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
const vscodeWelcome = acquireVsCodeApi();

// Helper function to send messages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendMessage(type: string, payload?: any) {
  vscodeWelcome.postMessage({ type, payload });
}

// Event handlers
document.getElementById('addSourceBtn')?.addEventListener('click', () => {
  sendMessage('addSource');
});

document.getElementById('syncRulesBtn')?.addEventListener('click', () => {
  sendMessage('syncRules');
});

document.getElementById('generateRulesBtn')?.addEventListener('click', () => {
  sendMessage('generateRules');
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
