from dotenv import load_dotenv
import asyncio

load_dotenv()

from livekit.agents import inference
from livekit.agents.llm import ChatContext


async def main():
    llm = inference.LLM(model="google/gemma-4-31b-it")

    print("LLM:", llm.model)
    print("Testing actual chat request...")

    ctx = ChatContext()
    ctx.add_message(
        role="user",
        content="Reply with exactly: TEST_OK",
    )

    stream = llm.chat(chat_ctx=ctx)

    async for chunk in stream:
        if chunk.delta:
            print("MODEL:", chunk.delta)

    print("CHAT TEST: SUCCESS")


asyncio.run(main())