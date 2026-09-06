from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    port: int = 8787
    host: str = '0.0.0.0'
    cors_origin: str = '*'
    session_ttl_seconds: int = 1800
    deepgram_api_key: str | None = None
    hf_token: str | None = None
    hf_model: str = 'HuggingFaceH4/zephyr-7b-beta'
    rime_api_key: str | None = None
    rime_voice: str = 'mistv2'
    rime_speaker: str | None = None
    rime_http_url: str = 'https://api.rime.ai/v1/rime-tts'
    model_config = SettingsConfigDict(env_file='.env', extra='ignore', case_sensitive=False)

settings = Settings()
providers = {'deepgram': bool(settings.deepgram_api_key), 'huggingFace': bool(settings.hf_token), 'rime': bool(settings.rime_api_key)}
