import React from 'react';
import { Icon } from '../components/Icon';
import '../global.css';
import './rule-selector.css';

/**
 * RuleSelector App 入口
 * 负责渲染规则树、选择、统计、保存等 UI
 */
export const App: React.FC = () => {
  // TODO: 1. 从 VSCode API 获取规则树数据
  // TODO: 2. 实现选择/全选/反选/重置/保存等交互
  // TODO: 3. 统计信息展示
  // TODO: 4. 响应式布局
  // TODO: 5. 消息通信

  return (
    <div className="rule-selector-container">
      {/* Header */}
      <header className="rule-selector-header">
        <span className="title">
          <Icon icon="list-tree" size={20} /> 选择同步规则
        </span>
        <button className="button button-secondary" style={{ marginLeft: 'auto' }}>
          关闭
        </button>
      </header>
      {/* Toolbar */}
      <div className="rule-selector-toolbar">
        <input className="input" placeholder="搜索目录/文件/标签..." style={{ width: 220 }} />
        <button className="button button-secondary">
          <Icon icon="check-all" /> 全选
        </button>
        <button className="button button-secondary">
          <Icon icon="circle-slash" /> 清除
        </button>
        <button className="button button-secondary">
          <Icon icon="refresh" /> 重置
        </button>
      </div>
      {/* Statistics */}
      <div className="rule-selector-stats">
        <span>
          总规则数: <b>156</b>
        </span>
        <span>
          已选: <b>120</b>
        </span>
        <span>
          排除: <b>36</b>
        </span>
      </div>
      {/* Tree (占位) */}
      <div className="rule-selector-tree">
        <div className="tree-placeholder">[规则树区域，待实现]</div>
      </div>
      {/* Footer */}
      <footer className="rule-selector-footer">
        <button className="button button-secondary">取消</button>
        <button className="button button-primary">保存</button>
      </footer>
    </div>
  );
};
