"""Preprocessing module to convert JSONL traces to visualization-ready JSON."""

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass
class CookedMessage:
    """Deduplicated message with stable ID."""

    id: str
    role: str  # "system" | "user" | "tool_use" | "tool_result" | "assistant"
    content: str
    tool_calls: list[dict] | None = None


@dataclass
class CookedTool:
    """Deduplicated tool definition with stable ID."""

    id: str
    name: str
    description: str
    parameters: dict


@dataclass
class CookedRequest:
    """A single request/response pair with references to messages and tools."""

    id: str
    parent_id: str | None
    timestamp: int  # Unix milliseconds
    request_messages: list[str]  # Message IDs
    response_message: str  # Message ID
    model: str
    tools: list[str]  # Tool IDs
    duration_ms: int


@dataclass
class CookedOutput:
    """Final output structure for visualization."""

    messages: list[CookedMessage] = field(default_factory=list)
    tools: list[CookedTool] = field(default_factory=list)
    requests: list[CookedRequest] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "messages": [asdict(m) for m in self.messages],
            "tools": [asdict(t) for t in self.tools],
            "requests": [asdict(r) for r in self.requests],
        }


def _compute_message_hash(role: str, content: str, tool_calls: list[dict] | None) -> str:
    """Compute stable hash for message deduplication."""
    data = {
        "role": role,
        "content": content,
        "tool_calls": tool_calls,
    }
    json_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(json_str.encode()).hexdigest()[:16]


def _compute_tool_hash(name: str, description: str, parameters: dict) -> str:
    """Compute stable hash for tool deduplication."""
    data = {
        "name": name,
        "description": description,
        "parameters": parameters,
    }
    json_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(json_str.encode()).hexdigest()[:16]


def _map_role(role: str, tool_calls: list[dict] | None) -> str:
    """Map original role to visualization role."""
    if role == "assistant" and tool_calls:
        return "tool_use"
    if role == "tool":
        return "tool_result"
    return role


def _parse_tool_calls(tool_calls: list[dict] | None) -> list[dict] | None:
    """Parse tool_calls, flattening to {name, arguments} format for frontend."""
    if not tool_calls:
        return None

    parsed = []
    for tc in tool_calls:
        # Extract function name and arguments from OpenAI format
        if "function" in tc and isinstance(tc["function"], dict):
            func = tc["function"]
            name = func.get("name", "")
            arguments = func.get("arguments", {})

            # Decode JSON arguments string to dict
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    arguments = {"raw": arguments}  # Keep as raw if not valid JSON

            parsed.append({"name": name, "arguments": arguments})
        else:
            # Already flat format or unknown structure
            parsed.append(tc)
    return parsed


def _iso_to_unix_ms(iso_str: str) -> int:
    """Convert ISO timestamp to Unix milliseconds."""
    # Handle various ISO formats
    iso_str = iso_str.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(iso_str)
        return int(dt.timestamp() * 1000)
    except ValueError:
        return 0


class TraceCooker:
    """Processes trace records into deduplicated visualization format."""

    def __init__(self):
        self.message_hash_to_id: dict[str, str] = {}
        self.tool_hash_to_id: dict[str, str] = {}
        self.messages: list[CookedMessage] = []
        self.tools: list[CookedTool] = []
        self.requests: list[CookedRequest] = []
        self._message_counter = 0
        self._tool_counter = 0

    def _get_or_create_message(self, role: str, content: str, tool_calls: list[dict] | None) -> str:
        """Get existing message ID or create new message, returns ID."""
        mapped_role = _map_role(role, tool_calls)
        parsed_tool_calls = _parse_tool_calls(tool_calls)
        content = content or ""

        msg_hash = _compute_message_hash(mapped_role, content, parsed_tool_calls)

        if msg_hash in self.message_hash_to_id:
            return self.message_hash_to_id[msg_hash]

        msg_id = f"m{self._message_counter}"
        self._message_counter += 1

        msg = CookedMessage(
            id=msg_id,
            role=mapped_role,
            content=content,
            tool_calls=parsed_tool_calls,
        )
        self.messages.append(msg)
        self.message_hash_to_id[msg_hash] = msg_id
        return msg_id

    def _get_or_create_tool(self, name: str, description: str, parameters: dict) -> str:
        """Get existing tool ID or create new tool, returns ID."""
        tool_hash = _compute_tool_hash(name, description, parameters)

        if tool_hash in self.tool_hash_to_id:
            return self.tool_hash_to_id[tool_hash]

        tool_id = f"t{self._tool_counter}"
        self._tool_counter += 1

        tool = CookedTool(
            id=tool_id,
            name=name,
            description=description,
            parameters=parameters,
        )
        self.tools.append(tool)
        self.tool_hash_to_id[tool_hash] = tool_id
        return tool_id

    def _process_request_messages(self, messages: list[dict]) -> list[str]:
        """Process request messages and return list of message IDs."""
        msg_ids = []
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")
            tool_calls = msg.get("tool_calls")

            msg_id = self._get_or_create_message(role, content, tool_calls)
            msg_ids.append(msg_id)
        return msg_ids

    def _process_response_message(self, response: dict | None, error: str | None) -> str:
        """Process response and return message ID."""
        if error:
            return self._get_or_create_message("assistant", f"Error: {error}", None)

        if not response:
            return self._get_or_create_message("assistant", "", None)

        choices = response.get("choices", [])
        if not choices:
            return self._get_or_create_message("assistant", "", None)

        message = choices[0].get("message", {})
        role = message.get("role", "assistant")
        content = message.get("content", "")
        tool_calls = message.get("tool_calls")

        return self._get_or_create_message(role, content, tool_calls)

    def _process_tools(self, tools: list[dict] | None) -> list[str]:
        """Process tool definitions and return list of tool IDs."""
        if not tools:
            return []

        tool_ids = []
        for tool in tools:
            if tool.get("type") == "function":
                func = tool.get("function", {})
                name = func.get("name", "")
                description = func.get("description", "")
                parameters = func.get("parameters", {})

                tool_id = self._get_or_create_tool(name, description, parameters)
                tool_ids.append(tool_id)
        return tool_ids

    def process_record(self, record: dict, parent_id: str | None) -> str:
        """Process a single trace record, returns its ID for chaining."""
        request = record.get("request", {})
        response = record.get("response")
        error = record.get("error")

        # Process request messages
        messages = request.get("messages", [])
        request_msg_ids = self._process_request_messages(messages)

        # Process response message
        response_msg_id = self._process_response_message(response, error)

        # Process tools
        tools = request.get("tools", [])
        tool_ids = self._process_tools(tools)

        # Create request record
        record_id = record.get("id", "")
        timestamp = _iso_to_unix_ms(record.get("timestamp", ""))
        model = request.get("model", "")
        duration_ms = record.get("duration_ms", 0)

        cooked_request = CookedRequest(
            id=record_id,
            parent_id=parent_id,
            timestamp=timestamp,
            request_messages=request_msg_ids,
            response_message=response_msg_id,
            model=model,
            tools=tool_ids,
            duration_ms=duration_ms,
        )
        self.requests.append(cooked_request)

        return record_id

    def cook(self, records: list[dict]) -> CookedOutput:
        """Process all records and return deduplicated output."""
        parent_id = None
        for record in records:
            parent_id = self.process_record(record, parent_id)

        return CookedOutput(
            messages=self.messages,
            tools=self.tools,
            requests=self.requests,
        )


def cook_traces(input_path: str, output_path: str) -> None:
    """Main entry point: read JSONL/JSON traces and write cooked JSON output."""
    input_file = Path(input_path)
    output_file = Path(output_path)

    # Read records
    records = []
    content = input_file.read_text(encoding="utf-8")

    # Try to parse as JSON array first (single JSON file)
    try:
        data = json.loads(content)
        if isinstance(data, list):
            records = data
        else:
            # Single record
            records = [data]
    except json.JSONDecodeError:
        # Parse as JSONL
        for line in content.strip().split("\n"):
            if line.strip():
                records.append(json.loads(line))

    # Process records
    cooker = TraceCooker()
    output = cooker.cook(records)

    # Write output
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output.to_dict(), f, ensure_ascii=False, indent=2)

    print(f"Processed {len(records)} records")
    print(f"  Messages: {len(output.messages)} (deduplicated)")
    print(f"  Tools: {len(output.tools)} (deduplicated)")
    print(f"  Requests: {len(output.requests)}")
    print(f"Output written to: {output_path}")
