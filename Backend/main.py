import uvicorn
from app.config.settings import settings
from app.server.app import app

if __name__ == '__main__':
    uvicorn.run(app, host=settings.host, port=settings.port, reload=False)
