from typing import Any, Optional
from datetime import datetime, timezone

class ConversationTurn:
    def __init__(self, role: str, content: str, tool_calls: Optional[list[dict[str, Any]]] = None, timestamp: Optional[str] = None):
        self.role = role  # "user", "model", "tool"
        self.content = content
        self.tool_calls = tool_calls or []
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
            "tool_calls": self.tool_calls,
            "timestamp": self.timestamp
        }

class SessionMemoryStore:
    """
    In-memory session conversation store tracking multi-turn dialogue history
    and conversational context (e.g., active city, active procedure, active hospital IDs).
    """
    _sessions: dict[str, list[ConversationTurn]] = {}
    _session_context: dict[str, dict[str, Any]] = {}

    @classmethod
    def get_history(cls, session_id: str, max_turns: int = 10) -> list[ConversationTurn]:
        turns = cls._sessions.get(session_id, [])
        return turns[-max_turns:]

    @classmethod
    def get_history_as_dicts(cls, session_id: str, max_turns: int = 10) -> list[dict[str, Any]]:
        return [t.to_dict() for t in cls.get_history(session_id, max_turns)]

    @classmethod
    def add_user_message(cls, session_id: str, content: str) -> None:
        if session_id not in cls._sessions:
            cls._sessions[session_id] = []
        cls._sessions[session_id].append(ConversationTurn(role="user", content=content))

    @classmethod
    def add_model_message(cls, session_id: str, content: str, tool_calls: Optional[list[dict[str, Any]]] = None) -> None:
        if session_id not in cls._sessions:
            cls._sessions[session_id] = []
        cls._sessions[session_id].append(ConversationTurn(role="model", content=content, tool_calls=tool_calls))

    @classmethod
    def update_context(cls, session_id: str, **kwargs: Any) -> None:
        if session_id not in cls._session_context:
            cls._session_context[session_id] = {}
        for k, v in kwargs.items():
            if v is not None:
                cls._session_context[session_id][k] = v

    @classmethod
    def get_context(cls, session_id: str) -> dict[str, Any]:
        return dict(cls._session_context.get(session_id, {}))

    @classmethod
    def clear_session(cls, session_id: str) -> None:
        cls._sessions.pop(session_id, None)
        cls._session_context.pop(session_id, None)

