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
    throw new Error(`Session creation failed: ${response.status}`);
  }

  return response.json();
}

export async function getHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status}`);
  }

  return response.json();
}

export async function createDebugSession() {
  const response = await fetch(`${API_URL}/api/debug/sessions`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Unable to create a troubleshooting session");
  return response.json();
}

export async function completeDebugSession(sessionId) {
  const response = await fetch(`${API_URL}/api/debug/sessions/${sessionId}/close`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Unable to complete the troubleshooting session");
  return response.json();
}

export async function getDebugResults(sessionId) {
  const response = await fetch(`${API_URL}/api/debug/sessions/${sessionId}/results`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Unable to load troubleshooting results");
  return response.json();
}

function authHeaders() {
  const token = localStorage.getItem("circuitmate_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function sessionWebSocketPath(session) {
  return `${WS_URL}${session.websocketUrl}`;
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
  const ratio = audioContext.sampleRate / 16000;

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const outputLength = Math.floor(input.length / ratio);
    const pcm = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i += 1) {
      const sample = Math.max(
        -1,
        Math.min(1, input[Math.floor(i * ratio)])
      );

      pcm[i] = sample < 0
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
      stream.getTracks().forEach((track) => track.stop());
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

  const blob = new Blob([bytes], {
    type: contentType,
  });

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  audio.onended = () => {
    URL.revokeObjectURL(url);
  };

  void audio.play();

  return audio;
}
