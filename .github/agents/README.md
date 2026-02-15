# AI Assistant Agents

This directory contains custom agent files (`.agent.md`) that give your AI coding assistant a specific persona, tools, and project-aware rules. They appear directly in the **agents dropdown** in Copilot Chat.

## Available Agents

| Agent | File | Best For |
|-------|------|----------|
| **Full-Stack Developer** | `full-stack-developer.agent.md` | Building features, writing application code, full-stack development |
| **Test Engineer** | `test-engineer.agent.md` | Writing unit/integration/e2e tests, test strategy, catching edge cases |
| **UI/UX Engineer** | `ui-ux-engineer.agent.md` | UI work, accessibility, design system compliance, responsive layouts |
| **DevOps Engineer** | `devops-engineer.agent.md` | CI/CD, Docker, deployment, monitoring, infrastructure |
| **Security Engineer** | `security-engineer.agent.md` | Security reviews, vulnerability assessment, hardening |
| **Code Reviewer** | `code-reviewer.agent.md` | PR reviews, code quality feedback, architecture guidance |
| **Technical Writer** | `technical-writer.agent.md` | READMEs, API docs, architecture diagrams, decision records |
| **Performance Engineer** | `performance-engineer.agent.md` | Profiling, optimisation, bundle size, Core Web Vitals |

## How to Use

1. Open the **Copilot Chat** panel (`Ctrl+Cmd+I`)
2. Click the **agents dropdown** (where it says "Agent", "Ask", etc.)
3. Select one of the custom agents listed above
4. Type your request — the AI adopts that agent's expertise, tools, and rules

Each agent has a curated set of tools. For example, **Code Reviewer** only has read-only tools (no file editing), while **Full-Stack Developer** has full access to edit files, search the codebase, and analyze code usages.

## Tool Sets by Agent

Agents use the following tools:
- `edit/editFiles` - Edit files in the workspace
- `search/codebase` - Semantic search across the codebase
- `search` - File and text search
- `search/usages` - Find code references and usages
- `web/fetch` - Fetch content from web pages
- `search/changes` - View git changes and diffs

| Agent | Edit | Codebase | Search | Fetch | Usages | Changes |
|-------|------|----------|--------|-------|--------|---------|
| Full-Stack Developer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Test Engineer | ✅ | ✅ | ✅ | | ✅ | ✅ |
| UI/UX Engineer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DevOps Engineer | ✅ | ✅ | ✅ | ✅ | | ✅ |
| Security Engineer | ✅ | ✅ | ✅ | | ✅ | ✅ |
| Code Reviewer | | ✅ | ✅ | | ✅ | ✅ |
| Technical Writer | ✅ | ✅ | ✅ | ✅ | ✅ | |
| Performance Engineer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
