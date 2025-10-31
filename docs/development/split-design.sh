#!/bin/bash

# 拆分 01-design.md 为多个子文档

SOURCE="01-design.md"
OUTPUT_DIR="."

# 提取指定行范围到文件
extract_section() {
    local start=$1
    local end=$2
    local output=$3
    local title=$4
    
    echo "创建: $output (行 $start - $end)"
    {
        echo "# $title"
        echo ""
        sed -n "${start},${end}p" "$SOURCE"
    } > "$output"
}

# 1. 项目背景 (19-48行)
extract_section 19 48 "01-01-background.md" "项目背景与目标"

# 2. 核心理念 (49-73行)
extract_section 49 73 "01-02-core-concepts.md" "核心理念与设计原则"

# 3. 架构设计 (74-178行，包含UI交互流程)
extract_section 74 178 "01-03-architecture.md" "顶层架构设计"

# 4. 存储策略 (部分，需手动调整)
extract_section 206 430 "01-04-storage-strategy.md" "存储与缓存策略"

# 5. 适配器设计 (包含 AI Adapter 相关)
extract_section 431 600 "01-05-adapter-design.md" "适配器架构设计"

# 6. 配置与同步 (包含配置结构和同步策略)
extract_section 601 750 "01-06-config-sync.md" "配置系统与同步策略"

# 7. 解析器与验证 (双模式解析、验证策略)
extract_section 769 1000 "01-07-parser-validator.md" "规则解析与验证"

# 8. 数据模型 (剩余部分)
extract_section 1001 1152 "01-08-data-model.md" "数据模型设计"

echo ""
echo "✅ 拆分完成！生成的子文档："
ls -1 01-0*.md | grep -v "01-design.md"

