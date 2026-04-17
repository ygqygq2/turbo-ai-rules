import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';
import { vscodeApi } from '../utils/vscode-api';
import { AdapterCard } from './AdapterCard';
import { AdapterModal } from './AdapterModal';
import { AdapterSuiteCard } from './AdapterSuiteCard';
import { AdapterSuiteModal } from './AdapterSuiteModal';
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
  assetKinds?: AdapterAssetKind[];
}

export type AdapterAssetKind =
  | 'rule'
  | 'instruction'
  | 'skill'
  | 'agent'
  | 'prompt'
  | 'command'
  | 'hook'
  | 'mcp'
  | 'unknown';

/**
 * 预设适配器数据
 */
export interface PresetAdapter {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  outputPath: string;
  type: 'file' | 'directory' | 'merge-json';
  /** 是否为规则类型适配器 */
  isRuleType: boolean;
  assetKinds?: AdapterAssetKind[];
  /** 排序依据 */
  sortBy?: 'id' | 'priority' | 'none';
  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc';
  /** 按源组织 */
  organizeBySource?: boolean;
  /** 保留目录结构 */
  preserveDirectoryStructure?: boolean;
  /** 目录结构的相对路径基准 */
  relativePathBase?: 'source-subpath' | 'asset-root';
  /** 使用原文件名 */
  useOriginalFilename?: boolean;
  /** 生成索引 */
  generateIndex?: boolean;
  /** 每个源一个索引 */
  indexPerSource?: boolean;
}

/**
 * 自定义适配器数据
 */
export interface CustomAdapter {
  id: string;
  name: string;
  outputPath: string;
  format: 'single-file' | 'directory' | 'merge-json';
  singleFileTemplate?: string;
  directoryStructure?: {
    filePattern: string;
    pathTemplate: string;
  };
  /** 是否为规则类型适配器 */
  isRuleType: boolean;
  assetKinds?: AdapterAssetKind[];
  /** 是否启用 */
  enabled: boolean;
  /** 文件过滤扩展名 */
  fileExtensions?: string[];
  /** 是否按源组织子目录（仅目录模式） */
  organizeBySource?: boolean;
  /** 是否生成索引文件（仅目录模式） */
  generateIndex?: boolean;
  /** 是否保持目录结构（仅目录模式，false=平铺） */
  preserveDirectoryStructure?: boolean;
  /** 保留目录结构时的相对路径基准（仅目录模式） */
  relativePathBase?: 'source-subpath' | 'asset-root';
  /** 是否使用原始文件名（仅目录模式） */
  useOriginalFilename?: boolean;
  /** 索引文件名（仅目录模式） */
  indexFileName?: string;
  /** 排序依据（仅单文件模式） */
  sortBy?: 'id' | 'priority' | 'none';
  /** 排序顺序（仅单文件模式） */
  sortOrder?: 'asc' | 'desc';
  /** 是否为新增（用于区分 add/update 操作） */
  isNew?: boolean;
}

/**
 * 编辑中的自定义适配器
 */
export interface EditingAdapter extends Partial<CustomAdapter> {
  isNew?: boolean;
}

export interface AdapterSuite {
  id: string;
  name: string;
  description?: string;
  adapterIds: string[];
  enabled: boolean;
}

export interface EditingAdapterSuite extends Partial<AdapterSuite> {
  isNew?: boolean;
}

export interface SuiteMemberOption {
  id: string;
  name: string;
  outputPath: string;
  isRuleType: boolean;
  enabled: boolean;
  source: 'preset' | 'custom';
}

/**
 * Adapter Manager 主组件
 */
export const AdapterManager: React.FC = () => {
  // 状态管理
  const [presetAdapters, setPresetAdapters] = useState<PresetAdapter[]>([]);
  const [customAdapters, setCustomAdapters] = useState<CustomAdapter[]>([]);
  const [presetSuites, setPresetSuites] = useState<AdapterSuite[]>([]);
  const [customSuites, setCustomSuites] = useState<AdapterSuite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Tab 和搜索状态
  const [activeTab, setActiveTab] = useState<'preset' | 'custom' | 'suite'>('preset');
  const [activeSuiteTab, setActiveSuiteTab] = useState<'preset' | 'custom'>('preset');
  const [searchQuery, setSearchQuery] = useState('');

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdapter, setEditingAdapter] = useState<EditingAdapter | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [suiteModalOpen, setSuiteModalOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<EditingAdapterSuite | null>(null);

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

  const filteredPresetSuites = presetSuites.filter(
    (suite) =>
      suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (suite.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      suite.adapterIds.some((adapterId) => adapterId.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const filteredCustomSuites = customSuites.filter(
    (suite) =>
      suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (suite.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      suite.adapterIds.some((adapterId) => adapterId.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const suiteMemberOptions: SuiteMemberOption[] = [
    ...presetAdapters.map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      outputPath: adapter.outputPath,
      isRuleType: adapter.isRuleType,
      enabled: adapter.enabled,
      source: 'preset' as const,
    })),
    ...customAdapters.map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      outputPath: adapter.outputPath,
      isRuleType: adapter.isRuleType,
      enabled: adapter.enabled,
      source: 'custom' as const,
    })),
  ];

  const suiteMemberNameMap = new Map(suiteMemberOptions.map((option) => [option.id, option.name]));

  // 初始化数据
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'init':
          setPresetAdapters(message.payload.presetAdapters || []);
          setCustomAdapters(message.payload.customAdapters || []);
          setPresetSuites(message.payload.presetSuites || []);
          setCustomSuites(message.payload.customSuites || []);
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

        case 'saveAdapterResult':
          if (message.payload.success) {
            setSuccessMessage(t('adapterManager.adapterSaved', message.payload.name));
            setModalOpen(false);
            setEditingAdapter(null);
            setModalError(null);
            setTimeout(() => setSuccessMessage(null), 3000);
          } else {
            // 在模态框内显示错误信息
            setModalError(message.payload.message || t('adapterManager.saveFailed'));
          }
          break;

        case 'updateAdapters':
          setPresetAdapters(message.payload.presetAdapters || []);
          setCustomAdapters(message.payload.customAdapters || []);
          setPresetSuites(message.payload.presetSuites || []);
          setCustomSuites(message.payload.customSuites || []);
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
    const settings: PresetAdapterSettings = {
      id: adapter.id,
      name: adapter.name,
      type: adapter.type,
      isRuleType: adapter.isRuleType ?? true, // 默认为规则类型
      sortBy: adapter.sortBy || 'priority',
      sortOrder: adapter.sortOrder || 'asc',
      organizeBySource: adapter.organizeBySource,
      preserveDirectoryStructure: adapter.preserveDirectoryStructure,
      relativePathBase: adapter.relativePathBase,
      useOriginalFilename: adapter.useOriginalFilename,
      generateIndex: adapter.generateIndex,
      indexPerSource: adapter.indexPerSource,
    };

    setEditingPresetAdapter(settings);
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
        ? {
            ...adapter,
            sortBy: settings.sortBy,
            sortOrder: settings.sortOrder,
            organizeBySource: settings.organizeBySource,
            preserveDirectoryStructure: settings.preserveDirectoryStructure,
            relativePathBase: settings.relativePathBase,
            useOriginalFilename: settings.useOriginalFilename,
            generateIndex: settings.generateIndex,
            indexPerSource: settings.indexPerSource,
          }
        : adapter,
    );
    setPresetAdapters(updatedPresetAdapters);
    setSettingsModalOpen(false);
    setEditingPresetAdapter(null);

    // 直接保存到配置（不需要点击底部的 Save All）
    vscodeApi.postMessage('saveAll', {
      presetAdapters: updatedPresetAdapters,
      customAdapters,
      presetSuites,
      customSuites,
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
      isRuleType: true, // 默认为规则类型
      enabled: true, // 默认启用
      directoryStructure: {
        filePattern: '*.md',
        pathTemplate: '{{ruleName}}.md',
      },
    });
    setModalError(null); // 清空之前的错误
    setModalOpen(true);
  };

  /**
   * @description 打开编辑自定义适配器模态框
   * @param adapter {CustomAdapter}
   */
  const handleEditCustomAdapter = (adapter: CustomAdapter) => {
    setEditingAdapter({ ...adapter, isNew: false });
    setModalError(null); // 清空之前的错误
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

  const handleTogglePresetSuite = (suiteId: string) => {
    setPresetSuites((prev) =>
      prev.map((suite) => (suite.id === suiteId ? { ...suite, enabled: !suite.enabled } : suite)),
    );
    setHasChanges(true);
  };

  const handleToggleSuite = (suiteId: string) => {
    setCustomSuites((prev) =>
      prev.map((suite) => (suite.id === suiteId ? { ...suite, enabled: !suite.enabled } : suite)),
    );
    setHasChanges(true);
  };

  const handleAddSuite = () => {
    setEditingSuite({
      isNew: true,
      id: '',
      name: '',
      description: '',
      adapterIds: [],
      enabled: true,
    });
    setSuiteModalOpen(true);
  };

  const handleEditSuite = (suite: AdapterSuite) => {
    setEditingSuite({ ...suite, isNew: false });
    setSuiteModalOpen(true);
  };

  const handleDeleteSuite = (suiteId: string) => {
    const suite = customSuites.find((item) => item.id === suiteId);
    if (!suite) {
      return;
    }

    if (!confirm(t('adapterManager.confirmDeleteSuite'))) {
      return;
    }

    setCustomSuites((prev) => prev.filter((item) => item.id !== suiteId));
    setHasChanges(true);
  };

  const handleSaveSuite = (suite: AdapterSuite) => {
    setCustomSuites((prev) => {
      const next = [...prev];
      const index = next.findIndex((item) => item.id === suite.id);

      if (index >= 0) {
        next[index] = suite;
      } else {
        next.push(suite);
      }

      return next;
    });
    setSuiteModalOpen(false);
    setEditingSuite(null);
    setHasChanges(true);
  };

  /**
   * @description 保存适配器（新增或更新）
   * @param adapter {CustomAdapter}
   */
  const handleSaveAdapter = (adapter: CustomAdapter) => {
    // 通知 Provider 保存适配器（不在这里更新本地状态，等待 Provider 返回结果）
    vscodeApi.postMessage('saveAdapter', { adapter });
  };

  /**
   * @description 保存所有更改
   */
  const handleSaveAll = () => {
    vscodeApi.postMessage('saveAll', {
      presetAdapters,
      customAdapters,
      presetSuites,
      customSuites,
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
                <i className="codicon codicon-wrench"></i>
                {t('adapterManager.customAdapters')}
                <span className="tab-count">{filteredCustomAdapters.length}</span>
              </button>
              <button
                className={`tab ${activeTab === 'suite' ? 'active' : ''}`}
                onClick={() => setActiveTab('suite')}
              >
                <i className="codicon codicon-group-by-ref-type"></i>
                {t('adapterManager.adapterSuites')}
                <span className="tab-count">
                  {filteredPresetSuites.length + filteredCustomSuites.length}
                </span>
              </button>
            </div>
            {activeTab === 'custom' && (
              <Button type="primary" icon="add" onClick={handleAddCustomAdapter}>
                {t('adapterManager.addCustomAdapter')}
              </Button>
            )}
            {activeTab === 'suite' && activeSuiteTab === 'custom' && (
              <Button type="primary" icon="add" onClick={handleAddSuite}>
                {t('adapterManager.addCustomSuite')}
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
                      assetKinds={adapter.assetKinds}
                      sortBy={adapter.sortBy}
                      sortOrder={adapter.sortOrder}
                      isPreset={true}
                      onToggle={() => handleTogglePreset(adapter.id)}
                      onSettings={() => handleOpenPresetSettings(adapter)}
                    />
                  ))
                )}
              </div>
            ) : activeTab === 'custom' ? (
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
                        <i className="codicon codicon-wrench icon"></i>
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
                      assetKinds={adapter.assetKinds}
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
            ) : (
              <>
                <div className="subtabs-container">
                  <div className="subtabs">
                    <button
                      className={`subtab ${activeSuiteTab === 'preset' ? 'active' : ''}`}
                      onClick={() => setActiveSuiteTab('preset')}
                    >
                      <i className="codicon codicon-verified-filled"></i>
                      {t('adapterManager.presetSuites')}
                      <span className="subtab-count">{filteredPresetSuites.length}</span>
                    </button>
                    <button
                      className={`subtab ${activeSuiteTab === 'custom' ? 'active' : ''}`}
                      onClick={() => setActiveSuiteTab('custom')}
                    >
                      <i className="codicon codicon-wrench"></i>
                      {t('adapterManager.customSuites')}
                      <span className="subtab-count">{filteredCustomSuites.length}</span>
                    </button>
                  </div>
                </div>

                <div className="adapter-cards-grid">
                  {activeSuiteTab === 'preset' ? (
                    filteredPresetSuites.length === 0 ? (
                      <div className="empty-state">
                        {searchQuery ? (
                          <>
                            <i className="codicon codicon-search icon"></i>
                            <div className="message">{t('adapterManager.noMatchingSuites')}</div>
                          </>
                        ) : (
                          <>
                            <i className="codicon codicon-verified-filled icon"></i>
                            <div className="message">{t('adapterManager.noPresetSuites')}</div>
                          </>
                        )}
                      </div>
                    ) : (
                      filteredPresetSuites.map((suite) => (
                        <AdapterSuiteCard
                          key={suite.id}
                          suite={suite}
                          variant="preset"
                          memberNames={suite.adapterIds.map(
                            (adapterId) => suiteMemberNameMap.get(adapterId) || adapterId,
                          )}
                          onToggle={() => handleTogglePresetSuite(suite.id)}
                        />
                      ))
                    )
                  ) : filteredCustomSuites.length === 0 ? (
                    <div className="empty-state">
                      {searchQuery ? (
                        <>
                          <i className="codicon codicon-search icon"></i>
                          <div className="message">{t('adapterManager.noMatchingSuites')}</div>
                        </>
                      ) : (
                        <>
                          <i className="codicon codicon-group-by-ref-type icon"></i>
                          <div className="message">{t('adapterManager.noCustomSuites')}</div>
                          <Button type="primary" icon="add" onClick={handleAddSuite}>
                            {t('adapterManager.addCustomSuite')}
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredCustomSuites.map((suite) => (
                      <AdapterSuiteCard
                        key={suite.id}
                        suite={suite}
                        variant="custom"
                        memberNames={suite.adapterIds.map(
                          (adapterId) => suiteMemberNameMap.get(adapterId) || adapterId,
                        )}
                        onToggle={() => handleToggleSuite(suite.id)}
                        onEdit={() => handleEditSuite(suite)}
                        onDelete={() => handleDeleteSuite(suite.id)}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 添加/编辑模态框 */}
      {modalOpen && editingAdapter && (
        <AdapterModal
          adapter={editingAdapter}
          isNew={editingAdapter.isNew ?? true}
          serverError={modalError}
          onSave={handleSaveAdapter}
          onClose={() => {
            setModalOpen(false);
            setEditingAdapter(null);
            setModalError(null);
          }}
        />
      )}

      {/* 预设适配器设置弹出框 */}
      {settingsModalOpen && editingPresetAdapter && (
        <PresetSettingsModal
          adapter={{
            id: editingPresetAdapter.id,
            name: editingPresetAdapter.name,
            type: editingPresetAdapter.type,
            isRuleType: editingPresetAdapter.isRuleType,
            sortBy: editingPresetAdapter.sortBy || 'priority',
            sortOrder: editingPresetAdapter.sortOrder || 'asc',
            organizeBySource: editingPresetAdapter.organizeBySource,
            preserveDirectoryStructure: editingPresetAdapter.preserveDirectoryStructure,
            relativePathBase: editingPresetAdapter.relativePathBase,
            useOriginalFilename: editingPresetAdapter.useOriginalFilename,
            generateIndex: editingPresetAdapter.generateIndex,
            indexPerSource: editingPresetAdapter.indexPerSource,
          }}
          onSave={handleSavePresetSettings}
          onClose={() => {
            setSettingsModalOpen(false);
            setEditingPresetAdapter(null);
          }}
        />
      )}

      {suiteModalOpen && editingSuite && (
        <AdapterSuiteModal
          suite={editingSuite}
          isNew={editingSuite.isNew ?? true}
          existingSuites={customSuites}
          availableAdapters={suiteMemberOptions}
          onSave={handleSaveSuite}
          onClose={() => {
            setSuiteModalOpen(false);
            setEditingSuite(null);
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
