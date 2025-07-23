# Contributing to Context-Pods

Thank you for your interest in contributing to Context-Pods! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git

### Setting Up Your Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ContextPods.git
   cd ContextPods
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
ContextPods/
├── packages/          # Core packages
│   └── core/         # Core utilities and types
├── templates/        # MCP server templates
│   └── basic/       # Basic template example
├── examples/         # Example pods and usage
└── docs/            # Documentation
```

## 🔧 Development Workflow

### Working on Issues

1. Check the [issue tracker](https://github.com/conorluddy/ContextPods/issues) for open issues
2. Comment on an issue to indicate you're working on it
3. Create a feature branch:
   ```bash
   git checkout -b feature/issue-NUMBER-description
   ```

### Making Changes

1. Make your changes in the appropriate package/directory
2. Follow the existing code style and conventions
3. Add tests for new functionality
4. Update documentation as needed

### Code Style

- We use TypeScript for all code
- ESLint and Prettier are configured for consistent formatting
- Run `npm run lint` to check for issues
- Run `npm run format` to auto-format code

### Testing

- Write tests for new features and bug fixes
- Run tests with `npm test`
- Ensure all tests pass before submitting a PR

### Committing Changes

We follow conventional commit messages:

```
type(scope): description

Body (optional)

Footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

Example:
```
feat(core): add validation for pod configurations

- Add Zod schema for pod config validation
- Add unit tests for validation logic
- Update documentation

Closes #123
```

## 🔄 Pull Request Process

1. Update your branch with the latest main:
   ```bash
   git checkout main
   git pull upstream main
   git checkout feature/your-feature
   git rebase main
   ```

2. Push your branch:
   ```bash
   git push origin feature/your-feature
   ```

3. Create a Pull Request on GitHub:
   - Use a clear, descriptive title
   - Reference the issue number (e.g., "Closes #123")
   - Describe what changes you made and why
   - Include screenshots for UI changes

4. Address review feedback:
   - Make requested changes
   - Push new commits to your branch
   - Respond to comments

## 📝 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to all exported functions and classes
- Update package documentation in respective README files
- Consider adding examples for new features

## 🐛 Reporting Issues

When reporting issues, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Your environment (OS, Node.js version, etc.)
6. Any relevant error messages or logs

## 💡 Suggesting Features

We welcome feature suggestions! Please:

1. Check if the feature has already been suggested
2. Open a new issue with the "enhancement" label
3. Clearly describe the feature and its benefits
4. Consider how it fits with the project's goals

## 📄 License

By contributing to Context-Pods, you agree that your contributions will be licensed under the MIT License.

## 🤝 Code of Conduct

Please be respectful and constructive in all interactions. We're building something great together!

## 📮 Getting Help

- Check existing documentation and issues
- Ask questions in issue discussions
- Reach out to maintainers if needed

Thank you for contributing to Context-Pods! 🎉