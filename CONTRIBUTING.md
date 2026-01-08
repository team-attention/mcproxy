# Contributing to mcproxy

Thank you for your interest in contributing to mcproxy!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/team-attention/mcproxy.git
cd mcproxy

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## Development Commands

```bash
npm run build      # Compile TypeScript to dist/
npm test           # Run tests in watch mode
npm test -- --run  # Run tests once
npm run dev        # Run with tsx (development)
npm run lint       # Run ESLint
```

## Code Style

- Use TypeScript for all source files
- Use kebab-case for file names (e.g., `config-manager.ts`)
- Run `npm run lint` before committing

## Making Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run tests (`npm test -- --run`)
6. Commit your changes
7. Push to your fork
8. Open a Pull Request

## Pull Request Guidelines

- Provide a clear description of the changes
- Link any related issues
- Ensure all tests pass
- Keep changes focused and atomic

## Reporting Issues

When reporting bugs, please include:

- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant error messages or logs

## Questions?

Open an issue with the "question" label.
