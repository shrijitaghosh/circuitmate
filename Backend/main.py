import uvicorn
from dotenv import load_dotenv
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv()
from app.config.settings import settings
from app.server.app import app
# from ......routes.troubleshooting_routes import router as troubleshooting_router
if __name__ == "__main__":
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=False,
    )