/**
 * 搜索页面脚本
 */

import { vscodeApi, escapeHtml } from '../utils/vscode-api';

interface SearchCriteria {
  namePattern?: string;
  contentPattern?: string;
  tags?: string[];
  priority?: string;
  source?: string;
}

interface SearchResultItem {
  rule: {
    id: string;
    title: string;
    priority: string;
    tags: string[];
    sourceId: string;
    description: string;
  };
  matchedFields: string[];
}

// DOM 元素
const namePatternInput = document.getElementById('namePattern') as HTMLInputElement;
const contentPatternInput = document.getElementById('contentPattern') as HTMLInputElement;
const tagsInput = document.getElementById('tags') as HTMLInputElement;
const prioritySelect = document.getElementById('priority') as HTMLSelectElement;
const sourceInput = document.getElementById('source') as HTMLInputElement;
const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const clearHistoryBtn = document.getElementById('clearHistoryBtn') as HTMLButtonElement;
const exportJsonBtn = document.getElementById('exportJsonBtn') as HTMLButtonElement;
const exportCsvBtn = document.getElementById('exportCsvBtn') as HTMLButtonElement;
const historySection = document.getElementById('historySection') as HTMLDivElement;
const historyList = document.getElementById('historyList') as HTMLDivElement;
const resultsCount = document.getElementById('resultsCount') as HTMLDivElement;
const resultsList = document.getElementById('resultsList') as HTMLDivElement;
const exportButtons = document.getElementById('exportButtons') as HTMLDivElement;

/**
 * 执行搜索
 */
function performSearch(): void {
  const tagsValue = tagsInput.value;
  const tags = tagsValue
    ? tagsValue
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const criteria: SearchCriteria = {
    namePattern: namePatternInput.value,
    contentPattern: contentPatternInput.value,
    tags,
    priority: prioritySelect.value || undefined,
    source: sourceInput.value,
  };

  vscodeApi.postMessage('search', criteria);
}

/**
 * 重置表单
 */
function resetForm(): void {
  namePatternInput.value = '';
  contentPatternInput.value = '';
  tagsInput.value = '';
  prioritySelect.value = '';
  sourceInput.value = '';
}

/**
 * 从历史加载搜索条件
 */
function loadCriteria(criteria: SearchCriteria): void {
  namePatternInput.value = criteria.namePattern || '';
  contentPatternInput.value = criteria.contentPattern || '';
  tagsInput.value = (criteria.tags || []).join(', ');
  prioritySelect.value = criteria.priority || '';
  sourceInput.value = criteria.source || '';
  performSearch();
}

/**
 * 显示搜索结果
 */
function displayResults(results: SearchResultItem[]): void {
  resultsCount.textContent = `Results (${results.length} found)`;
  exportButtons.style.display = results.length > 0 ? 'flex' : 'none';

  if (results.length === 0) {
    resultsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div>No results found</div>
      </div>
    `;
    return;
  }

  resultsList.innerHTML = results
    .map((result) => {
      const priorityClass = `priority-${result.rule.priority}`;
      const priorityIcon =
        result.rule.priority === 'high' ? '🔥' : result.rule.priority === 'medium' ? '⚠️' : 'ℹ️';

      return `
        <div class="result-item ${priorityClass}">
          <div class="result-header">
            <div class="result-title">${priorityIcon} ${escapeHtml(result.rule.title)}</div>
            <button class="view-button" onclick="viewRule('${escapeHtml(
              result.rule.id,
            )}')">View</button>
          </div>
          <div class="result-meta">
            <span class="badge">Source: ${escapeHtml(result.rule.sourceId)}</span>
            ${result.rule.tags
              .map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`)
              .join('')}
          </div>
          ${
            result.rule.description
              ? `<div class="result-description">${escapeHtml(result.rule.description)}</div>`
              : ''
          }
          <div class="matched-fields">✓ Matched: ${result.matchedFields.join(', ')}</div>
        </div>
      `;
    })
    .join('');
}

/**
 * 显示搜索历史
 */
function displayHistory(history: SearchCriteria[]): void {
  if (history.length === 0) {
    historySection.style.display = 'none';
    return;
  }

  historySection.style.display = 'block';
  historyList.innerHTML = history
    .map((criteria, index) => {
      const parts: string[] = [];
      if (criteria.namePattern) parts.push(`name: "${criteria.namePattern}"`);
      if (criteria.contentPattern) parts.push(`content: "${criteria.contentPattern}"`);
      if (criteria.tags && criteria.tags.length > 0)
        parts.push(`tags: ${criteria.tags.join(', ')}`);
      if (criteria.priority) parts.push(`priority: ${criteria.priority}`);
      if (criteria.source) parts.push(`source: "${criteria.source}"`);

      const criteriaJson = JSON.stringify(criteria).replace(/'/g, '&apos;');

      return `
        <div class="history-item" data-criteria='${criteriaJson}'>
          <div style="font-weight: 600;">• Search #${index + 1}</div>
          <div class="history-summary">${parts.join(' | ')}</div>
        </div>
      `;
    })
    .join('');

  // 添加历史项点击事件
  historyList.querySelectorAll('.history-item').forEach((item) => {
    item.addEventListener('click', () => {
      const criteriaStr = item.getAttribute('data-criteria');
      if (criteriaStr) {
        const criteria = JSON.parse(criteriaStr);
        loadCriteria(criteria);
      }
    });
  });
}

/**
 * 查看规则
 */
function viewRule(ruleId: string): void {
  vscodeApi.postMessage('viewRule', { ruleId });
}

// 全局函数供 HTML 调用
(window as any).viewRule = viewRule;

/**
 * 处理来自扩展的消息
 */
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'searchResults':
      displayResults(message.payload.results);
      break;
    case 'searchHistory':
      displayHistory(message.payload.history);
      break;
    case 'error':
      alert(message.payload.message);
      break;
  }
});

// 事件监听
searchBtn.addEventListener('click', performSearch);
resetBtn.addEventListener('click', resetForm);
clearHistoryBtn.addEventListener('click', () => vscodeApi.postMessage('clearHistory'));
exportJsonBtn.addEventListener('click', () =>
  vscodeApi.postMessage('exportResults', { format: 'json' }),
);
exportCsvBtn.addEventListener('click', () =>
  vscodeApi.postMessage('exportResults', { format: 'csv' }),
);

// 快捷过滤器
document.querySelectorAll('.quick-filter').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const filter = (e.target as HTMLElement).getAttribute('data-filter');
    if (filter) {
      prioritySelect.value = filter;
      performSearch();
    }
  });
});

// 回车键搜索
[namePatternInput, contentPatternInput, tagsInput, sourceInput].forEach((input) => {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
});

// 初始化：加载搜索历史
vscodeApi.postMessage('loadHistory');
