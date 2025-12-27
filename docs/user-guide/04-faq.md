# Frequently Asked Questions (FAQ)

> Common questions and troubleshooting guide

[English](./faq.md) | [中文](./faq.zh.md)

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

**Core Mechanism**: The extension only manages files with `00000-79999` prefixes. Files with `80000-99999` prefixes won't be modified or deleted.

**Why recommend 80000-99999 prefix?**

- 🛡️ **Avoid Conflicts**: Auto-generated files use `00000-79999` prefix, your files use `80000-99999` prefix, completely no conflict
- 📋 **Clear Management**: Easily distinguish which are auto-generated and which are user-defined
- 🔒 **Automatic Protection**: Sync automatically skips files with `80000-99999` prefix, no additional configuration needed

> 💡 **Note**: The `80000-99999` prefix is **not mandatory**, it's just a **recommended naming convention** to avoid conflicts with auto-generated files.
> If adapter's `enableUserRules` configuration is enabled (default: true), the extension will more intelligently detect user files.

**Steps**:

```bash
# 1. Enter rules directory
cd .cursor/rules

# 2. Create custom rule file (using 80000-99999 prefix)
touch 85000-my-team-rules.mdc

# 3. Edit the file
code 85000-my-team-rules.mdc
```

**Naming Recommendations**:

| Prefix Range  | Purpose                                             | Priority   | Example                      |
| ------------- | --------------------------------------------------- | ---------- | ---------------------------- |
| `00000-79999` | 🤖 Auto-generated (**will be overwritten/deleted**) | Auto rules | `00200-typescript.mdc`       |
| `80000-84999` | ✍️ High-priority custom (can override auto rules)   | Highest    | `82000-team-overrides.mdc`   |
| `85000-89999` | ✍️ Regular custom rules                             | High       | `85000-project-specific.mdc` |
| `90000-94999` | ✍️ Supplementary rules                              | Medium     | `90000-code-review.mdc`      |
| `95000-99999` | ✍️ FAQ, references                                  | Low        | `99000-faq.mdc`              |

**Example File Structure**:

```
.cursor/rules/
├── 00001-project-overview.mdc        ← 🤖 Auto-generated
├── 00200-typescript.mdc              ← 🤖 Auto-generated
├── 00300-react.mdc                   ← 🤖 Auto-generated
├── 82000-team-overrides.mdc          ← ✍️ You created (safe)
├── 85000-api-conventions.mdc         ← ✍️ You created (safe)
└── 90000-code-review-checklist.mdc   ← ✍️ You created (safe)
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
> - This extension adopts a **conservative strategy**: use `80000-99999` prefix to protect user-defined files
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

**Method 2: Single File Mode (e.g., `.cursorrules`, `copilot-instructions.md`) - Block Marker Protection**

Single file configuration uses **block markers** to separate auto-generated and user-defined areas.

> ⚠️ **Important**: Block markers are only generated when adapter's `enableUserRules` is enabled (default: true)!

**Configure Block Markers**:

```json
{
  "turbo-ai-rules.userRules": {
    "markers": {
      "begin": "<!-- TURBO-AI-RULES:BEGIN -->",
      "end": "<!-- TURBO-AI-RULES:END -->"
    }
  }
}
```

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
1. ✅ Did you use `80000-99999` prefix for file name?
2. ✅ Is file format correct (MDC format with frontmatter)?
3. ✅ Is file encoding UTF-8?
4. ✅ Is rule content clear and specific?

**Single File Mode**:
1. ✅ Is adapter's `enableUserRules` enabled? (Default: true. If no block markers, check this setting)
2. ✅ Is custom content **outside** the block markers?
3. ✅ Did you use clear titles and priority declarations?
4. ✅ Have you synced rules recently? (ensure file is up-to-date)

> 💡 **Tip**: If generated single file has no `<!-- TURBO-AI-RULES:BEGIN -->` markers, adapter's `enableUserRules` may be disabled (check configuration).
> Enable it and re-sync to generate markers, then you can safely add custom rules outside the markers.

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

#### Q12: How does user rules protection work?

**A**: User rules protection is controlled by the `userRules` configuration and adapter-level `enableUserRules` setting.

**Configuration**:

```json
{
  "turbo-ai-rules.userRules": {
    "directory": "ai-rules",
    "markers": {
      "begin": "<!-- TURBO-AI-RULES:BEGIN -->",
      "end": "<!-- TURBO-AI-RULES:END -->"
    }
  },
  "turbo-ai-rules.adapters.cursor": {
    "enabled": true,
    "enableUserRules": true  // Enable user rules for this adapter (default: true)
  }
}
```

**When `enableUserRules: true` (default)**:

- ✅ **Directory Rules**: Reads and merges rules from `userRules.directory` (default: `ai-rules/`)
- 🛡️ **Content Protection**: Single file mode uses `userRules.markers` to separate auto-generated and user-defined areas
- 🎯 **First-Time Protection**: If file exists without markers, **entire existing file content is treated as user rules and preserved**
- 📦 **Auto Markers**: Automatically adds block markers to single files

**When `enableUserRules: false`**:

- ❌ Doesn't read user rules from directory
- ❌ Doesn't protect user content
- ⚙️ Complete overwrite mode (use with caution)

**Block Marker Example** (Single File Mode):

When enabled, generated files will include block markers:

```markdown
<!-- TURBO-AI-RULES:BEGIN -->
<!-- ⚠️  WARNING: Auto-generated content - Will be overwritten on sync -->
<!-- Last Sync: 2024-11-26 10:30:00 -->

(Auto-generated rules content here)

<!-- TURBO-AI-RULES:END -->

<!-- ============================================== -->
<!-- 👤 User-Defined Rules Section -->
<!-- ============================================== -->
<!-- Add your custom rules below this line -->

## Your Custom Rules

(Add your custom content here, won't be overwritten on sync)
```

**First-Time Usage Scenario**:

If you already have a `.cursorrules` or `copilot-instructions.md` file and adapter's `enableUserRules` is enabled (default):

1. ✅ **First generation**: Extension detects file has no block markers
2. ✅ **Preserve existing content**: Entire existing file content is treated as user-defined rules
3. ✅ **Add block markers**: Block markers and new generated rules are inserted at the top
4. ✅ **Original content moves down**: Your original content is moved after the block markers, fully preserved

This allows you to safely add custom content outside the markers without being overwritten during sync.

**Configuration**:

```json
{
  "turbo-ai-rules.userRules": {
    "directory": "ai-rules",
    "markers": {
      "begin": "<!-- TURBO-AI-RULES:BEGIN -->",
      "end": "<!-- TURBO-AI-RULES:END -->"
    }
  },
  "turbo-ai-rules.userPrefixRange": {
    "min": 80000,
    "max": 99999  // Customizable range
  }
}
```

**Usage Recommendations**:

- 🆕 New users: Keep default disabled, just follow `80000-99999` prefix naming
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
Subpath: /best-practices
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

### Workspace and Environment

#### Q15: Does this extension support multi-root workspaces?

**A**: Currently has **limited support**. The extension can work in multi-root workspace environments, but with the following limitations:

**Current Behavior**:

- ⚠️ Only the **first workspace folder** will be used for all operations
- ⚠️ You'll be prompted to confirm before sync/generate operations
- ⚠️ Cannot guarantee correct behavior across all workspace folders
- ⚠️ Rule selection state is shared across all folders (not isolated per folder)

**Example Scenario**:

```
workspace.code-workspace
├─ project-a/  ← ✅ Will be used
├─ project-b/  ← ⚠️ Will be ignored
└─ project-c/  ← ⚠️ Will be ignored
```

**Recommended Approach**:

1. **Single Workspace**: Open each project folder separately when using this extension
2. **Confirmation Dialog**: When you run sync/generate commands in multi-root workspace, you'll see:

   ```
   ⚠️ Multi-root workspace detected
   Cannot guarantee extension works properly.
   Will use first workspace: "project-a"

   Continue anyway?
   [Continue] [Cancel]
   ```

3. **Best Practice**: If you need to manage rules for multiple projects, open them in separate VS Code windows

**Why This Limitation?**

- Workspace context can be lost when switching between webviews and editors
- Rule selection state management becomes complex in multi-root scenarios
- Maintaining simplicity and reliability for the primary use case (single workspace)

**Future Plans**: Full multi-root workspace support may be added in future versions based on user feedback.

---

### Advanced Questions

#### Q16: How to use in CI/CD?

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

#### Q17: How to contribute rules to the community?

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

---

## 📚 Related Documentation

- [01. Commands Reference](./01-commands.md) - All available commands
- [02. Configuration Guide](./02-configuration.md) - Configuration options
- [03. Rule File Format](./03-rule-format.md) - How to write rules

---

[⬅️ Back to User Guide](./README.md)
