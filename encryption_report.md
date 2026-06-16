# Encrypted HLS Video Streaming Report
**Components**: `src/routes/api.player.get-video-url.ts`, `src/lib/bunny.ts`

## Stream Protection Architecture
To prevent direct link copying, the video streams are delivered via secure HTTP Live Streaming (HLS) protected by time-bound URL signatures.

1. **Bunny Stream Token Authentication**:
   - Instead of publicly exposing the raw video path, the platform generates a signed token.
   - The signature is calculated on the server using the Bunny Stream private `TokenKey`, request path, and expiration timestamp:
     `SHA-256(TokenKey + "/{videoId}/playlist.m3u8" + expiration)`
2. **Short-lived Expiry**:
   - The generated URL expires in **5 minutes** (300 seconds), making intercepted links useless to bad actors.
3. **Decoupled Key Exchange**:
   - The playlist `.m3u8` refers to video segments (`.ts` chunks). Chunk requests from the player contain the Authorization header containing the user's JWT session, validated before serving each block.
