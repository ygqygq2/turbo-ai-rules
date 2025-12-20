#!/bin/bash

# 清理测试相关的所有缓存
# 用于重现 CI 环境的干净状态

set -e

echo "🧹 Cleaning test caches for turbo-ai-rules..."

# 1. 清理全局缓存目录（最重要）
if [ -d "$HOME/.cache/.turbo-ai-rules" ]; then
  echo "🗑️  Removing global cache: ~/.cache/.turbo-ai-rules"
  rm -rf "$HOME/.cache/.turbo-ai-rules"
fi

# 2. 清理全局配置目录
if [ -d "$HOME/.config/.turbo-ai-rules" ]; then
  echo "🗑️  Removing global config: ~/.config/.turbo-ai-rules"
  rm -rf "$HOME/.config/.turbo-ai-rules"
fi

# 3. 清理 VSCode 测试目录
if [ -d ".vscode-test" ]; then
  echo "🗑️  Removing .vscode-test directory"
  rm -rf .vscode-test
fi

# 4. 清理编译输出
if [ -d "out" ]; then
  echo "🗑️  Removing out directory"
  rm -rf out
fi

# 5. 清理测试工作区生成的文件
echo "🗑️  Cleaning test workspace generated files..."
for workspace_dir in sampleWorkspace/*/; do
  if [ -d "$workspace_dir" ]; then
    workspace_name=$(basename "$workspace_dir")
    echo "  - Cleaning $workspace_name"
    
    # 清理生成的配置文件（使用 -rf 确保能删除目录）
    rm -rf "$workspace_dir/.cursorrules"
    rm -rf "$workspace_dir/.github"
    rm -rf "$workspace_dir/.continue"
    rm -rf "$workspace_dir/rules"
    rm -rf "$workspace_dir/skills"
    rm -rf "$workspace_dir/.turbo-ai-rules"
  fi
done

# 6. 清理临时测试目录
echo "🗑️  Cleaning temporary test directories in /tmp..."
find /tmp -maxdepth 1 -name "tmp-*" -type d -exec sh -c '
  if [ -d "{}/logs" ] && find "{}/logs" -path "*/exthost/ygqygq2.turbo-ai-rules" -type d | grep -q .; then
    echo "  - Removing {}"
    rm -rf "{}"
  fi
' \; 2>/dev/null || true

# 7. 清理 node_modules/.vite 缓存
if [ -d "node_modules/.vite" ]; then
  echo "🗑️  Removing node_modules/.vite cache"
  rm -rf node_modules/.vite
fi

# 8. 清理 coverage 目录
if [ -d "coverage" ]; then
  echo "🗑️  Removing coverage directory"
  rm -rf coverage
fi

echo ""
echo "✅ All caches cleaned! You can now run tests in a clean state:"
echo "   pnpm run test-compile && pnpm run test:suite:mocha"
echo ""
echo "📋 Cleaned locations:"
echo "   - ~/.cache/.turbo-ai-rules (global cache)"
echo "   - ~/.config/.turbo-ai-rules (global config)"
echo "   - .vscode-test (VSCode test runtime)"
echo "   - out (compiled output)"
echo "   - sampleWorkspace/*/* (generated files)"
echo "   - /tmp/tmp-* (temporary test directories)"
echo "   - node_modules/.vite (vite cache)"
echo "   - coverage (test coverage)"
