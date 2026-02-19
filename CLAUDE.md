# LLM Trace

A tool for tracing LLM requests - intercepts API calls and saves them for debugging and analysis.

## Quick Reference

```bash
# Start proxy server
uv run llm-trace serve --port 8080 --output ./traces/trace.jsonl

# Preprocess traces for visualization
uv run llm-trace cook ./traces/trace.jsonl -o ./viewer/public/data.json

# Install dependencies
uv sync

# Run with ruff
uv run ruff check llm_trace/
uv run ruff format llm_trace/
```

## Directory Structure

```
llm-trace/
├── llm_trace/           # Main package
│   ├── cli.py           # CLI entry point (subcommands: serve, cook)
│   ├── cook.py          # Trace preprocessing for visualization
│   ├── proxy.py         # Proxy server (Starlette + httpx)
│   ├── storage.py       # JSONL append-only storage
│   └── models.py        # TraceRecord dataclass
├── docs/                # Design documentation
├── traces/              # Default output directory
└── pyproject.toml       # Project config
```

## Tech Stack

- **Framework**: Starlette (ASGI)
- **HTTP Client**: httpx (async, streaming)
- **Server**: uvicorn
- **Storage**: JSONL (append-only, no database)
- **Python**: 3.10+

## Key Concepts

### Proxy Flow

1. Client sends request to `localhost:8080/v1/...`
2. Proxy forwards to target API (default: OpenAI)
3. Response is streamed back (if SSE) or returned whole
4. Request/response pair saved to JSONL

### Streaming (SSE)

- Chunks forwarded in real-time to client
- Content deltas collected and reassembled
- Complete response saved after stream ends

### Storage Format

Each line in JSONL:
```json
{"id": "uuid", "timestamp": "ISO", "request": {...}, "response": {...}, "duration_ms": 1200}
```

### Cook (Preprocessing)

The `cook` command transforms raw JSONL traces into visualization-ready JSON:

- **Message deduplication**: Same messages get reused across requests via hash-based IDs
- **Tool deduplication**: Tool definitions are deduplicated by (name, description, parameters)
- **Role mapping**: `assistant` with tool_calls → `tool_use`, `tool` → `tool_result`
- **Request chaining**: Each request has `parent_id` pointing to the previous request

Output structure:
```json
{"messages": [...], "tools": [...], "requests": [...]}
```

## Conventions

- Type hints on all functions
- Async for HTTP operations
- Dataclasses for data models
- Relative imports within package (`from .models import ...`)

## What NOT to Do

- NEVER edit .env or credentials
- NEVER commit trace files with sensitive data
- NEVER add eslint-disable style comments - fix the issue
- NEVER create abstractions that weren't requested

## Testing

TODO: Set up pytest

## Commit Rules

Run `/commit` after completing tasks.
