# gemini-search

**description**: Use Gemini to search the web for programming-related information, documentation, or solutions.

**signature**: gemini-search <query>

**arguments**:

- query: The search query (required)

**behavior**:

1. Searches the web for programming-related content
2. Returns relevant results with summaries
3. Focuses on technical documentation, Stack Overflow, GitHub, and official docs
4. Provides code examples when available

**examples**:

```bash
# Search for React hooks best practices
gemini-search "React hooks best practices 2024"

# Search for specific error solutions
gemini-search "TypeError: Cannot read property of undefined Next.js 14"

# Search for library documentation
gemini-search "Tailwind CSS animation utilities"
```

**implementation**:

```bash
gemini -p "WebSearch: $1"
```
