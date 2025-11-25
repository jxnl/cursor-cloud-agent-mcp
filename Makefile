.PHONY: help check check-npm check-smithery version version-patch version-minor version-major sync-smithery-version publish-npm publish-smithery publish clean

# Default target
help:
	@echo "Available targets:"
	@echo "  make version        - Show current version"
	@echo "  make check          - Check prerequisites (npm login, smithery CLI)"
	@echo "  make version-patch  - Bump patch version (1.0.0 -> 1.0.1)"
	@echo "  make version-minor  - Bump minor version (1.0.0 -> 1.1.0)"
	@echo "  make version-major  - Bump major version (1.0.0 -> 2.0.0)"
	@echo "  make publish-npm    - Publish to npm only"
	@echo "  make publish-smithery - Publish to Smithery only"
	@echo "  make publish        - Publish to both npm and Smithery"
	@echo "  make clean          - Clean build artifacts"

# Show current version
version:
	@echo "Current version: $$(node -p "require('./package.json').version")"

# Check prerequisites
check: check-npm check-smithery
	@echo "All checks passed!"

check-npm:
	@echo "Checking npm login status..."
	@npm whoami > /dev/null 2>&1 || (echo "Error: Not logged in to npm. Run 'npm login' first." && exit 1)
	@echo "✓ npm login verified"

check-smithery:
	@echo "Checking Smithery setup..."
	@which smithery > /dev/null 2>&1 || (echo "Warning: Smithery CLI not found. Install with 'npm install -g @smithery/cli'" && exit 0)
	@echo "✓ Smithery CLI found"
	@echo "Note: Smithery publishing is done via web interface at https://smithery.ai"
	@echo "      Ensure your GitHub repo is connected and smithery.yaml is committed."

# Version bumping
version-patch:
	@echo "Bumping patch version..."
	@npm version patch --no-git-tag-version
	@$(MAKE) sync-smithery-version
	@echo "Version bumped successfully"

version-minor:
	@echo "Bumping minor version..."
	@npm version minor --no-git-tag-version
	@$(MAKE) sync-smithery-version
	@echo "Version bumped successfully"

version-major:
	@echo "Bumping major version..."
	@npm version major --no-git-tag-version
	@$(MAKE) sync-smithery-version
	@echo "Version bumped successfully"

# Update smithery.yaml version to match package.json
sync-smithery-version:
	@echo "Syncing smithery.yaml version with package.json..."
	@VERSION=$$(node -p "require('./package.json').version"); \
	if [ "$$(uname)" = "Darwin" ]; then \
		sed -i '' "s/^version:.*/version: $$VERSION/" smithery.yaml; \
	else \
		sed -i "s/^version:.*/version: $$VERSION/" smithery.yaml; \
	fi
	@echo "✓ Version synced to $$(node -p "require('./package.json').version")"

# Publish to npm
publish-npm: check-npm sync-smithery-version
	@echo "Publishing to npm..."
	@npm publish
	@echo "✓ Published to npm successfully"

# Publish to Smithery (via web interface)
publish-smithery: sync-smithery-version
	@echo "Preparing for Smithery publishing..."
	@echo "✓ Version synced in smithery.yaml"
	@echo ""
	@echo "To publish to Smithery:"
	@echo "1. Ensure smithery.yaml is committed and pushed to GitHub"
	@echo "2. Visit https://smithery.ai and connect your GitHub repository"
	@echo "3. Smithery will automatically detect and publish your MCP server"
	@echo ""
	@echo "Repository URL: https://github.com/jxnl/cursor-cloud-agent-mcp"

# Publish to both
publish: check-npm sync-smithery-version
	@echo "Publishing to npm..."
	@npm publish
	@echo "✓ Published to npm successfully"
	@echo ""
	@echo "For Smithery publishing:"
	@echo "1. Ensure smithery.yaml is committed and pushed to GitHub"
	@echo "2. Visit https://smithery.ai and connect your GitHub repository"
	@echo "3. Smithery will automatically detect and publish your MCP server"
	@echo ""
	@echo "Repository URL: https://github.com/jxnl/cursor-cloud-agent-mcp"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf dist node_modules/.cache
	@echo "✓ Clean complete"

