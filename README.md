# Turbo AI Rules

<div align="center">

🚀 **Sync AI coding rules from external Git repositories and automatically generate configuration files for various AI tools**

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ygqygq2.turbo-ai-rules.svg?color=07c160&label=turbo-ai-rules&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=ygqygq2.turbo-ai-rules)
![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/ygqygq2.turbo-ai-rules)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

[English](./README.md) | [中文文档](./README.zh.md)

</div>

---

## 📑 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration Guide](#configuration-guide)
- [Rule File Format](#rule-file-format)
- [How It Works](#how-it-works)
- [FAQ](#faq)
- [Development](#development)

---

## ✨ Features

- 🌐 **Multi-Source Support**: Sync rules from multiple Git repositories with unified management
- 🔄 **Auto Sync**: Schedule or manually sync rule updates to stay current
- 🎯 **Smart Adapters**: Automatically generate config files for different AI tools
  - `.cursorrules` (Cursor)
  - `.github/.copilot-instructions.md` (GitHub Copilot)
  - `.continuerules` (Continue)
  - **Custom Adapters**: Configure unlimited custom outputs (file or directory)
  - Default `rules/` directory adapter included (generic rules, organized by source)
- 🔍 **Rule Search**: Quickly find and browse rules with fuzzy search support
- ⚙️ **Conflict Resolution**: Intelligently handle duplicate rules (priority/skip strategies)
- 🔐 **Private Repositories**: Support Token authentication for private repos
- 📊 **Visual Management**: Tree view and status bar integration for intuitive operation
- 🌍 **Multi-Language**: UI supports English/Chinese switching

---

## 🚀 Quick Start

### 📦 Installation

1. Search for **Turbo AI Rules** in the VS Code Extension Marketplace
2. Click **Install** to install the extension
3. Reload VS Code

### ⚡ Three-Step Setup

#### Step 1: Add Rule Source

There are three ways to add a rule source:

**Method 1: Via Status Bar**

- Click the **🤖 AI Rules** icon in the bottom-right status bar
- Select **Add Source**

**Method 2: Via Command Palette**

- Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
- Type `Turbo AI Rules: Add Source`

**Method 3: Via Tree View**

- Open the **AI Rules** view in the sidebar
- Click the **+** button at the top

Enter the following information:

```
Git Repository URL:  https://github.com/username/ai-rules.git
Branch:             main (optional, defaults to main)
Subpath:            rules/ (optional, if rules are in a subdirectory)
Display Name:       My Rules (optional, for easy identification)
Access Token:       ghp_xxxx (required for private repos only)
```

#### Step 2: Sync Rules

After adding a source, the first sync is triggered automatically. You can also sync manually:

**Method 1: Command Palette**

```bash
Ctrl+Shift+P → Turbo AI Rules: Sync Rules
```

**Method 2: Tree View**

- Click the **🔄 Sync** button at the top of the AI Rules view

**Method 3: Status Bar**

- Click **🤖 AI Rules** in the status bar → **Sync Rules**

#### Step 3: Verify Config Files

After syncing, check the workspace root directory:

```
your-workspace/
├── .cursorrules                           # ✅ Cursor AI config
├── .github/.copilot-instructions.md       # ✅ GitHub Copilot config
├── .continuerules                         # ⚙️ Continue (disabled by default)
└── rules/                                 # ✅ Generic rules directory (enabled by default)
    ├── index.md                          # Rules index
    └── my-rules/                         # Organized by source
        ├── typescript-rules.md
        └── react-rules.md
```

### 🎉 Start Using

After config files are generated, AI tools will automatically load the rules:

- **Cursor**: Open Cursor, rules are now active
- **GitHub Copilot**: Use Copilot in VS Code, follows rule suggestions
- **Continue**: When enabled, rules are applied when using the Continue plugin

---

## 📋 Commands

The extension provides 6 core commands covering the complete workflow of rule source management, syncing, and config generation.

### 1. 🔗 Add Source

**Command**: `Turbo AI Rules: Add Source`

**Function**: Add a new Git rule repository as a rule source

**Use Cases**:

- Initial extension setup
- Add team-shared rule repositories
- Add personal rule repositories
- Add quality community rule sources

**Steps**:

1. Execute the command (or click the + button in status bar/tree view)
2. Enter Git repository URL
   - Public repo: `https://github.com/username/repo.git`
   - Private repo: Provide access token in subsequent steps
3. Select branch (optional, defaults to `main`)
4. Specify subpath (optional, if rules are in subdirectory like `rules/`)
5. Set display name (optional, for easy identification in tree view)
6. Provide access token (required for private repos only)

**Example**:

```
URL:      https://github.com/company/coding-rules.git
Branch:   main
Subpath:  best-practices/
Name:     Company Rules
Token:    ghp_xxxxxxxxxxxx (private repo)
```

**Tips**:

- 🔐 Access token only needs `repo` (full repository access) permission
- 📁 Use subpath to sync only specific directories within the repository
- 🏷️ Set clear names for managing multiple rule sources

---

### 2. 🗑️ Remove Source

**Command**: `Turbo AI Rules: Remove Source`

**Function**: Remove an added rule source

**Use Cases**:

- Remove rule sources that are no longer needed
- Clean up outdated rule repositories
- Remove rules no longer used by the team

**Steps**:

1. Execute the command
2. Select the rule source to delete from the list
3. Confirm the deletion

**Alternatively**:

- Right-click on the rule source in the tree view
- Select **Remove**

**Notes**:

- ⚠️ Deleting a rule source will remove all rules from that source in the cache
- 🔄 Config files will be automatically regenerated after deletion (excluding rules from that source)
- 💾 Local Git clone will be deleted, but doesn't affect the remote repository

---

### 3. 🔄 Sync Rules

**Command**: `Turbo AI Rules: Sync Rules`

**Function**: Sync the latest rules from all enabled rule sources

**Use Cases**:

- Get the latest updates from rule sources
- Sync after adding a rule source for the first time
- Manually trigger rule updates (when auto-sync hasn't triggered in time)

**Steps**:

1. Execute the command (or click the 🔄 button in tree view)
2. The extension will sequentially:
   - Pull the latest code from Git repositories (`git pull`)
   - Parse all rule files (`.md` format)
   - Apply conflict resolution strategy (if duplicate rules exist)
   - Automatically generate all enabled config files

**Output Log Example**:

```
[Turbo AI Rules] Syncing rules from 3 sources...
[Turbo AI Rules] ✓ Synced: Company Rules (15 rules)
[Turbo AI Rules] ✓ Synced: Personal Rules (8 rules)
[Turbo AI Rules] ✓ Synced: Community Rules (42 rules)
[Turbo AI Rules] Total: 65 rules synced
[Turbo AI Rules] Generating config files...
[Turbo AI Rules] ✓ Generated: .cursorrules
[Turbo AI Rules] ✓ Generated: .github/.copilot-instructions.md
[Turbo AI Rules] ✓ Generated: rules/index.md
[Turbo AI Rules] Sync completed successfully!
```

**Configuration Options**:

- `sync.onStartup`: Auto-sync on VS Code startup (default: `true`)
- `sync.interval`: Auto-sync interval in minutes (default: `60`)
- `sync.conflictStrategy`: Conflict resolution strategy (default: `priority`)

**Tips**:

- ⏱️ First sync may take a few seconds to minutes (depends on number of rules)
- 🌐 Requires network connection to access Git repositories
- 📊 View detailed sync logs in the Output panel

---

### 4. 🔍 Search Rules

**Command**: `Turbo AI Rules: Search Rules`

**Function**: Search for specific content in all synced rules

**Use Cases**:

- Find rules for specific tech stacks (e.g., "TypeScript", "React")
- Search for rules on specific topics (e.g., "naming", "testing")
- Browse the list of available rules

**Steps**:

1. Execute the command
2. Enter search keywords (supports fuzzy search)
3. Select a rule from the results to view details

**Search Scope**:

- Rule ID (`id`)
- Rule title (`title`)
- Rule tags (`tags`)
- Rule description (`description`)

**Example**:

```
Search: "typescript"
Results:
  - TypeScript Naming Conventions
  - TypeScript Best Practices
  - TypeScript Testing Guide
  - React + TypeScript Patterns
```

**Tips**:

- 🔤 Search is case-insensitive
- 🏷️ Can filter quickly by tags (e.g., `#react`, `#testing`)
- 📄 Selecting a rule will preview its content in the editor

---

### 5. 📝 Generate Config Files

**Command**: `Turbo AI Rules: Generate Config Files`

**Function**: Manually regenerate all AI tool configuration files

**Use Cases**:

- Config files were accidentally deleted or modified
- Regenerate after changing adapter configuration
- Manually verify config file generation logic

**Steps**:

1. Execute the command
2. The extension will regenerate all enabled config files based on current configuration

**Generated Files**:

```
✅ Cursor:       .cursorrules
✅ Copilot:      .github/.copilot-instructions.md
⚙️ Continue:     .continuerules (if enabled)
✅ Custom:       Generated based on custom adapter config
```

**Notes**:

- ⚠️ **Will overwrite existing config files**, manual modifications will be lost
- 💡 Recommend modifying rule sources instead of config files themselves
- 🔄 This command is automatically called when syncing rules

**Tips**:

- If you don't want config generation for a specific tool, disable the corresponding adapter in settings
- Custom adapters support configuring multiple output targets

---

### 6. ⚙️ Manage Sources

**Command**: `Turbo AI Rules: Manage Sources`

**Function**: Edit existing rule source configuration

**Use Cases**:

- Change rule source branch (e.g., switch from `main` to `develop`)
- Modify subpath (adjust rule file directory)
- Update display name
- Update access token (when token expires or changes)
- Enable/disable rule sources

**Steps**:

1. Execute the command
2. Select the rule source to manage
3. Select the property to modify:
   - **Branch**: Change Git branch
   - **Subpath**: Modify subpath
   - **Display Name**: Update display name
   - **Token**: Update access token
   - **Enable/Disable**: Enable or disable the source

**Alternatively**:

- Right-click on the rule source in the tree view
- Select the corresponding action (Enable/Disable/Edit)

**Example Scenarios**:

**Scenario 1**: Switch to development branch

```
Rule Source: Company Rules
Action:      Change branch
Old Value:   main
New Value:   develop
```

**Scenario 2**: Update expired Token

```
Rule Source: Private Rules
Action:      Update Token
New Value:   ghp_newtoken123456
```

**Scenario 3**: Temporarily disable rule source

```
Rule Source: Experimental Rules
Action:      Disable
Effect:      Rules from this source are no longer included in config files
```

**Tips**:

- 🔄 Automatically re-syncs after configuration changes
- 💾 Configuration is persistently saved in workspace settings
- 🌲 Tree view reflects enable/disable status in real-time

---

## 🎯 Usage Tips

### Quick Command Access

**Via Status Bar**:

- Click the **🤖 AI Rules** icon to quickly access all commands

**Via Tree View**:

- 📂 **AI Rules** view provides visual operations
- Right-click menu supports quick actions

**Via Command Palette**:

- `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
- Type `Turbo AI Rules` to view all commands

### Recommended Workflow

1. **Initialize**: `Add Source` → Add rule sources
2. **Sync**: `Sync Rules` → Get rules
3. **Verify**: Check generated config files
4. **Maintain**: Regularly `Sync Rules` for updates
5. **Search**: Use `Search Rules` to find specific rules
6. **Adjust**: Use `Manage Sources` to adjust configuration

---

## 📖 Rule File Format

Rule files use MDC (Markdown + YAML Frontmatter) format:

```markdown
---
id: typescript-naming
title: TypeScript Naming Conventions
priority: high
tags: [typescript, naming, conventions]
version: 1.0.0
author: Your Name
description: Naming conventions for TypeScript projects
---

# TypeScript Naming Conventions

## Variable Naming

- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_SNAKE_CASE for constants

## Examples

\`\`\`typescript
// Good naming
const userName = 'John';
class UserService {}
const MAX_RETRY_COUNT = 3;

// Avoid
const user_name = 'John'; // ❌
class userservice {} // ❌
\`\`\`
```

---

## ⚙️ Configuration Guide

### 📚 Configuration Hierarchy

Turbo AI Rules supports multi-level configuration, priority from high to low:

1. **Workspace Settings** (`.vscode/settings.json`) - Project-level config
2. **User Settings** (VS Code User Settings) - Global config
3. **Default Values** - Extension built-in defaults

Recommendation: Use workspace settings for team projects, user settings for personal use.

---

### 🔧 Complete Configuration Example

Add to `.vscode/settings.json` or VS Code settings:

```json
{
  // ========== Storage Configuration ==========
  "turbo-ai-rules.storage.useGlobalCache": true,

  // ========== Sync Configuration ==========
  "turbo-ai-rules.sync.onStartup": true,
  "turbo-ai-rules.sync.interval": 60,
  "turbo-ai-rules.sync.conflictStrategy": "priority",

  // ========== Built-in Adapters ==========
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.continue.enabled": false,

  // ========== Custom Adapters ==========
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "default-rules",
      "name": "Generic Rules",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": "rules",
      "outputType": "directory",
      "organizeBySource": true,
      "generateIndex": true,
      "indexFileName": "index.md"
    },
    {
      "id": "windsurf",
      "name": "Windsurf AI",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": ".windsurfrules",
      "outputType": "file",
      "fileExtensions": [".md"]
    }
  ]
}
```

---

### 📊 Configuration Options Details

#### 1. Storage Configuration (`storage`)

| Option           | Type    | Default | Description                                            |
| ---------------- | ------- | ------- | ------------------------------------------------------ |
| `useGlobalCache` | boolean | `true`  | Use global cache (`~/.turbo-ai-rules/`) to store rules |

**Recommendations**:

- ✅ Keep default `true`, multiple workspaces share rule cache
- ❌ Setting to `false` stores independently in each workspace, consuming more space

---

#### 2. Sync Configuration (`sync`)

| Option             | Type    | Default    | Description                                                  |
| ------------------ | ------- | ---------- | ------------------------------------------------------------ |
| `onStartup`        | boolean | `true`     | Auto-sync rules on VS Code startup                           |
| `interval`         | number  | `60`       | Auto-sync interval in minutes, 0 disables auto-sync          |
| `conflictStrategy` | enum    | `priority` | Conflict resolution strategy: `priority` / `skip-duplicates` |

**Conflict Resolution Strategy**:

- **`priority`** (Recommended):
  - Uses the rule with highest priority (based on `priority` field in rule file)
  - Suitable for scenarios with clear rule priorities
- **`skip-duplicates`**:
  - Keeps the first occurrence, ignores subsequent duplicates
  - Suitable for completely independent rule sources

**Example**:

```json
{
  "turbo-ai-rules.sync.onStartup": true, // Sync on startup
  "turbo-ai-rules.sync.interval": 120, // Sync every 2 hours
  "turbo-ai-rules.sync.conflictStrategy": "priority"
}
```

---

#### 3. Built-in Adapter Configuration (`adapters`)

| Adapter  | Config Option      | Default | Output File                        |
| -------- | ------------------ | ------- | ---------------------------------- |
| Cursor   | `cursor.enabled`   | `true`  | `.cursorrules`                     |
| Copilot  | `copilot.enabled`  | `true`  | `.github/.copilot-instructions.md` |
| Continue | `continue.enabled` | `false` | `.continuerules`                   |

**Example**:

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.continue.enabled": false
}
```

**When to Disable Adapters**:

- Disable corresponding adapter when not using a specific AI tool
- Reduce unnecessary config file generation
- Avoid conflicts with other extensions

---

#### 4. Custom Adapter Configuration (`adapters.custom`)

Custom adapters are Turbo AI Rules' most powerful feature, supporting output format configuration for **any AI tool**.

##### Configuration Structure

```typescript
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "unique-id",              // Unique identifier (kebab-case)
      "name": "Display Name",         // Display name
      "enabled": true,                // Whether enabled
      "autoUpdate": true,             // Auto-update after sync
      "outputPath": "path/to/output", // Output path (relative to workspace root)
      "outputType": "file",           // Output type: "file" | "directory"
      "fileExtensions": [".md"],      // File filter (optional)
      "organizeBySource": true,       // Organize by source (directory mode only)
      "generateIndex": true,          // Generate index (directory mode only)
      "indexFileName": "index.md"     // Index filename (directory mode only)
    }
  ]
}
```

##### Parameter Details

| Parameter          | Type     | Required | Default    | Description                                                                                  |
| ------------------ | -------- | -------- | ---------- | -------------------------------------------------------------------------------------------- |
| `id`               | string   | ✅       | -          | Unique identifier, use kebab-case (e.g., `windsurf`, `my-custom-ai`)                         |
| `name`             | string   | ✅       | -          | Display name, appears in logs and UI                                                         |
| `enabled`          | boolean  | ❌       | `true`     | Whether this adapter is enabled                                                              |
| `autoUpdate`       | boolean  | ❌       | `true`     | Whether to auto-update output after syncing rules                                            |
| `outputPath`       | string   | ✅       | -          | Output path, relative to workspace root                                                      |
| `outputType`       | enum     | ✅       | -          | `"file"`: Single file output<br>`"directory"`: Directory structure output                    |
| `fileExtensions`   | string[] | ❌       | `[]`       | File extension filter (e.g., `[".md", ".mdc"]`)<br>**Empty array or unset = sync all files** |
| `organizeBySource` | boolean  | ❌       | `true`     | (`directory` mode only) Whether to create subdirectories by source ID                        |
| `generateIndex`    | boolean  | ❌       | `true`     | (`directory` mode only) Whether to generate index file                                       |
| `indexFileName`    | string   | ❌       | `index.md` | (`directory` mode only) Index filename                                                       |

---

##### Configuration Scenario Examples

**Scenario 1: Default `rules/` directory** (Built-in, no additional config needed)

```json
{
  "id": "default-rules",
  "name": "Generic Rules",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": "rules",
  "outputType": "directory",
  "organizeBySource": true,
  "generateIndex": true,
  "indexFileName": "index.md"
  // Not setting fileExtensions = sync all files
}
```

**Output Structure**:

```
rules/
├── index.md                   # Rules index
├── company-rules/             # Source 1
│   ├── typescript.md
│   └── react.md
└── personal-rules/            # Source 2
    └── best-practices.md
```

---

**Scenario 2: Single File Output (Windsurf, Cline, Aide)**

```json
{
  "id": "windsurf",
  "name": "Windsurf AI",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": ".windsurfrules",
  "outputType": "file",
  "fileExtensions": [".md"]
}
```

**Output**:

- Single file `.windsurfrules`
- Contains all `.md` rules, sorted by priority
- Automatically adds separators and metadata

---

**Scenario 3: Full Directory Sync (All File Types)**

```json
{
  "id": "full-sync",
  "name": "Full Directory Sync",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": "ai-rules-full",
  "outputType": "directory",
  "organizeBySource": true,
  "generateIndex": true
  // Not setting fileExtensions = sync .md, .mdc, .txt, .json, etc. all files
}
```

**Output**:

- Preserves original directory structure
- Contains all file types (`.md`, `.mdc`, `.txt`, `.json`, ...)
- Suitable for scenarios needing complete rule library

---

**Scenario 4: Documentation Site AI Rules**

```json
{
  "id": "docs-ai",
  "name": "Documentation AI Rules",
  "enabled": true,
  "autoUpdate": true,
  "outputPath": "docs/ai-rules",
  "outputType": "directory",
  "fileExtensions": [".md", ".mdc"],
  "organizeBySource": false, // Flat structure, don't group by source
  "generateIndex": true,
  "indexFileName": "README.md" // Use README.md as index
}
```

**Output**:

```
docs/ai-rules/
├── README.md                  # Index file
├── typescript.md
├── react.md
├── best-practices.md
└── ...
```

---

**Scenario 5: Multi AI Tool Support**

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "windsurf",
      "name": "Windsurf AI",
      "enabled": true,
      "outputPath": ".windsurfrules",
      "outputType": "file",
      "fileExtensions": [".md"]
    },
    {
      "id": "cline",
      "name": "Cline AI",
      "enabled": true,
      "outputPath": ".clinerules",
      "outputType": "file",
      "fileExtensions": [".md"]
    },
    {
      "id": "aide",
      "name": "Aide AI",
      "enabled": true,
      "outputPath": ".aide/rules.md",
      "outputType": "file",
      "fileExtensions": [".md"]
    }
  ]
}
```

**Result**: Generate config files for Windsurf, Cline, and Aide simultaneously.

---

### 🎨 Recommended Configuration Combinations

#### Configuration 1: Minimal Setup (Default)

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": true
}
```

**Suitable for**: Users who only use Cursor and Copilot.

---

#### Configuration 2: Full-Featured Setup

```json
{
  "turbo-ai-rules.sync.onStartup": true,
  "turbo-ai-rules.sync.interval": 120,
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.continue.enabled": true,
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "default-rules",
      "name": "Generic Rules",
      "enabled": true,
      "outputPath": "rules",
      "outputType": "directory",
      "organizeBySource": true,
      "generateIndex": true
    },
    {
      "id": "windsurf",
      "name": "Windsurf AI",
      "enabled": true,
      "outputPath": ".windsurfrules",
      "outputType": "file",
      "fileExtensions": [".md"]
    }
  ]
}
```

**Suitable for**: Teams using multiple AI tools that need complete rule management.

---

#### Configuration 3: Offline/Low-Frequency Updates

```json
{
  "turbo-ai-rules.sync.onStartup": false,
  "turbo-ai-rules.sync.interval": 0,
  "turbo-ai-rules.adapters.cursor.enabled": true,
  "turbo-ai-rules.adapters.copilot.enabled": true
}
```

**Suitable for**: Network-restricted environments, manually control sync timing.

---

### 💡 Configuration Best Practices

1. **Team Collaboration**:
   - Put configuration in `.vscode/settings.json`
   - Commit to version control, share configuration with team
2. **Rule Source Management**:
   - Use clear display names (`name` field)
   - Keep tokens secure for private repositories (don't commit to version control)
3. **Performance Optimization**:
   - Set reasonable `sync.interval`, avoid too frequent syncs
   - Disable unused adapters to reduce file generation
4. **File Filtering**:

   - Most cases don't need to set `fileExtensions` (defaults to sync all)
   - Only configure filtering when specific file types are needed

5. **Custom Adapters**:
   - Prioritize `file` output type for new AI tools
   - `directory` mode suitable for scenarios requiring complete rule library

---

## 📖 Rule File Format (MDC)

Rule files use **MDC** (Markdown + YAML Frontmatter) format, combining YAML metadata and Markdown content.

### Basic Structure

```markdown
---
id: rule-unique-id
title: Rule Title
priority: high
tags: [tag1, tag2, tag3]
version: 1.0.0
author: Author Name
description: Brief rule description
---

# Rule Details

Detailed rule description and examples...
```

---

### Metadata Field Descriptions

| Field         | Type     | Required | Description                                   |
| ------------- | -------- | -------- | --------------------------------------------- |
| `id`          | string   | ✅       | Unique rule identifier (kebab-case)           |
| `title`       | string   | ✅       | Rule title                                    |
| `priority`    | enum     | ❌       | Priority: `low`, `medium`, `high`, `critical` |
| `tags`        | string[] | ❌       | Tag array for categorization and search       |
| `version`     | string   | ❌       | Rule version number (semantic versioning)     |
| `author`      | string   | ❌       | Rule author                                   |
| `description` | string   | ❌       | Brief rule description                        |

---

### Complete Example

```markdown
---
id: typescript-naming
title: TypeScript Naming Conventions
priority: high
tags: [typescript, naming, conventions, best-practices]
version: 1.0.0
author: Your Name
description: Naming conventions and best practices for TypeScript projects
---

# TypeScript Naming Conventions

## Variable Naming

### Rules

- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and interfaces
- Use **UPPER_SNAKE_CASE** for constants
- Use **\_prefix** for private members

### ✅ Good Examples

\`\`\`typescript
// Variables and functions
const userName = 'John';
function getUserName() { ... }

// Classes and interfaces
class UserService { ... }
interface IUserData { ... }

// Constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// Private members
class User {
private \_id: string;
private \_password: string;
}
\`\`\`

### ❌ Avoid

\`\`\`typescript
// Wrong: variable using underscore separation
const user_name = 'John'; // ❌

// Wrong: class name using camelCase
class userservice {} // ❌

// Wrong: constant using camelCase
const maxRetryCount = 3; // ❌
\`\`\`

## Type Naming

### Interfaces

- Interface names use `I` prefix (optional but recommended)
- Or use descriptive names ending with `able` to indicate capability

\`\`\`typescript
// Method 1: I prefix
interface IUser { ... }
interface IUserService { ... }

// Method 2: Descriptive names
interface Serializable { ... }
interface Comparable { ... }
\`\`\`

### Type Aliases

Use `Type` suffix to distinguish type aliases from interfaces

\`\`\`typescript
type UserIdType = string | number;
type CallbackType = (data: any) => void;
\`\`\`

## File Naming

- Use **kebab-case** for file names
- Use **PascalCase** for component files (React/Vue)

\`\`\`
✅ user-service.ts
✅ api-client.ts
✅ UserProfile.tsx (React component)
❌ UserService.ts (avoid)
❌ api_client.ts (avoid)
\`\`\`

## Summary

Following consistent naming conventions improves code readability and maintainability. Teams should establish naming conventions at the project start and enforce them with tools like ESLint.
```

---

### Rule Writing Recommendations

1. **Clear Structure**:
   - Use heading levels to organize content
   - Each rule focuses on one topic
2. **Code Examples**:
   - Provide ✅ good examples and ❌ bad examples
   - Use code block highlighting
3. **Complete Metadata**:
   - Set reasonable `priority`
   - Add relevant `tags` for easy searching
4. **Version Management**:
   - Use semantic versioning
   - Update `version` for major updates

---

## 🔧 How It Works

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Turbo AI Rules                        │
├─────────────────────────────────────────────────────────┤
│  1. Rule Source Management (Git Repository Management)  │
│     - Clone/Pull from Git repositories                 │
│     - Multi-source support                             │
│     - Private repo authentication                      │
├─────────────────────────────────────────────────────────┤
│  2. Rules Parsing                                        │
│     - MDC format parser (YAML + Markdown)              │
│     - Metadata extraction                              │
│     - Content validation                               │
├─────────────────────────────────────────────────────────┤
│  3. Conflict Resolution                                  │
│     - Priority-based merging                           │
│     - Skip duplicates strategy                         │
│     - Rule deduplication                               │
├─────────────────────────────────────────────────────────┤
│  4. Adapter System                                       │
│     - Cursor Adapter        → .cursorrules             │
│     - Copilot Adapter       → .copilot-instructions.md │
│     - Continue Adapter      → .continuerules           │
│     - Custom Adapters       → User-defined outputs     │
├─────────────────────────────────────────────────────────┤
│  5. Auto Sync                                            │
│     - Startup sync                                     │
│     - Interval-based sync                              │
│     - Manual sync trigger                              │
└─────────────────────────────────────────────────────────┘
```

---

### Workflow

```
┌──────────────┐
│  Add Source  │  1. User adds Git rule source
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Git Clone   │  2. Clone repository to global cache (~/.turbo-ai-rules/)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Parse Rules │  3. Parse .md files, extract metadata and content
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Resolve    │  4. Apply conflict resolution strategy (priority/skip-duplicates)
│  Conflicts   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Generate   │  5. Generate config files using adapters
│   Configs    │     - .cursorrules
└──────┬───────┘     - .copilot-instructions.md
       │             - Custom outputs
       ▼
┌──────────────┐
│   AI Tools   │  6. AI tools load and apply rules
│ Load Configs │
└──────────────┘
```

---

### Directory Structure

#### Global Cache Directory

```
~/.turbo-ai-rules/                 # Global cache in user home directory
└── sources/                       # Git repository clone directory
    ├── company-rules/             # Rule source 1
    │   ├── .git/
    │   └── rules/
    │       ├── typescript.md
    │       └── react.md
    ├── personal-rules/            # Rule source 2
    │   ├── .git/
    │   └── best-practices.md
    └── community-rules/           # Rule source 3
        └── ...
```

#### Workspace Directory

```
your-workspace/                    # VS Code workspace root
├── .vscode/
│   └── settings.json              # Extension configuration
├── .cursorrules                   # ✅ Cursor config (auto-generated)
├── .continuerules                 # ⚙️ Continue config (optional)
├── .windsurfrules                 # ⚙️ Windsurf config (custom)
├── .github/
│   └── .copilot-instructions.md   # ✅ Copilot config (auto-generated)
├── rules/                         # ✅ Generic rules directory (default)
│   ├── index.md                  # Rules index
│   ├── company-rules/            # Rules from source 1
│   │   ├── typescript.md
│   │   └── react.md
│   └── personal-rules/           # Rules from source 2
│       └── best-practices.md
└── src/
    └── ...
```

---

### Adapter Pattern

The extension uses the **Adapter Pattern** to generate configs for different AI tools:

```typescript
// Adapter interface
interface Adapter {
  generate(rules: Rule[]): Promise<void>;
}

// Built-in adapters
class CursorAdapter implements Adapter { ... }
class CopilotAdapter implements Adapter { ... }
class ContinueAdapter implements Adapter { ... }

// Custom adapter
class CustomAdapter implements Adapter {
  constructor(config: CustomAdapterConfig) { ... }
  generate(rules: Rule[]): Promise<void> {
    if (config.outputType === 'file') {
      // Generate single file
    } else {
      // Generate directory structure
    }
  }
}
```

**Advantages**:

- 🔌 Easy to extend: Add new AI tools by creating new adapters
- 🎯 Flexible configuration: Each adapter configured independently
- 🔄 Rule reuse: Same set of rules generates multiple formats

---

## ❓ FAQ

### Basic Questions

#### Q1: What permissions are needed for private repositories?

**A**: A Personal Access Token (PAT) with **read permissions** is required.

**GitHub Token Creation Steps**:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click **Generate new token** (classic)
3. Select permissions: `repo` (full repository access)
4. Copy the generated Token (format: `ghp_xxxxxxxxxxxx`)
5. Paste the token when adding the rule source

**Notes**:

- Keep the token secure, don't commit it to version control
- Update the token in the extension (use `Manage Sources` command) when it expires

---

#### Q2: Must rule files be in `.md` format?

**A**: Yes, currently the extension only parses rule files in **Markdown format** (`.md`).

Files must meet the following requirements:

- File extension: `.md`
- Format: MDC (Markdown + YAML Frontmatter)
- Metadata: Must contain at least `id` and `title` fields

Future support for other formats (e.g., `.mdx`, `.txt`) is possible.

---

#### Q3: Can I manually edit generated config files?

**A**: **Not recommended** to manually edit generated config files (e.g., `.cursorrules`).

**Reasons**:

- ⚠️ Next sync will **overwrite** manual modifications
- Difficult to track change history
- Cannot share modifications across the team

**Correct approach**:

1. Modify rule files in the rule source repository
2. Commit to Git
3. Run `Sync Rules` to regenerate config

This ensures:

- ✅ Version control
- ✅ Team sharing
- ✅ Traceability

---

#### Q4: How to debug sync issues?

**A**: Check the extension's output logs.

**Steps**:

1. Open VS Code **Output** panel (View → Output or `Ctrl+Shift+U`)
2. Select **Turbo AI Rules** from the dropdown menu
3. View detailed sync logs

**Log Example**:

```
[Turbo AI Rules] Syncing rules from 3 sources...
[Turbo AI Rules] ✓ Synced: Company Rules (15 rules)
[Turbo AI Rules] ✗ Error: Failed to clone repository: Authentication failed
[Turbo AI Rules] ✓ Generated: .cursorrules
```

**Common Errors**:

- `Authentication failed`: Token is invalid or expired
- `Network error`: Network connection issues
- `Parse error`: Rule file format error

---

### Conflicts and Priority

#### Q5: What if multiple rule sources have rules with the same ID?

**A**: The extension handles duplicate rules according to the configured **conflict resolution strategy**.

**Strategy 1: `priority` (default)**

- Uses the rule with the highest `priority` field
- Priority order: `critical` > `high` > `medium` > `low`
- If `priority` is the same, uses the first appearing rule

**Example**:

```yaml
# Source A: typescript-naming (priority: high)
# Source B: typescript-naming (priority: critical)
# Result: Use Source B (higher priority)
```

**Strategy 2: `skip-duplicates`**

- Keeps the first occurring rule
- Skips subsequent duplicate rules
- Suitable for completely independent rule sources

**Configuration**:

```json
{
  "turbo-ai-rules.sync.conflictStrategy": "priority" // or "skip-duplicates"
}
```

---

### Adapters and Configuration

#### Q6: How to disable config generation for a specific AI tool?

**A**: Disable the corresponding adapter in VS Code settings.

**Method 1: Via UI**

1. Open VS Code Settings (`Ctrl+,`)
2. Search for `Turbo AI Rules`
3. Find the corresponding adapter option
4. Uncheck `Enabled`

**Method 2: Via JSON**

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": false, // Disable Cursor
  "turbo-ai-rules.adapters.copilot.enabled": true, // Keep Copilot
  "turbo-ai-rules.adapters.continue.enabled": false // Disable Continue
}
```

**Effect**: When disabled, the corresponding config file will not be generated during sync.

---

#### Q7: What are custom adapters?

**A**: Custom adapters allow you to configure output formats for **any AI tool**.

**Features**:

- 📄 **File Mode**: Merge all rules into a single file (e.g., `.windsurfrules`, `.clinerules`)
- 📁 **Directory Mode**: Generate complete directory structure (e.g., `rules/`, `docs/ai-rules`)
- 🔍 **File Filtering**: Include only rule files with specific extensions (e.g., `.md`, `.mdc`)
- 🗂️ **Flexible Organization**: Can organize subdirectories by source, or use flat structure

**Use Cases**:

- Support new AI tools (Windsurf, Cline, Aide, ...)
- Export rules for documentation sites
- Internal team rule distribution

**Configuration Example** → See [Configuration Guide - Custom Adapters](#4-custom-adapter-configuration-adapterscustom)

---

#### Q8: How to add support for new AI tools (e.g., Windsurf, Cline)?

**A**: Add custom adapter configuration in settings.

**Steps**:

1. Check the target AI tool's documentation to confirm config file path and format
2. Add custom adapter in VS Code settings

**Example 1: Windsurf** (single file config)

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "windsurf",
      "name": "Windsurf AI",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": ".windsurfrules",
      "outputType": "file",
      "fileExtensions": [".md"]
    }
  ]
}
```

**Example 2: Cline** (directory structure)

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "cline",
      "name": "Cline AI",
      "enabled": true,
      "autoUpdate": true,
      "outputPath": ".cline/rules",
      "outputType": "directory",
      "organizeBySource": false,
      "generateIndex": true
    }
  ]
}
```

3. Run `Generate Config Files` command
4. Verify the generated config files

Detailed configuration → [Configuration Guide - Custom Adapters](#4-custom-adapter-configuration-adapterscustom)

---

#### Q9: Can the default `rules/` directory be modified or disabled?

**A**: Yes! The `rules/` directory is actually a default **custom adapter**.

**Modify Configuration**:

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "default-rules",
      "name": "Generic Rules",
      "enabled": true,
      "outputPath": "my-custom-rules", // Modify output path
      "outputType": "directory",
      "fileExtensions": [".md", ".mdc"], // Add file filtering
      "organizeBySource": false, // Change to flat structure
      "generateIndex": true,
      "indexFileName": "README.md" // Change to README.md
    }
  ]
}
```

**Disable**:

```json
{
  "turbo-ai-rules.adapters.custom": [
    {
      "id": "default-rules",
      "enabled": false // Disable default rules/ directory
    }
  ]
}
```

**Delete**: Completely remove this configuration from the `adapters.custom` array.

---

### User Custom Rules

#### Q10: How to add my own rules without them being overwritten by sync?

**A**: There are two methods depending on the output mode:

---

**Method 1: Directory Mode (e.g., `.cursor/rules/`) - Filename Prefix Avoidance**

**Core Mechanism**: The extension only manages files with `000-799` prefixes. Files with `800-999` prefixes won't be modified or deleted.

**Why recommend 800-999 prefix?**

- 🛡️ **Avoid Conflicts**: Auto-generated files use `000-799` prefix, your files use `800-999` prefix, completely no conflict
- 📋 **Clear Management**: Easily distinguish which are auto-generated and which are user-defined
- 🔒 **Automatic Protection**: Sync automatically skips files with `800-999` prefix, no additional configuration needed

> 💡 **Note**: The `800-999` prefix is **not mandatory**, it's just a **recommended naming convention** to avoid conflicts with auto-generated files.
> If `protectUserRules` configuration is enabled (disabled by default), the extension will more intelligently detect user files.

**Steps**:

```bash
# 1. Enter rules directory
cd .cursor/rules

# 2. Create custom rule file (using 800-999 prefix)
touch 850-my-team-rules.mdc

# 3. Edit the file
code 850-my-team-rules.mdc
```

**Naming Recommendations**:

| Prefix Range | Purpose                                             | Priority   | Example                    |
| ------------ | --------------------------------------------------- | ---------- | -------------------------- |
| `000-799`    | 🤖 Auto-generated (**will be overwritten/deleted**) | Auto rules | `200-typescript.mdc`       |
| `800-849`    | ✍️ High-priority custom (can override auto rules)   | Highest    | `820-team-overrides.mdc`   |
| `850-899`    | ✍️ Regular custom rules                             | High       | `850-project-specific.mdc` |
| `900-949`    | ✍️ Supplementary rules                              | Medium     | `900-code-review.mdc`      |
| `950-999`    | ✍️ FAQ, references                                  | Low        | `990-faq.mdc`              |

**Example File Structure**:

```
.cursor/rules/
├── 001-project-overview.mdc        ← 🤖 Auto-generated
├── 200-typescript.mdc              ← 🤖 Auto-generated
├── 300-react.mdc                   ← 🤖 Auto-generated
├── 820-team-overrides.mdc          ← ✍️ You created (safe)
├── 850-api-conventions.mdc         ← ✍️ You created (safe)
└── 900-code-review-checklist.mdc   ← ✍️ You created (safe)
```

**⚠️ Important Notes**:

**About File Priority**:

| AI Tool        | Priority Mechanism                     | Confirmation Status         | Data Source          |
| -------------- | -------------------------------------- | --------------------------- | -------------------- |
| GitHub Copilot | All files merged, no order distinction | ✅ Official docs confirmed  | GitHub Docs          |
| Continue       | Loaded in lexical order                | ✅ Source code confirmed    | Continue GitHub repo |
| Cline          | Hierarchy: user > project > global     | ✅ Source code confirmed    | Cline GitHub repo    |
| **Cursor**     | **Lower number = higher priority?**    | ⚠️ **Community experience** | **No official docs** |
| Windsurf       | Unknown                                | ❌ No documentation         | -                    |
| Aide           | Unknown                                | ❌ No documentation         | -                    |

> 📌 **Design Strategy Explanation**:
>
> - Although **Cursor's** "lower number = higher priority" is widely circulated in the community, **no official documentation has been found to confirm this**
> - This extension adopts a **conservative strategy**: use `800-999` prefix to protect user-defined files
> - Even if Cursor's actual priority differs from community rumors, this strategy still effectively protects user files from being overwritten
> - Recommend **actual testing** of your AI tool's priority behavior, and **explicitly declare priority** in rule content

**If you need to override auto rules, recommend explicitly declaring in content**:

```markdown
---
id: team-naming-conventions
title: Team Naming Conventions
priority: critical # Highest priority
---

> ⚠️ **Note**: This rule overrides the default naming conventions

# Our Special Naming Rules

Our team uses snake_case for database field-related variables...
```

---

**Method 2: Single File Mode (e.g., `.copilot-instructions.md`) - Block Marker Protection**

Single file configuration uses **block markers** to separate auto-generated and user-defined areas.

**File Structure**:

```markdown
<!-- TURBO-AI-RULES:BEGIN -->
<!-- ⚠️  WARNING: Auto-generated content - Will be overwritten on sync -->

# TypeScript Conventions

Use camelCase for variable naming...

# React Best Practices

...

<!-- TURBO-AI-RULES:END -->

<!-- ============================================== -->
<!-- 🎯 Custom Rules Area (Highest Priority) -->
<!-- ✅ Add your custom rules below -->
<!-- ✅ This area will not be overwritten by sync -->
<!-- ============================================== -->

# 🎯 My Custom Rules

## Project API Specifications

All API calls must:

1. Use unified `apiClient` wrapper
2. Add loading state
3. Implement request cancellation

## Code Review Standards

...
```

**Usage Rules**:

1. ✅ **Add content outside block markers** (recommended at file bottom)
2. ❌ **Don't modify content inside blocks** (will be overwritten on next sync)
3. ✅ Your custom content has **highest priority**, can override auto rules

**Priority Explanation**:

- Auto-generated blocks will contain priority hints
- AI will prioritize following custom rules marked as "highest priority"
- In case of conflict, custom rules override auto rules

**Example** (Overriding Default Rules):

````markdown
<!-- TURBO-AI-RULES:BEGIN -->

# TypeScript Naming Conventions

Use camelCase for variables...

<!-- TURBO-AI-RULES:END -->

# 🎯 Team Standards (⚠️ Overrides Above Rules)

## Naming Conventions

Our team uses `snake_case` for database field variables:

```typescript
const user_id = getUserId(); // ✅ Correct
const userId = getUserId(); // ❌ Incorrect
```
````

````

---

#### Q11: Why aren't my custom rules taking effect?

**A**: Check the following:

**Directory Mode**:
1. ✅ Did you use `800-999` prefix for file name?
2. ✅ Is file format correct (MDC format with frontmatter)?
3. ✅ Is file encoding UTF-8?
4. ✅ Is rule content clear and specific?

**Single File Mode**:
1. ✅ Is custom content **outside** the block markers?
2. ✅ Did you use clear titles and priority declarations?
3. ✅ Have you synced rules recently? (ensure file is up-to-date)

**General Checks**:
1. ✅ Is rule content specific enough? (vague rules may be ignored by AI)
2. ✅ Are there conflicts with auto rules without explicit override declarations?
3. ✅ Try adding "This rule has highest priority" declaration at the beginning

**AI Tool Differences**：
Different AI tools handle rule priority differently (see Q10 table):

- **GitHub Copilot**: Merges all `.github/copilot-instructions.md`，no file order distinction
- **Continue**: Loads config files in dictionary order, later loads override earlier ones
- **Cline**: Hierarchical override (user level > project level > global level)
- **Cursor**: Community consensus is "lower number = higher priority", but**not officially confirmed**，recommend actual testing

**Debugging Method**：
```markdown
# Add test at the beginning of custom rules
> ⚠️ **Test Marker**: If you see this message, the rule file has been read

# My Rules
...
````

Then ask the AI: "Did you read the test marker？"to verify if the rules are loaded.

**If still not working**：

1. Check if file path is correct (refer to Q3 config path explanation)
2. Restart AI tool or VS Code
3. Check AI tool's output/log panel to confirm if rule file is loaded
4. Try simplifying rule content to test if it's a content parsing issue

---

#### Q12: What is the `protectUserRules` configuration?

**A**: This is an **advanced protection feature** (disabled by default) for intelligently detecting and protecting user-defined rule files.

**Default Behavior (`protectUserRules: false`)**:

- ✅ Simple and direct: Only judges by filename prefix (`800-999` = user files)
- ✅ Better performance: Doesn't need to read file content
- ✅ Sufficient: Suitable for most use cases

**When Enabled (`protectUserRules: true`)**:

- 🔍 Smart detection: Reads file content to check for user-defined markers
- 🛡️ Double protection: Checks both prefix + content markers
- ⚠️ Conflict alerts: Shows warnings when potential conflicts are detected, avoids accidental deletion

**How to Enable**:

```json
{
  "turbo-ai-rules.sync.protectUserRules": true,
  "turbo-ai-rules.sync.userPrefixRange": [800, 999] // Customizable range
}
```

**Usage Recommendations**:

- 🆕 New users: Keep default disabled, just follow `800-999` prefix naming
- 👥 Team collaboration: Enable if team members might not follow naming conventions
- 🔧 Complex scenarios: Enable when finer-grained protection control is needed

---

### Performance and Sync

#### Q13: What if syncing is slow?

**A**: Several methods to optimize sync performance:

**1. Adjust sync interval**

```json
{
  "turbo-ai-rules.sync.interval": 0 // Disable auto-sync, manual sync only
}
```

**2. Reduce number of rule sources**

- Remove infrequently used rule sources
- Merge similar rule sources

**3. Use subpath**

```
# Sync only subdirectory, reduce file count
Subpath: best-practices/
```

**4. Check network**

- Ensure stable network connection
- Consider using domestic Git mirrors

**5. View logs**

```
Output → Turbo AI Rules
# Find slow steps (Clone/Parse/Generate)
```

---

#### Q14: Can it be used offline?

**A**: Yes, but with limitations.

**First Sync**: Requires network connection to clone rules from Git repository

**Subsequent Use**:

- ✅ Can generate config files offline (using cached rules)
- ✅ Can search rules offline
- ❌ Cannot sync latest rules (requires network)

**Offline Configuration Recommendation**:

```json
{
  "turbo-ai-rules.sync.onStartup": false,
  "turbo-ai-rules.sync.interval": 0
}
```

---

### Advanced Questions

#### Q15: How to use in CI/CD?

**A**: You can automatically generate config files in CI/CD pipelines.

**Example (GitHub Actions)**:

```yaml
name: Sync AI Rules

on:
  schedule:
    - cron: '0 0 * * *' # Daily sync
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install VS Code Extension
        run: code --install-extension turbo-ai-rules

      - name: Sync Rules
        run: code --command turbo-ai-rules.syncRules

      - name: Commit Changes
        run: |
          git config user.name "Bot"
          git config user.email "bot@example.com"
          git add .cursorrules .github/ rules/
          git commit -m "Update AI rules [skip ci]"
          git push
```

---

#### Q16: How to contribute rules to the community?

**A**: Create a public Git repository to share your rules.

**Steps**:

1. **Create repository**

```bash
mkdir my-ai-rules
cd my-ai-rules
git init
```

2. **Add rule files**

```markdown
## <!-- rules/typescript-best-practices.md -->

id: typescript-best-practices
title: TypeScript Best Practices
priority: high
tags: [typescript, best-practices]

---

# TypeScript Best Practices

...
```

3. **Create README**

```markdown
# My AI Rules

Usage:

1. Add as source: `https://github.com/username/my-ai-rules.git`
2. Sync rules
3. Enjoy!
```

4. **Push to GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

5. **Share**: Share your repository URL in the community

---

## 🛠️ Development

### 🤝 Contributing Guide

Welcome to contribute code, submit issues, or improvement suggestions!

**How to Contribute**:

1. **Report Bugs**:

   - Submit issues on [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues)
   - Provide detailed reproduction steps and environment information

2. **Feature Suggestions**:

   - Submit feature requests in Issues
   - Explain use cases and expected outcomes

3. **Code Contributions**:

   ```bash
   # Fork the repository
   # Create feature branch
   git checkout -b feature/amazing-feature

   # Commit changes
   git commit -m 'Add amazing feature'

   # Push to branch
   git push origin feature/amazing-feature

   # Create Pull Request
   ```

4. **Documentation Improvements**:
   - Fix typos and expressions
   - Add examples and best practices
   - Translate documentation

**Development Standards**:

- Follow TypeScript best practices
- Add unit tests
- Update related documentation
- Run `pnpm run compile` and `pnpm test` before committing

Detailed guide → [Development Documentation](./docs/02-development.md)

---

## 📚 Related Links

### Documentation Resources

- 📘 [Architecture Design](./docs/01-design.md) - Understand architecture and technical decisions
- 📗 [Development Guide](./docs/02-development.md) - Complete guide for participating in development
- 📙 [Maintenance Documentation](./docs/03-maintaining.md) - Daily maintenance and sync workflow
- 📕 [Custom Adapter Design](./docs/04-custom-adapters-design.md) - Detailed custom adapter design

### Community Resources

- 💬 [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues) - Issue tracking and feature requests
- 📝 [Changelog](./CHANGELOG.md) - Version update history
- ⚖️ [License](./LICENSE) - MIT License

---

## 📄 License

This project is licensed under **MIT License**. See [LICENSE](./LICENSE) file for details.

---

## 💬 Feedback & Support

### Having Issues?

1. Check [FAQ](#faq)
2. Search [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues)
3. Submit a new Issue

### Feature Suggestions?

Submit feature requests on [GitHub Issues](https://github.com/ygqygq2/turbo-ai-rules/issues) with:

- Use cases
- Expected outcomes
- Possible implementation approaches

### Contact

- GitHub: [@ygqygq2](https://github.com/ygqygq2)
- Email: ygqygq2@qq.com

---

<div align="center">

**⭐ If this project helps you, please give us a Star! ⭐**

Made with ❤️ by [ygqygq2](https://github.com/ygqygq2)

</div>
