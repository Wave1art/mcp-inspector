"""Mock MCP server with diverse tool types for testing the MCP Dev Inspector."""

import json
import random
import datetime
from fastmcp import FastMCP

mcp = FastMCP(
    "Inspector Test Server",
    version="1.0.0",
)

# ── Simple tools ──

@mcp.tool()
def greet(name: str) -> str:
    """Say hello to someone."""
    return f"Hello, {name}!"


@mcp.tool()
def add(a: float, b: float) -> float:
    """Add two numbers together."""
    return a + b


@mcp.tool()
def echo(message: str, uppercase: bool = False) -> str:
    """Echo a message back, optionally in uppercase."""
    return message.upper() if uppercase else message


# ── Tools returning structured data (tables) ──

@mcp.tool()
def search_employees(department: str = "", limit: int = 5) -> list[dict]:
    """Search for employees in the company directory.

    Returns a list of employee records with short fields,
    ideal for table rendering.
    """
    employees = [
        {"id": 1, "name": "Alice Chen", "department": "Engineering", "role": "Senior Engineer", "location": "London", "tenure_years": 5},
        {"id": 2, "name": "Bob Smith", "department": "Engineering", "role": "Staff Engineer", "location": "Berlin", "tenure_years": 8},
        {"id": 3, "name": "Carol Davis", "department": "Marketing", "role": "Marketing Manager", "location": "New York", "tenure_years": 3},
        {"id": 4, "name": "David Lee", "department": "Sales", "role": "Account Executive", "location": "Tokyo", "tenure_years": 2},
        {"id": 5, "name": "Eva Martinez", "department": "Engineering", "role": "Tech Lead", "location": "London", "tenure_years": 6},
        {"id": 6, "name": "Frank Wilson", "department": "Marketing", "role": "Content Strategist", "location": "Paris", "tenure_years": 4},
        {"id": 7, "name": "Grace Kim", "department": "Engineering", "role": "Junior Engineer", "location": "Seoul", "tenure_years": 1},
        {"id": 8, "name": "Henry Brown", "department": "Sales", "role": "Sales Director", "location": "London", "tenure_years": 10},
    ]
    if department:
        employees = [e for e in employees if e["department"].lower() == department.lower()]
    return employees[:limit]


@mcp.tool()
def list_servers(status: str = "all") -> list[dict]:
    """List cloud infrastructure servers.

    Returns server records with status, IP, and resource usage.
    Good for table rendering.
    """
    servers = [
        {"hostname": "web-prod-01", "ip": "10.0.1.10", "status": "running", "cpu_pct": 45, "mem_gb": 12.4, "region": "eu-west-1"},
        {"hostname": "web-prod-02", "ip": "10.0.1.11", "status": "running", "cpu_pct": 62, "mem_gb": 14.1, "region": "eu-west-1"},
        {"hostname": "api-prod-01", "ip": "10.0.2.10", "status": "running", "cpu_pct": 78, "mem_gb": 28.3, "region": "us-east-1"},
        {"hostname": "db-prod-01", "ip": "10.0.3.10", "status": "running", "cpu_pct": 35, "mem_gb": 56.0, "region": "us-east-1"},
        {"hostname": "worker-01", "ip": "10.0.4.10", "status": "stopped", "cpu_pct": 0, "mem_gb": 0.0, "region": "eu-west-1"},
        {"hostname": "staging-01", "ip": "10.0.5.10", "status": "running", "cpu_pct": 12, "mem_gb": 4.2, "region": "eu-west-1"},
    ]
    if status != "all":
        servers = [s for s in servers if s["status"] == status]
    return servers


# ── Tools returning documents (cards with long strings) ──

@mcp.tool()
def search_documents(query: str, max_results: int = 3) -> list[dict]:
    """Search the knowledge base for documents matching a query.

    Returns documents with titles and long content bodies,
    ideal for card-based rendering.
    """
    docs = [
        {
            "title": "Getting Started with MCP",
            "author": "Alice Chen",
            "updated": "2025-03-15",
            "content": "The Model Context Protocol (MCP) is an open standard that enables seamless integration between AI applications and external data sources and tools. It provides a unified way for AI models to access contextual information, execute tools, and interact with various services. MCP follows a client-server architecture where host applications connect to MCP servers that expose specific capabilities. This guide walks through setting up your first MCP server and connecting it to a compatible client."
        },
        {
            "title": "Authentication in MCP",
            "author": "Bob Smith",
            "updated": "2025-06-01",
            "content": "MCP supports OAuth 2.1 with PKCE for secure authentication. When a client connects to a protected MCP server, the server responds with a 401 status and a WWW-Authenticate header containing the resource metadata URL. The client then performs OAuth discovery, registers dynamically if supported, and initiates the authorization code flow with PKCE. This ensures that tokens are obtained securely even in public client scenarios. The protocol also supports token refresh and revocation for complete lifecycle management."
        },
        {
            "title": "Building Custom MCP Tools",
            "author": "Carol Davis",
            "updated": "2025-05-20",
            "content": "Custom tools in MCP are defined with JSON Schema input specifications and can return various content types including text, images, and structured data. When building tools, consider providing detailed descriptions that help AI models understand when and how to use them. Tools should handle errors gracefully and return meaningful error messages. The FastMCP framework simplifies tool creation with Python decorators that automatically generate the required schemas from type annotations and docstrings."
        },
        {
            "title": "MCP Resources and Prompts",
            "author": "Eva Martinez",
            "updated": "2025-04-10",
            "content": "Beyond tools, MCP servers can expose resources (static or dynamic data) and prompts (reusable message templates). Resources provide contextual information like files, database records, or live system status. Prompts offer pre-built interaction patterns that users can invoke with arguments. Together, these three primitives — tools, resources, and prompts — form the complete MCP capability surface that enables rich AI-powered workflows."
        },
    ]
    filtered = [d for d in docs if query.lower() in d["title"].lower() or query.lower() in d["content"].lower()]
    return filtered[:max_results] if filtered else docs[:max_results]


# ── Tools returning markdown ──

@mcp.tool()
def generate_report(topic: str) -> str:
    """Generate a formatted markdown report on a topic.

    Returns rich markdown with headers, lists, code blocks, and tables.
    """
    return f"""# Report: {topic}

## Summary

This report provides an overview of **{topic}** with key findings and recommendations.

## Key Findings

1. **Performance**: Overall system performance has improved by 23% since last quarter
2. **Reliability**: Uptime has been maintained at 99.97% across all regions
3. **Cost**: Infrastructure costs reduced by 15% through optimization

## Detailed Metrics

| Metric | Q1 | Q2 | Change |
|--------|-----|-----|--------|
| Latency (p95) | 245ms | 189ms | -23% |
| Error Rate | 0.05% | 0.03% | -40% |
| Throughput | 12k rps | 15k rps | +25% |

## Recommendations

- Scale out the API tier to handle projected growth
- Implement caching at the edge for static resources
- Consider migrating to newer runtime version

## Code Example

```python
from mcp import Client

async with Client("https://api.example.com/mcp") as client:
    tools = await client.list_tools()
    for tool in tools:
        print(f"{{tool.name}}: {{tool.description}}")
```

> **Note**: All metrics are based on production data from the last 90 days.
"""


# ── Tools with complex input schemas ──

@mcp.tool()
def create_ticket(
    title: str,
    description: str,
    priority: str = "medium",
    assignee: str = "",
    labels: list[str] = [],
    estimated_hours: float = 0.0,
    is_blocking: bool = False,
) -> dict:
    """Create a new issue ticket in the project tracker.

    Has many parameters to test form-based input.

    Args:
        title: Short title for the ticket
        description: Detailed description of the issue
        priority: Priority level (low, medium, high, critical)
        assignee: Username to assign the ticket to
        labels: List of labels/tags for categorization
        estimated_hours: Estimated hours to complete
        is_blocking: Whether this blocks other work
    """
    return {
        "ticket_id": f"PROJ-{random.randint(1000, 9999)}",
        "title": title,
        "description": description,
        "priority": priority,
        "assignee": assignee or "unassigned",
        "labels": labels,
        "estimated_hours": estimated_hours,
        "is_blocking": is_blocking,
        "status": "open",
        "created_at": datetime.datetime.now().isoformat(),
    }


# ── Tools that return errors ──

@mcp.tool()
def divide(a: float, b: float) -> float:
    """Divide a by b. Will error if b is zero."""
    if b == 0:
        raise ValueError("Division by zero is not allowed")
    return a / b


@mcp.tool()
def validate_email(email: str) -> dict:
    """Validate an email address format and return details."""
    if "@" not in email:
        raise ValueError(f"Invalid email format: '{email}' is missing @ symbol")
    local, domain = email.rsplit("@", 1)
    if "." not in domain:
        raise ValueError(f"Invalid domain: '{domain}' has no TLD")
    return {
        "email": email,
        "local_part": local,
        "domain": domain,
        "is_valid": True,
    }


# ── Tools returning empty/minimal results ──

@mcp.tool()
def ping() -> str:
    """Simple health check that returns pong."""
    return "pong"


@mcp.tool()
def get_timestamp() -> dict:
    """Get the current server timestamp in multiple formats."""
    now = datetime.datetime.now(datetime.timezone.utc)
    return {
        "iso": now.isoformat(),
        "unix": int(now.timestamp()),
        "human": now.strftime("%A, %B %d, %Y at %H:%M:%S UTC"),
    }


# ── Namespaced tools (for testing group prefixes) ──

@mcp.tool()
def db_query(sql: str, database: str = "main") -> list[dict]:
    """Execute a read-only SQL query against the database.

    Returns mock result rows.
    """
    return [
        {"id": 1, "value": f"result_1 from {database}"},
        {"id": 2, "value": f"result_2 from {database}"},
        {"id": 3, "value": f"result_3 from {database}"},
    ]


@mcp.tool()
def db_tables(database: str = "main") -> list[str]:
    """List all tables in the specified database."""
    return ["users", "orders", "products", "sessions", "audit_log"]


@mcp.tool()
def db_schema(table: str, database: str = "main") -> dict:
    """Get the schema definition for a database table."""
    schemas = {
        "users": {
            "table": "users",
            "columns": [
                {"name": "id", "type": "INTEGER", "primary_key": True},
                {"name": "email", "type": "VARCHAR(255)", "nullable": False},
                {"name": "name", "type": "VARCHAR(100)", "nullable": False},
                {"name": "created_at", "type": "TIMESTAMP", "nullable": False},
            ]
        }
    }
    return schemas.get(table, {"table": table, "columns": [], "error": "Table not found"})


# ── Resources ──

@mcp.resource("config://app")
def get_app_config() -> str:
    """Application configuration."""
    return json.dumps({
        "app_name": "Inspector Test App",
        "version": "1.0.0",
        "debug": True,
        "max_connections": 100,
        "allowed_origins": ["http://localhost:6280"],
    }, indent=2)


@mcp.resource("file://readme")
def get_readme() -> str:
    """Project README file."""
    return """# Inspector Test Server

A mock MCP server for testing the MCP Dev Inspector.

## Features
- Simple tools (greet, echo, add)
- Structured data tools (employees, servers)
- Document search tools
- Markdown generation
- Complex input schemas
- Error-producing tools
- Namespaced tool groups
"""


@mcp.resource("data://metrics/current")
def get_current_metrics() -> str:
    """Current system metrics snapshot."""
    return json.dumps({
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "cpu_usage": round(random.uniform(10, 90), 1),
        "memory_usage": round(random.uniform(30, 80), 1),
        "disk_usage": round(random.uniform(40, 70), 1),
        "active_connections": random.randint(50, 500),
        "requests_per_second": random.randint(100, 2000),
    }, indent=2)


# ── Prompts ──

@mcp.prompt()
def summarize(text: str, style: str = "concise") -> str:
    """Summarize the provided text in the given style.

    Args:
        text: The text to summarize
        style: Summary style - concise, detailed, or bullet-points
    """
    return f"Please summarize the following text in a {style} style:\n\n{text}"


@mcp.prompt()
def code_review(code: str, language: str = "python") -> str:
    """Review code for quality, bugs, and improvements.

    Args:
        code: The code to review
        language: The programming language
    """
    return f"Please review the following {language} code for quality, potential bugs, and improvements:\n\n```{language}\n{code}\n```"


@mcp.prompt()
def explain_error(error_message: str, context: str = "") -> str:
    """Explain an error message and suggest fixes.

    Args:
        error_message: The error message to explain
        context: Optional context about what was happening
    """
    prompt = f"Please explain this error and suggest how to fix it:\n\nError: {error_message}"
    if context:
        prompt += f"\n\nContext: {context}"
    return prompt


def main():
    mcp.run(transport="streamable-http", host="127.0.0.1", port=6277)


if __name__ == "__main__":
    main()
