import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';
import { vscodeApi } from '../utils/vscode-api';
import { AdapterCard } from './AdapterCard';
import { AdapterModal } from './AdapterModal';

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

  // 分页状态
  const [presetPage, setPresetPage] = useState(1);
  const [customPage, setCustomPage] = useState(1);
  const PAGE_SIZE = 6; // 每页显示6个

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdapter, setEditingAdapter] = useState<EditingAdapter | null>(null);

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
        pathTemplate: '{{ruleId}}.md',
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
    if (adapter && confirm(t('adapterManager.confirmDelete', { name: adapter.name }))) {
      setCustomAdapters((prev) => prev.filter((a) => a.id !== adapterId));
      setHasChanges(true);
      // 通知 Provider 删除适配器
      vscodeApi.postMessage('deleteAdapter', { id: adapterId });
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

  // 计算分页数据
  const presetTotalPages = Math.ceil(presetAdapters.length / PAGE_SIZE);
  const customTotalPages = Math.ceil(customAdapters.length / PAGE_SIZE);

  const paginatedPresetAdapters = presetAdapters.slice(
    (presetPage - 1) * PAGE_SIZE,
    presetPage * PAGE_SIZE,
  );

  const paginatedCustomAdapters = customAdapters.slice(
    (customPage - 1) * PAGE_SIZE,
    customPage * PAGE_SIZE,
  );

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
        <div className="adapter-sections">
          {/* 预设适配器区块 */}
          <section className="adapter-section preset-section">
            <div className="section-header">
              <h2>
                <i className="codicon codicon-package"></i>
                {t('adapterManager.presetAdapters')}
              </h2>
              <span className="section-description">{t('adapterManager.presetAdaptersDesc')}</span>
            </div>
            <div className="adapter-section-content">
              <div className="adapter-cards-container">
                <div className="adapter-cards-grid">
                  {paginatedPresetAdapters.map((adapter) => (
                    <AdapterCard
                      key={adapter.id}
                      name={adapter.name}
                      description={adapter.description}
                      enabled={adapter.enabled}
                      outputPath={adapter.outputPath}
                      isRuleType={adapter.isRuleType}
                      isPreset={true}
                      onToggle={() => handleTogglePreset(adapter.id)}
                    />
                  ))}
                </div>
              </div>
              {presetTotalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    onClick={() => setPresetPage((p) => Math.max(1, p - 1))}
                    disabled={presetPage === 1}
                  >
                    <i className="codicon codicon-chevron-left"></i>
                    {t('common.previous')}
                  </button>
                  <span className="pagination-info">
                    {presetPage} / {presetTotalPages}
                  </span>
                  <button
                    className="pagination-button"
                    onClick={() => setPresetPage((p) => Math.min(presetTotalPages, p + 1))}
                    disabled={presetPage === presetTotalPages}
                  >
                    {t('common.next')}
                    <i className="codicon codicon-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 自定义适配器区块 */}
          <section className="adapter-section custom-section">
            <div className="section-header">
              <h2>
                <i className="codicon codicon-symbol-misc"></i>
                {t('adapterManager.customAdapters')}
              </h2>
              <span className="section-description">{t('adapterManager.customAdaptersDesc')}</span>
              <Button type="primary" icon="add" onClick={handleAddCustomAdapter}>
                {t('adapterManager.addCustomAdapter')}
              </Button>
            </div>
            <div className="adapter-section-content">
              {customAdapters.length === 0 ? (
                <div className="empty-state">
                  <i className="codicon codicon-symbol-misc icon"></i>
                  <div className="message">{t('adapterManager.noCustomAdapters')}</div>
                  <Button type="primary" icon="add" onClick={handleAddCustomAdapter}>
                    {t('adapterManager.addCustomAdapter')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="adapter-cards-container">
                    <div className="adapter-cards-grid">
                      {paginatedCustomAdapters.map((adapter) => (
                        <AdapterCard
                          key={adapter.id}
                          name={adapter.name}
                          outputPath={adapter.outputPath}
                          isRuleType={adapter.isRuleType}
                          enabled={adapter.enabled}
                          format={adapter.format}
                          fileExtensions={adapter.fileExtensions}
                          organizeBySource={adapter.organizeBySource}
                          isPreset={false}
                          onToggle={() => handleToggleCustom(adapter.id)}
                          onEdit={() => handleEditCustomAdapter(adapter)}
                          onDelete={() => handleDeleteCustomAdapter(adapter.id)}
                        />
                      ))}
                    </div>
                  </div>
                  {customTotalPages > 1 && (
                    <div className="pagination">
                      <button
                        className="pagination-button"
                        onClick={() => setCustomPage((p) => Math.max(1, p - 1))}
                        disabled={customPage === 1}
                      >
                        <i className="codicon codicon-chevron-left"></i>
                        {t('common.previous')}
                      </button>
                      <span className="pagination-info">
                        {customPage} / {customTotalPages}
                      </span>
                      <button
                        className="pagination-button"
                        onClick={() => setCustomPage((p) => Math.min(customTotalPages, p + 1))}
                        disabled={customPage === customTotalPages}
                      >
                        {t('common.next')}
                        <i className="codicon codicon-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
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
