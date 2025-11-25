.PHONY: help check check-npm version version-patch version-minor version-major publish-npm publish clean

# Default target
help:
	@echo "Available targets:"
	@echo "  make version        - Show current version"
	@echo "  make check          - Check prerequisites (npm login)"
	@echo "  make version-patch  - Bump patch version (1.0.0 -> 1.0.1)"
	@echo "  make version-minor  - Bump minor version (1.0.0 -> 1.1.0)"
	@echo "  make version-major  - Bump major version (1.0.0 -> 2.0.0)"
	@echo "  make publish-npm    - Publish to npm"
	@echo "  make publish        - Publish to npm (alias for publish-npm)"
	@echo "  make clean          - Clean build artifacts"

# Show current version
version:
	@echo "Current version: $$(node -p "require('./package.json').version")"

# Check prerequisites
check: check-npm
	@echo "All checks passed!"

check-npm:
	@echo "Checking npm login status..."
	@npm whoami > /dev/null 2>&1 || (echo "Error: Not logged in to npm. Run 'npm login' first." && exit 1)
	@echo "✓ npm login verified"

# Version bumping
version-patch:
	@echo "Bumping patch version..."
	@npm version patch --no-git-tag-version
	@echo "Version bumped successfully"

version-minor:
	@echo "Bumping minor version..."
	@npm version minor --no-git-tag-version
	@echo "Version bumped successfully"

version-major:
	@echo "Bumping major version..."
	@npm version major --no-git-tag-version
	@echo "Version bumped successfully"

# Publish to npm
publish-npm: check-npm
	@echo "Publishing to npm..."
	@npm publish
	@echo "✓ Published to npm successfully"

# Publish to npm (alias)
publish: publish-npm

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf dist node_modules/.cache
	@echo "✓ Clean complete"

