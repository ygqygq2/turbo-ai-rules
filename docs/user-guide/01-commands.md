# Commands Reference

> Complete guide to all available commands in Turbo AI Rules

[English](./commands.md) | [中文](./commands.zh.md)

---

## Overview

The extension provides 6 core commands covering the complete workflow of rule source management, syncing, and config generation.

### Quick Access

- **Status Bar**: Click **🤖 AI Rules** icon
- **Command Palette**: `Ctrl+Shift+P` → Type `Turbo AI Rules`
- **Tree View**: Right-click in **AI Rules** sidebar

### Tree View Icon Legend

The extension uses **colored icons** to indicate rule priority:

- 🔴 **Red** - High priority (HIGH)
- 🟡 **Yellow** - Medium priority (MEDIUM)
- ⚪ **White** - Normal priority (NORMAL)
- ⚫ **Gray** - Low priority (LOW)

Markers in rule descriptions:

- **✓ 已选** - Rule is selected for config generation
- **+N** - Number of additional tags (e.g., `+3` means 3 more tags not shown)

---

## 1. 🔗 Add Source

**Command**: `Turbo AI Rules: Add Source`

**Function**: Add a new Git rule repository as a rule source

### Use Cases

- Initial extension setup
- Add team-shared rule repositories
- Add personal rule repositories
- Add quality community rule sources

### Steps

1. Execute the command (or click the + button in status bar/tree view)
2. Enter Git repository URL
   - Public repo: `https://github.com/username/repo.git`
   - Private repo: Provide access token in subsequent steps
3. Select branch (optional, defaults to `main`)
4. Specify subpath (optional, must start with `/`, e.g., `/rules` or `/docs/rules`)
5. Set display name (optional, for easy identification in tree view)
6. Provide access token (required for private repos only)

### Example

```
URL:      https://github.com/company/coding-rules.git
Branch:   main
Subpath:  /best-practices
Name:     Company Rules
Token:    ghp_xxxxxxxxxxxx (private repo)
```

### Tips

- 🔐 Access token only needs `repo` (full repository access) permission
- 📁 Use subpath to sync only specific directories within the repository (must start with `/`)
- 🏷️ Set clear names for managing multiple rule sources

---

## 2. 🗑️ Remove Source

**Command**: `Turbo AI Rules: Remove Source`

**Function**: Remove an added rule source

### Use Cases

- Remove rule sources that are no longer needed
- Clean up outdated rule repositories
- Remove rules no longer used by the team

### Steps

1. Execute the command
2. Select the rule source to delete from the list
3. Confirm the deletion

**Alternatively**:

- Right-click on the rule source in the tree view
- Select **Remove**

### Important Notes

- ⚠️ Deleting a rule source will remove all rules from that source in the cache
- 🔄 Config files will be automatically regenerated after deletion (excluding rules from that source)
- 💾 Local Git clone will be deleted, but doesn't affect the remote repository

---

## 3. 🔄 Sync Rules

**Command**: `Turbo AI Rules: Sync Rules`

**Function**: Sync the latest rules from all enabled rule sources

### Use Cases

- Get the latest updates from rule sources
- Sync after adding a rule source for the first time
- Manually trigger rule updates (when auto-sync hasn't triggered in time)

### Steps

1. Execute the command (or click the 🔄 button in tree view)
2. The extension will sequentially:
   - Pull the latest code from Git repositories (`git pull`)
   - Parse all rule files (`.md` format)
   - Apply conflict resolution strategy (if duplicate rules exist)
   - Automatically generate all enabled config files

### Output Log Example

```
[Turbo AI Rules] Syncing rules from 3 sources...
[Turbo AI Rules] ✓ Synced: Company Rules (15 rules)
[Turbo AI Rules] ✓ Synced: Personal Rules (8 rules)
[Turbo AI Rules] ✓ Synced: Community Rules (42 rules)
[Turbo AI Rules] Total: 65 rules synced
[Turbo AI Rules] Generating config files...
[Turbo AI Rules] ✓ Generated: .cursorrules
[Turbo AI Rules] ✓ Generated: .github/copilot-instructions.md
[Turbo AI Rules] ✓ Generated: rules/index.md
[Turbo AI Rules] Sync completed successfully!
```

### Configuration Options

- `sync.onStartup`: Auto-sync on VS Code startup (default: `true`)
- `sync.interval`: Auto-sync interval in minutes (default: `60`)
- `sync.conflictStrategy`: Conflict resolution strategy (default: `priority`)

See [02. Configuration Guide](./02-configuration.md) for details.

### Tips

- ⏱️ First sync may take a few seconds to minutes (depends on number of rules)
- 🌐 Requires network connection to access Git repositories
- 📊 View detailed sync logs in the Output panel

---

## 4. 🔍 Search Rules

**Command**: `Turbo AI Rules: Search Rules`

**Function**: Search for specific content in all synced rules

### Use Cases

- Find rules for specific tech stacks (e.g., "TypeScript", "React")
- Search for rules on specific topics (e.g., "naming", "testing")
- Browse the list of available rules

### Steps

1. Execute the command
2. Enter search keywords (supports fuzzy search)
3. Select a rule from the results to view details

### Search Scope

- Rule ID (`id`)
- Rule title (`title`)
- Rule tags (`tags`)
- Rule description (`description`)

### Example

```
Search: "typescript"
Results:
  - TypeScript Naming Conventions
  - TypeScript Best Practices
  - TypeScript Testing Guide
  - React + TypeScript Patterns
```

### Tips

- 🔤 Search is case-insensitive
- 🏷️ Can filter quickly by tags (e.g., `#react`, `#testing`)
- 📄 Selecting a rule will preview its content in the editor

---

## 5. 📝 Generate Config Files

**Command**: `Turbo AI Rules: Generate Config Files`

**Function**: Manually regenerate all AI tool configuration files

### Use Cases

- Config files were accidentally deleted or modified
- Regenerate after changing adapter configuration
- Manually verify config file generation logic

### Steps

1. Execute the command
2. The extension will regenerate all enabled config files based on current configuration

### Generated Files

```
✅ Cursor:       .cursorrules
✅ Copilot:      .github/copilot-instructions.md
⚙️ Continue:     .continuerules (if enabled)
✅ Custom:       Generated based on custom adapter config
```

### Important Notes

- ⚠️ **Will overwrite existing config files**, manual modifications will be lost
- 💡 Recommend modifying rule sources instead of config files themselves
- 🔄 This command is automatically called when syncing rules

### Tips

- If you don't want config generation for a specific tool, disable the corresponding adapter in settings
- Custom adapters support configuring multiple output targets

---

## 6. ⚙️ Manage Sources

**Command**: `Turbo AI Rules: Manage Sources`

**Function**: Edit existing rule source configuration

### Use Cases

- Change rule source branch (e.g., switch from `main` to `develop`)
- Modify subpath (adjust rule file directory)
- Update display name
- Update access token (when token expires or changes)
- Enable/disable rule sources

### Steps

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

### Example Scenarios

#### Scenario 1: Switch to development branch

```
Rule Source: Company Rules
Action:      Change branch
Old Value:   main
New Value:   develop
```

#### Scenario 2: Update expired Token

```
Rule Source: Private Rules
Action:      Update Token
New Value:   ghp_newtoken123456
```

#### Scenario 3: Temporarily disable rule source

```
Rule Source: Experimental Rules
Action:      Disable
Effect:      Rules from this source are no longer included in config files
```

### Tips

- 🔄 Automatically re-syncs after configuration changes
- 💾 Configuration is persistently saved in workspace settings
- 🌲 Tree view reflects enable/disable status in real-time

---

## 7. Advanced Commands

### 7.1 UI & Visualization Commands

#### 📊 Show Statistics

**Command**: `Turbo AI Rules: Show Statistics`

Display statistical dashboard with:

- Total rules count by source
- Rule distribution by priority
- Tag cloud and category breakdown
- Sync history and trends

#### 🏠 Open Dashboard

**Command**: `Turbo AI Rules: Open Dashboard`

Open the main dashboard webview with quick access to all features.

#### 🔍 Advanced Search

**Command**: `Turbo AI Rules: Advanced Rule Search`

Open advanced search interface with:

- Multi-field search (title, tags, content)
- Filter by source, priority, tags
- Search result preview
- Export search results

#### 📋 Open Rule Sync Page

**Command**: `Turbo AI Rules: Open Rule Sync Page`

Open the rule selection interface with file tree view for selecting specific rules to sync.

#### ℹ️ View Source Detail

**Command**: `Turbo AI Rules: View Source Detail`

View detailed information about a rule source including:

- Git repository information
- Sync status and history
- Rule statistics
- Configuration details

### 7.2 Rule Management Commands

#### ✅ Select All Rules

**Command**: `Turbo AI Rules: Select All Rules`

Select all rules from all sources for config generation.

#### ❌ Deselect All Rules

**Command**: `Turbo AI Rules: Deselect All Rules`

Deselect all rules (useful for starting fresh selection).

#### 📋 Select Rules

**Command**: `Turbo AI Rules: Select Rules`

Open rule selector for a specific source to choose which rules to include.

#### 📄 Copy Rule Content

**Command**: `Turbo AI Rules: Copy Rule Content`

Copy the content of a selected rule to clipboard.

#### 📤 Export Rule

**Command**: `Turbo AI Rules: Export Rule`

Export a rule to a standalone file.

#### 👁️ Ignore Rule

**Command**: `Turbo AI Rules: Ignore Rule`

Mark a rule as ignored (won't be included in config generation).

### 7.3 Source Management Commands

#### ✏️ Edit Source

**Command**: `Turbo AI Rules: Edit Source`

Quick edit source properties (branch, subpath, name, token).

#### 🔌 Test Connection

**Command**: `Turbo AI Rules: Test Connection`

Test Git connection and authentication for a source.

#### 🔄 Toggle Source

**Command**: `Turbo AI Rules: Toggle Source`

Quickly enable/disable a rule source.

#### ⚙️ Open Source Manager

**Command**: `Turbo AI Rules: Open Source Manager`

Open comprehensive source management interface.

### 7.4 System Commands

#### 🔄 Reload Settings

**Command**: `Turbo AI Rules: Reload Settings`

Reload extension settings from workspace/user configuration.

#### 🔄 Refresh Git Cache

**Command**: `Turbo AI Rules: Refresh Git Cache`

Force refresh Git cache for all sources.

#### 🔄 Refresh

**Command**: `Turbo AI Rules: Refresh`

Refresh the tree view display.

#### ⚙️ Manage Adapters

**Command**: `Turbo AI Rules: Manage Adapters`

Configure AI tool adapters (Cursor, Copilot, Continue, Custom).

#### 🗑️ Clear Workspace State (Debug)

**Command**: `Turbo AI Rules: Clear Workspace State`

Clear all workspace state data (for debugging purposes).

### 7.5 Quick Access via Context Menu

Most advanced commands are accessible via:

- **Tree View**: Right-click on sources or rules
- **Status Bar**: Click the 🤖 AI Rules icon
- **Command Palette**: `Ctrl+Shift+P` → Type command name

---

## 🎯 Recommended Workflow

### For First-Time Users

1. **Initialize**: `Add Source` → Add rule sources
2. **Sync**: `Sync Rules` → Get rules
3. **Verify**: Check generated config files
4. **Start Using**: AI tools will automatically load rules

### For Regular Use

1. **Update**: Regularly `Sync Rules` to get latest updates
2. **Search**: Use `Search Rules` to find specific rules
3. **Adjust**: Use `Manage Sources` to fine-tune configuration

### For Team Collaboration

1. **Share Sources**: Team members add same rule sources
2. **Sync Settings**: Share `.vscode/settings.json` in version control
3. **Update Together**: Team syncs rules at regular intervals

---

## 🆘 Troubleshooting

### Command Not Found

- Ensure the extension is properly installed and activated
- Check VS Code Extensions view for any errors
- Try reloading VS Code

### Sync Failed

- Check Output panel → "Turbo AI Rules" for detailed error logs
- Verify network connection
- Confirm Git repository URL and token (for private repos)

### Config Files Not Generated

- Check if corresponding adapters are enabled in settings
- Verify workspace has a root folder opened
- Try manually running `Generate Config Files` command

---

## 📚 Related Documentation

- [02. Configuration Guide](./02-configuration.md) - Detailed configuration options
- [03. Rule File Format](./03-rule-format.md) - How to write rules
- [04. FAQ](./04-faq.md) - Frequently asked questions

---

[⬅️ Back to User Guide](./README.md)
