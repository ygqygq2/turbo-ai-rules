// Get VS Code API
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

// Request statistics data
vscode.postMessage({ type: 'getStatistics' });
