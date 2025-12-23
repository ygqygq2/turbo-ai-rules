import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';
import { vscodeApi } from '../utils/vscode-api';
import { AdapterCard } from './AdapterCard';
import { AdapterModal } from './AdapterModal';
import { PresetSettingsModal, PresetAdapterSettings } from './PresetSettingsModal';

/**
 * 适配器类型定义
 */
export interface AdapterConfig {
  name: string;
  enabled: boolean;
  outputPath: string;
  /** 是否为规则类型适配器 (true=rules, false=skills) */
  isRuleType?: boolean;
}

/**
 * 预设适配器数据
 */
export interface PresetAdapter {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  outputPath: string;
  /** 是否为规则类型适配器 */
  isRuleType: boolean;
  /** 排序依据 */
  sortBy?: 'id' | 'priority' | 'none';
  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 自定义适配器数据
 */
export interface CustomAdapter {
  id: string;
  name: string;
  outputPath: string;
  format: 'single-file' | 'directory';
  singleFileTemplate?: string;
  directoryStructure?: {
    filePattern: string;
    pathTemplate: string;
  };
  /** 是否为规则类型适配器 */
  isRuleType: boolean;
  /** 是否启用 */
  enabled: boolean;
  /** 文件过滤扩展名 */
  fileExtensions?: string[];
  /** 是否按源组织子目录 */
  organizeBySource?: boolean;
  /** 是否生成索引文件 */
  generateIndex?: boolean;
  /** 排序依据（仅单文件模式） */
  sortBy?: 'id' | 'priority' | 'none';
  /** 排序顺序（仅单文件模式） */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 编辑中的自定义适配器
 */
export interface EditingAdapter extends Partial<CustomAdapter> {
  isNew?: boolean;
}

/**
 * Adapter Manager 主组件
 */
export const AdapterManager: React.FC = () => {
  // 状态管理
  const [presetAdapters, setPresetAdapters] = useState<PresetAdapter[]>([]);
  const [customAdapters, setCustomAdapters] = useState<CustomAdapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Tab 和搜索状态
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const [searchQuery, setSearchQuery] = useState('');

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdapter, setEditingAdapter] = useState<EditingAdapter | null>(null);

  // 预设适配器设置弹出框状态
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editingPresetAdapter, setEditingPresetAdapter] = useState<PresetAdapter | null>(null);

  // 过滤后的适配器列表
  const filteredPresetAdapters = presetAdapters.filter(
    (adapter) =>
      adapter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adapter.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredCustomAdapters = customAdapters.filter(
    (adapter) =>
      adapter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adapter.outputPath.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 初始化数据
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'init':
          setPresetAdapters(message.payload.presetAdapters || []);
          setCustomAdapters(message.payload.customAdapters || []);
          setIsLoading(false);
          break;

        case 'saveResult':
          if (message.payload.success) {
            setSuccessMessage(t('adapterManager.saveSuccess'));
            setHasChanges(false);
            setTimeout(() => setSuccessMessage(null), 3000);
          } else {
            setError(message.payload.message || t('adapterManager.saveFailed'));
            setTimeout(() => setError(null), 5000);
          }
          break;

        case 'updateAdapters':
          setPresetAdapters(message.payload.presetAdapters || []);
          setCustomAdapters(message.payload.customAdapters || []);
          setHasChanges(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // 请求初始化数据
    vscodeApi.postMessage('ready');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * @description 切换预设适配器启用状态
   * @param adapterId {string}
   */
  const handleTogglePreset = (adapterId: string) => {
    setPresetAdapters((prev) =>
      prev.map((adapter) =>
        adapter.id === adapterId ? { ...adapter, enabled: !adapter.enabled } : adapter,
      ),
    );
    setHasChanges(true);
  };

  /**
   * @description 打开预设适配器设置弹出框
   * @param adapter {PresetAdapter}
   */
  const handleOpenPresetSettings = (adapter: PresetAdapter) => {
    setEditingPresetAdapter(adapter);
    setSettingsModalOpen(true);
  };

  /**
   * @description 保存预设适配器设置（直接持久化到配置）
   * @param settings {PresetAdapterSettings}
   */
  const handleSavePresetSettings = (settings: PresetAdapterSettings) => {
    // 更新本地状态
    const updatedPresetAdapters = presetAdapters.map((adapter) =>
      adapter.id === settings.id
        ? { ...adapter, sortBy: settings.sortBy, sortOrder: settings.sortOrder }
        : adapter,
    );
    setPresetAdapters(updatedPresetAdapters);
    setSettingsModalOpen(false);
    setEditingPresetAdapter(null);

    // 直接保存到配置（不需要点击底部的 Save All）
    vscodeApi.postMessage('saveAll', {
      presetAdapters: updatedPresetAdapters,
      customAdapters,
    });
  };

  /**
   * @description 切换自定义适配器启用状态
   * @param adapterId {string}
   */
  const handleToggleCustom = (adapterId: string) => {
    setCustomAdapters((prev) =>
      prev.map((adapter) =>
        adapter.id === adapterId ? { ...adapter, enabled: !adapter.enabled } : adapter,
      ),
    );
    setHasChanges(true);
  };

  /**
   * @description 打开添加自定义适配器模态框
   */
  const handleAddCustomAdapter = () => {
    setEditingAdapter({
      isNew: true,
      id: '',
      name: '',
      outputPath: '',
      format: 'directory', // 默认为目录格式
      isRuleType: false, // 默认为技能类型
      enabled: true, // 默认启用
      directoryStructure: {
        filePattern: '*.md',
        pathTemplate: '{{ruleName}}.md',
      },
    });
    setModalOpen(true);
  };

  /**
   * @description 打开编辑自定义适配器模态框
   * @param adapter {CustomAdapter}
   */
  const handleEditCustomAdapter = (adapter: CustomAdapter) => {
    setEditingAdapter({ ...adapter, isNew: false });
    setModalOpen(true);
  };

  /**
   * @description 删除自定义适配器
   * @param adapterId {string}
   */
  const handleDeleteCustomAdapter = (adapterId: string) => {
    const adapter = customAdapters.find((a) => a.id === adapterId);
    if (adapter) {
      // 发送删除请求到 Provider（Provider 会显示确认对话框）
      vscodeApi.postMessage('deleteAdapter', { id: adapterId, name: adapter.name });
    }
  };

  /**
   * @description 保存适配器（新增或更新）
   * @param adapter {CustomAdapter}
   */
  const handleSaveAdapter = (adapter: CustomAdapter) => {
    if (editingAdapter?.isNew) {
      // 新增适配器
      setCustomAdapters((prev) => [...prev, adapter]);
    } else {
      // 更新适配器
      setCustomAdapters((prev) => prev.map((a) => (a.id === adapter.id ? adapter : a)));
    }
    setModalOpen(false);
    setEditingAdapter(null);
    setHasChanges(true);

    // 通知 Provider 保存适配器
    vscodeApi.postMessage('saveAdapter', { adapter });
  };

  /**
   * @description 保存所有更改
   */
  const handleSaveAll = () => {
    vscodeApi.postMessage('saveAll', {
      presetAdapters,
      customAdapters,
    });
  };

  /**
   * @description 取消并关闭
   */
  const handleCancel = () => {
    if (hasChanges && !confirm(t('adapterManager.discardChanges'))) {
      return;
    }
    vscodeApi.postMessage('cancel');
  };

  return (
    <div className="adapter-manager-container">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-content">
          <h1>{t('adapterManager.title')}</h1>
          <p className="subtitle">{t('adapterManager.subtitle')}</p>
        </div>
      </div>

      {/* 消息显示 */}
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* 主内容区 */}
      {isLoading ? (
        <div className="loading">
          <i className="codicon codicon-sync codicon-modifier-spin"></i>
          <span>{t('loading')}</span>
        </div>
      ) : (
        <div className="adapter-content">
          {/* 搜索框 */}
          <div className="search-bar">
            <i className="codicon codicon-search"></i>
            <input
              type="text"
              placeholder={t('adapterManager.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery('')}
                title={t('common.clear')}
              >
                <i className="codicon codicon-close"></i>
              </button>
            )}
          </div>

          {/* Tab 切换 */}
          <div className="tabs-container">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'preset' ? 'active' : ''}`}
                onClick={() => setActiveTab('preset')}
              >
                <i className="codicon codicon-verified-filled"></i>
                {t('adapterManager.presetAdapters')}
                <span className="tab-count">{filteredPresetAdapters.length}</span>
              </button>
              <button
                className={`tab ${activeTab === 'custom' ? 'active' : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                <i className="codicon codicon-symbol-property"></i>
                {t('adapterManager.customAdapters')}
                <span className="tab-count">{filteredCustomAdapters.length}</span>
              </button>
            </div>
            {activeTab === 'custom' && (
              <Button type="primary" icon="add" onClick={handleAddCustomAdapter}>
                {t('adapterManager.addCustomAdapter')}
              </Button>
            )}
          </div>

          {/* Tab 内容 */}
          <div className="tab-content">
            {activeTab === 'preset' ? (
              <div className="adapter-cards-grid">
                {filteredPresetAdapters.length === 0 ? (
                  <div className="empty-state">
                    <i className="codicon codicon-search icon"></i>
                    <div className="message">{t('adapterManager.noMatchingAdapters')}</div>
                  </div>
                ) : (
                  filteredPresetAdapters.map((adapter) => (
                    <AdapterCard
                      key={adapter.id}
                      name={adapter.name}
                      description={adapter.description}
                      enabled={adapter.enabled}
                      outputPath={adapter.outputPath}
                      isRuleType={adapter.isRuleType}
                      sortBy={adapter.sortBy}
                      sortOrder={adapter.sortOrder}
                      isPreset={true}
                      onToggle={() => handleTogglePreset(adapter.id)}
                      onSettings={() => handleOpenPresetSettings(adapter)}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="adapter-cards-grid">
                {filteredCustomAdapters.length === 0 ? (
                  <div className="empty-state">
                    {searchQuery ? (
                      <>
                        <i className="codicon codicon-search icon"></i>
                        <div className="message">{t('adapterManager.noMatchingAdapters')}</div>
                      </>
                    ) : (
                      <>
                        <i className="codicon codicon-symbol-misc icon"></i>
                        <div className="message">{t('adapterManager.noCustomAdapters')}</div>
                        <Button type="primary" icon="add" onClick={handleAddCustomAdapter}>
                          {t('adapterManager.addCustomAdapter')}
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  filteredCustomAdapters.map((adapter) => (
                    <AdapterCard
                      key={adapter.id}
                      name={adapter.name}
                      outputPath={adapter.outputPath}
                      isRuleType={adapter.isRuleType}
                      enabled={adapter.enabled}
                      format={adapter.format}
                      fileExtensions={adapter.fileExtensions}
                      organizeBySource={adapter.organizeBySource}
                      sortBy={adapter.sortBy}
                      sortOrder={adapter.sortOrder}
                      isPreset={false}
                      onToggle={() => handleToggleCustom(adapter.id)}
                      onEdit={() => handleEditCustomAdapter(adapter)}
                      onDelete={() => handleDeleteCustomAdapter(adapter.id)}
                      onSettings={() => handleEditCustomAdapter(adapter)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 添加/编辑模态框 */}
      {modalOpen && editingAdapter && (
        <AdapterModal
          adapter={editingAdapter}
          isNew={editingAdapter.isNew ?? true}
          onSave={handleSaveAdapter}
          onClose={() => {
            setModalOpen(false);
            setEditingAdapter(null);
          }}
        />
      )}

      {/* 预设适配器设置弹出框 */}
      {settingsModalOpen && editingPresetAdapter && (
        <PresetSettingsModal
          adapter={{
            id: editingPresetAdapter.id,
            name: editingPresetAdapter.name,
            sortBy: editingPresetAdapter.sortBy || 'priority',
            sortOrder: editingPresetAdapter.sortOrder || 'asc',
          }}
          onSave={handleSavePresetSettings}
          onClose={() => {
            setSettingsModalOpen(false);
            setEditingPresetAdapter(null);
          }}
        />
      )}

      {/* 底部操作栏（固定） */}
      <div className="footer-actions">
        {hasChanges && (
          <span className="changes-indicator">
            <i className="codicon codicon-warning"></i>
            {t('adapterManager.unsavedChanges')}
          </span>
        )}
        <div className="footer-buttons">
          <Button type="secondary" icon="close" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" icon="save" onClick={handleSaveAll} disabled={!hasChanges}>
            {t('adapterManager.saveAll')}
          </Button>
        </div>
      </div>
    </div>
  );
};
