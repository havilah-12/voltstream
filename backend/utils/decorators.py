from typing import Dict, Any

def tool_annotation(
    *,
    name: str,
    agent: str,
    purpose: str,
    when_to_use: str,
    parameters: Dict[str, str],
    returns: str,
) -> Any:
    """Attach passive tool metadata without changing agent behavior."""
    def decorate(func: Any) -> Any:
        func.tool_annotation = {
            "name": name,
            "agent": agent,
            "purpose": purpose,
            "when_to_use": when_to_use,
            "parameters": parameters,
            "returns": returns,
        }
        return func

    return decorate
