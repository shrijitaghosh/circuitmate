const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8787";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  API_URL.replace(/^http/, "ws" );

export async function createSession() {
  const response = await fetch(`${API_URL}/v1/sessions`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Session creation failed (${response.status})`);
  }

  return response.json();
}

export async function getHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error(`Backend health check failed (${response.status})`);
  }

  return response.json();
}

export function sessionWebSocketPath(session) {
  return `${WS_URL}${session.websocketUrl}`;
}

export async function sendTextTurn(sessionId, text) {
  const response = await fetch(
    `${API_URL}/v1/sessions/${sessionId}/turns/text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!response.ok) {
    throw new Error(`Text turn failed (${response.status})`);
  }

  return response.json();
}

export async function createPcmMicrophone(onChunk) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  const sampleRateRatio = audioContext.sampleRate / 16000;

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const outputLength = Math.floor(input.length / sampleRateRatio);
    const pcm = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i += 1) {
      const sourceIndex = Math.floor(i * sampleRateRatio);
      const sample = Math.max(
        -1,
        Math.min(1, input[sourceIndex])
      );

      pcm[i] =
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff;
    }

    onChunk(pcm.buffer);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: async () => {
      processor.disconnect();
      source.disconnect();

      stream.getTracks().forEach((track) => {
        track.stop();
      });

      await audioContext.close();
    },
  };
}

export function playBase64Audio(
  base64,
  contentType = "audio/mpeg"
) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const audioBlob = new Blob([bytes], {
    type: contentType,
  });

  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  audio.onended = () => {
    URL.revokeObjectURL(audioUrl);
  };

  void audio.play();

  return audio;
}

export { API_URL };
