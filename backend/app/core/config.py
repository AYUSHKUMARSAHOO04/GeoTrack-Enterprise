from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "GeoTrack Enterprise"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development")

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://geotrack:geotrack@localhost:5432/geotrack"
    )
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    CORS_ORIGINS: str = Field(default="http://localhost:3000,http://localhost:3001")

    SUPABASE_URL: str = Field(default="http://localhost:54321")
    SUPABASE_ANON_KEY: str = Field(default="")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")
    SUPABASE_JWT_SECRET: str = Field(default="")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
