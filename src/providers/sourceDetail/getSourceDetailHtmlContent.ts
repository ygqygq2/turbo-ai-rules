import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function getSourceDetailHtmlContent(
  sourceId: string | undefined,
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
): string {
  const htmlPath = path.join(
    context.extensionPath,
    'out',
    'webview',
    'src',
    'webview',
    'source-detail',
    'index.html',
  );
  let html = fs.readFileSync(htmlPath, 'utf-8');
  const cspSource = webview.cspSource || '';
  html = html.replace(/\{\{cspSource\}\}/g, cspSource);
  html = html.replace(/(?:src|href)="\/([^"]+)"/g, (match, resourcePath) => {
    const assetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'out', 'webview', resourcePath),
    );
    return match.replace(`/${resourcePath}`, assetUri.toString());
  });
  if (sourceId === 'new') {
    html = html.replace('</head>', '<script>window.initialMode = "new";</script></head>');
  }
  // 注入运行时基准路径（用于修正构建产物中以 `/` 开头的资源请求）
  const webviewBase = webview
    .asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'out', 'webview'))
    .toString();
  const fixupScript = `
    <script>
      // Provide base URL for runtime asset resolution inside Webview
      window.__TAI_WEBVIEW_BASE = ${JSON.stringify(webviewBase)};
      (function(){
        const base = window.__TAI_WEBVIEW_BASE || '';
        try{
          // Patch HTMLLinkElement.href setter to rewrite absolute '/path' to webview base
          const proto = HTMLLinkElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'href');
          Object.defineProperty(proto, 'href', {
            set: function(v) {
              try {
                if (typeof v === 'string' && v.startsWith('/')) {
                  v = base + v.slice(1);
                }
              } catch(e){}
              if (desc && desc.set) return desc.set.call(this, v);
              return this.setAttribute('href', v);
            },
            get: function() {
              return desc && desc.get ? desc.get.call(this) : this.getAttribute('href');
            },
            configurable: true
          });
        }catch(e){/* ignore */}
      })();
    </script>
  `;

  html = html.replace('</head>', fixupScript + '</head>');
  return html;
}
