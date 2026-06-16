# Mediasoup SFU Live Streaming Architecture Report

This report outlines the architecture and integration of the Mediasoup Selective Forwarding Unit (SFU) in Altiora's live streaming feature.

---

## 1. SFU vs Mesh WebRTC Architecture

In the previous version, Altiora used a Peer-to-Peer (P2P) Mesh architecture where the teacher uploaded a video stream to every individual student. As the number of student viewers grew, the teacher's upload bandwidth requirements scaled linearly ($O(N)$), causing severe lag and quality drop.

With the new **Mediasoup SFU Backend**:
*   **Single Upload stream**: The teacher publishes one audio and one video stream to the Mediasoup SFU ($O(1)$ upload).
*   **Forwarding Layer**: Mediasoup forwards these media packets to each student subscriber on request.
*   **Bandwidth Efficiency**: Drastically minimizes the teacher's bandwidth usage, enabling hundreds of students to view the stream simultaneously with high quality.

---

## 2. Worker Pool & Router Management

*   **Multi-core Scaling**: Mediasoup runs as a C++ subprocess. We spawn a worker pool containing one worker per CPU core to maximize multi-threading performance.
*   **Routing Instance**: For each active live lesson session, a dedicated Mediasoup `Router` is created to isolate media tracks and routing logic.
*   **Codec Negotiations**: The router configures standard high-definition codecs:
    *   **Audio**: Opus (48kHz, stereo) for crystal-clear sound.
    *   **Video**: VP8 and H264 codecs with hardware acceleration flags for low-latency adaptive streaming.

---

## 3. WebRTC Signaling Flow

WebRTC signaling is handled through authenticated Socket.IO connections via the following sequence:

1.  **getRouterRtpCapabilities**: Client checks codecs supported by the room's Mediasoup router.
2.  **createWebRtcTransport**: Client requests a transport for sending (producer) or receiving (consumer) media.
3.  **connectWebRtcTransport**: DTLS parameters are exchanged to complete the secure WebRTC connection handshake.
4.  **produce**: The teacher publishes a local track (camera/mic/screen share) to the server-side transport.
5.  **consume**: The student subscribes to the teacher's published tracks.

```
[ Teacher ] --(Produce)--> [ Send Transport ]
                                   |
                             [ SFU Router ]
                                   |
[ Student ] <--(Consume)--( Recv Transport ]
```

---

## 4. Recording Support & Persistence

*   **Real-time Chunks**: During broadcasting, the teacher's UI records the stream in chunks using browser `MediaRecorder` and pipes base64 data to the server via `"record-chunk"`.
*   **Ffmpeg Transcoding**: Upon stream completion, the server compiles the chunks into an optimized `.mp4` file (`libx264` codec, `aac` audio) via FFmpeg.
*   **Bunny Stream Storage**: The final video is automatically uploaded to Bunny Stream, and a new course lesson with HLS adaptive playback is generated in the database.
