import asyncio
import os

from dotenv import load_dotenv
from livekit import api

load_dotenv()


async def main():
    client = api.LiveKitAPI(
        os.getenv("LIVEKIT_URL"),
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET"),
    )

    print("LiveKit client created successfully")

    await client.aclose()


asyncio.run(main())