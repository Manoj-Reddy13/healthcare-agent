def get_orchestrator():
    from app.agent.orchestrator import AgentOrchestrator
    return AgentOrchestrator

def __getattr__(name):
    if name == "AgentOrchestrator":
        from app.agent.orchestrator import AgentOrchestrator
        return AgentOrchestrator
    elif name == "TOOL_DISPATCHER":
        from app.agent.tools import TOOL_DISPATCHER
        return TOOL_DISPATCHER
    elif name == "AVAILABLE_TOOLS_SCHEMA":
        from app.agent.tools import AVAILABLE_TOOLS_SCHEMA
        return AVAILABLE_TOOLS_SCHEMA
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
