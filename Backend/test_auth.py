import asyncio
import os

from dotenv import load_dotenv
from livekit import api

load_dotenv()


async def main():
    url = os.getenv("LIVEKIT_URL")
    key = os.getenv("LIVEKIT_API_KEY")
    secret = os.getenv("LIVEKIT_API_SECRET")

    print("URL:", url)
    print("KEY:", key)
    print("SECRET EXISTS:", bool(secret))

    if not url or not key or not secret:
        print("ERROR: LiveKit credentials are missing.")
        return

    client = api.LiveKitAPI(
        url=url,
        api_key=key,
        api_secret=secret,
    )

    try:
        rooms = await client.room.list_rooms(
            api.ListRoomsRequest()
        )

        print("AUTHENTICATION SUCCESS")
        print("Rooms:", len(rooms.rooms))

    except Exception as e:
        print("AUTHENTICATION FAILED")
        print(type(e).__name__, str(e))

    finally:
        await client.aclose()


if __name__ == "__main__":
    asyncio.run(main())