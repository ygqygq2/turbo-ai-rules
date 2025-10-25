# Rule File Format (MDC)

> Guide to writing rules using MDC (Markdown + YAML Frontmatter) format

[English](./rule-format.md) | [中文](./rule-format.zh.md)

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

---

## 📚 Related Documentation

- [01. Commands Reference](./01-commands.md) - All available commands  
- [02. Configuration Guide](./02-configuration.md) - Configuration options
- [04. FAQ](./04-faq.md) - Frequently asked questions

---

[⬅️ Back to User Guide](./README.md)
