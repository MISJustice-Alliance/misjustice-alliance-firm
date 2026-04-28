from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LiteLLM Proxy
    litellm_proxy_url: str = ""
    litellm_api_key: str = ""

    # MCAS (Matter Control and Administration System)
    mcas_api_url: str = ""
    mcas_api_token: str = ""

    # n8n Webhooks
    n8n_webhook_url: str = ""

    # MCP Server
    mcp_server_url: str = ""

    # Infrastructure
    redis_url: str = ""
    qdrant_url: str = ""
    searxng_url: str = ""
    paperclip_url: str = ""

    # Orchestrator defaults
    default_model: str = "openai/gpt-4o"
    log_level: str = "INFO"
    data_tier_default: str = "T2"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
