# gemini-analyze

**description**: Use Gemini to analyze code, repositories, or provide detailed insights about specific files or directories.

**signature**: gemini-analyze <path> [prompt]

**arguments**:
- path: The file or directory path to analyze (required)
- prompt: Additional analysis prompt or specific questions (optional)

**behavior**:
1. If a path is provided without a prompt, performs a comprehensive code analysis
2. If both path and prompt are provided, analyzes the code with the specific prompt in mind
3. Handles both individual files and entire directories
4. Returns structured analysis with insights, suggestions, and potential improvements

**examples**:
```bash
# Analyze a single file
gemini-analyze src/components/Button.tsx

# Analyze with specific prompt
gemini-analyze src/api/ "Check for security vulnerabilities and suggest improvements"

# Analyze entire repository
gemini-analyze . "Review the overall architecture and suggest refactoring opportunities"
```

**implementation**:
```bash
gemini -p "@$1 $2"
```