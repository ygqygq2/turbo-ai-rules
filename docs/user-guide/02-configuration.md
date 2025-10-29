# Configuration Guide

> Complete guide to configuring Turbo AI Rules

[English](./configuration.md) | [中文](./configuration.zh.md)

---

## ⚙️ Configuration Guide

### 📚 Configuration Hierarchy

Turbo AI Rules supports multi-level configuration, priority from high to low:

1. **Workspace Settings** (`.vscode/settings.json`) - Project-level config
2. **User Settings** (VS Code User Settings) - Global config
3. **Default Values** - Extension built-in defaults

Recommendation: Use workspace settings for team projects, user settings for personal use.

**Configuration Scope**:

Most extension configurations use VSCode's `resource` scope, which means:

- ✅ Different workspaces/folders can have different configurations
- ✅ Teams can share project configurations (via `.vscode/settings.json`)
- ✅ Personal global defaults, overridden by project-level configs
- 📌 Example: Project A enables Cursor, Project B enables Copilot

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

  // ========== Parser Configuration ==========
  "turbo-ai-rules.parser.strictMode": false,
  "turbo-ai-rules.parser.requireFrontmatter": false,

  // ========== Built-in Adapters ==========
  "turbo-ai-rules.adapters.cursor.enabled": false,
  "turbo-ai-rules.adapters.copilot.enabled": true,
  "turbo-ai-rules.adapters.continue.enabled": false,

  // ========== Custom Adapters ==========
  "turbo-ai-rules.adapters.custom": []
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

#### 2.1 Parser Configuration (`parser`)

| Option               | Type    | Default | Description                                                             |
| -------------------- | ------- | ------- | ----------------------------------------------------------------------- |
| `strictMode`         | boolean | `false` | Enable strict mode: require id, title, and valid metadata in all rules  |
| `requireFrontmatter` | boolean | `false` | Require YAML frontmatter in rule files (accept plain Markdown when off) |

**Mode Description**:

- **Relaxed Mode** (Default - `strictMode: false`, `requireFrontmatter: false`):
  - ✅ Maximum compatibility, accepts all rule file formats
  - ✅ Auto-generates ID and Title from filename
  - ✅ Suitable for using community rule libraries
  - ⚠️ Limited conflict control capability
- **Strict Mode** (`strictMode: true`, `requireFrontmatter: true`):
  - ✅ Enforces metadata, precise rule control
  - ✅ Required fields: id, title must be explicitly declared in frontmatter
  - ✅ Suitable for enterprise-level rule library management
  - ⚠️ Requires manual metadata maintenance

**Example**:

```json
{
  // Relaxed mode (default, recommended)
  "turbo-ai-rules.parser.strictMode": false,
  "turbo-ai-rules.parser.requireFrontmatter": false
}
```

**When to Use Strict Mode**:

- Enterprise rule libraries requiring precise priority control
- Multi-team collaboration needing rule auditing and version management
- Custom rule libraries requiring traceability

**When to Use Relaxed Mode**:

- Using community rules (awesome-cursorrules, etc.)
- Quick prototyping and testing
- Personal projects or small teams
- No need for complex rule management

---

#### 3. Built-in Adapters Configuration (`adapters`)

| Adapter  | Config Key         | Default | Output File                       |
| -------- | ------------------ | ------- | --------------------------------- |
| Copilot  | `copilot.enabled`  | `true`  | `.github/copilot-instructions.md` |
| Cursor   | `cursor.enabled`   | `false` | `.cursorrules`                    |
| Continue | `continue.enabled` | `false` | `.continuerules`                  |

**Example**:

```json
{
  "turbo-ai-rules.adapters.cursor.enabled": false,
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
  "turbo-ai-rules.adapters.cursor.enabled": false,
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
  "turbo-ai-rules.adapters.cursor.enabled": false,
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
  "turbo-ai-rules.adapters.cursor.enabled": false,
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

---

## 📚 Related Documentation

- [01. Commands Reference](./01-commands.md) - All available commands
- [03. Rule File Format](./03-rule-format.md) - How to write rules
- [04. FAQ](./04-faq.md) - Frequently asked questions

---

[⬅️ Back to User Guide](./README.md)
