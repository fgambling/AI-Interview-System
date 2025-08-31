import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../apiBase";

// Fixed presenter ID for consistent avatar appearance
const DEFAULT_PRESENTER_ID = "v2_public_Lily_NoHands_RedShirt_Office@JDOtgQlb_L";

// Helper function for delays, used in retry logic
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A robust React hook for managing D-ID Clips streaming
 * This version uses Clips Streams API with presenter_id and driver_id for premium avatars
 * Designed to be resilient to React's Strict Mode and lifecycle complexities
 */
export function useDidStreamOptimized(imageUrl?: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to hold persistent connection objects and state without causing re-renders
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const streamId = useRef<string | null>(null);
  const sessionId = useRef<string | null>(null);

  // Ref to prevent the hook from running twice in React's Strict Mode (development only)
  const didInit = useRef(false);

  // Cache ICE candidates until SDP exchange is complete
  const pendingIce = useRef<Array<{
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  }>>([]);

  useEffect(() => {
    // In React's Strict Mode, useEffect runs twice on mount in development
    // This guard prevents creating two simultaneous connections
    if (didInit.current) {
      return;
    }
    didInit.current = true;

    const start = async () => {
      try {
        // Create a new stream with D-ID (Clips Streams)
        const createStreamResponse = await fetch(`${API_BASE}/stream/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presenter_id: DEFAULT_PRESENTER_ID,
            driver_id: "XuasfjTBLY", // Fixed driver
          }),
        });

        if (!createStreamResponse.ok) {
          throw new Error(`Failed to create stream: ${createStreamResponse.status}`);
        }

        const { id: newStreamId, session_id: newSessionId, offer, ice_servers: iceServers } = await createStreamResponse.json();
        streamId.current = newStreamId;
        sessionId.current = newSessionId;

        // Create a new RTCPeerConnection
        const pc = new RTCPeerConnection({ iceServers });
        peerConnection.current = pc;

        // Set up event listeners for the connection
        pc.ontrack = (event) => {
          if (videoRef.current && event.streams && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = async (event) => {
          if (!event.candidate || !streamId.current) return;

          // Cache ICE candidates until SDP exchange is complete
          pendingIce.current.push({
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          });
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setReady(true);
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            setReady(false);
            setError(`WebRTC connection state: ${pc.connectionState}`);
          }
        };

        // Perform the SDP exchange
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const sdpResp = await fetch(`${API_BASE}/stream/${streamId.current}/sdp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId.current || "",
            answer: answer
          }),
        });
        if (!sdpResp.ok) {
          const t = await sdpResp.text();
          throw new Error(`SDP exchange failed: ${sdpResp.status} ${t}`);
        }

        // SDP exchange successful, now send cached ICE candidates
        for (const ice of pendingIce.current) {
          try {
            await fetch(`${API_BASE}/stream/${streamId.current}/ice`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                ...ice,
                session_id: sessionId.current || ""
              }),
            });
          } catch (err) {
            console.warn("Failed to send cached ICE candidate:", err);
          }
        }
        pendingIce.current = []; // Clear cache after sending

      } catch (e: any) {
        console.error("D-ID setup error:", e);
        setError(e.message || String(e));
      }
    };

    start();

    // Cleanup function to be called on component unmount
    return () => {
      console.log("Cleaning up D-ID connection...");
      if (streamId.current) {
        fetch(`${API_BASE}/stream/${streamId.current}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId.current || ""
          }),
        }).catch(err => console.warn("Failed to close D-ID stream:", err));
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      streamId.current = null;
      sessionId.current = null;
      pendingIce.current = []; // Clear ICE cache
      didInit.current = false; // Reset the lock for potential re-mounts
    };
  }, [imageUrl]);

  /**
   * Sends text to be spoken by the virtual avatar
   * @param text - The text to be spoken
   */
  const say = async (text: string) => {
    if (!streamId.current || !sessionId.current) {
      throw new Error("Stream not initialized. Cannot send text.");
    }

    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${API_BASE}/stream/${streamId.current}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId.current || "",
            script: {
              type: "text",
              provider: {
                type: "microsoft",
                "voice_id": "en-US-JennyNeural"
              },
              input: text,
            },
            "config": {
              stitch: true,
              quality: "medium", // Use medium quality for better performance
              fps: 24, // Lower frame rate for smoother streaming
              resolution: "720p" // Use 720p resolution for balance
            },
          }),
        });

        if (response.ok) {
          console.log(`[Clips] Speech request successful for: "${text}"`);
          return; // Success
        }

        if (response.status === 500 && i < maxRetries - 1) {
          console.warn(`[Clips] Speech request failed with 500. Retrying... (${i + 1}/${maxRetries})`);
          await sleep(1000);
          continue;
        }

        const errorBody = await response.text();
        throw new Error(`Speech request failed: ${response.status}. Response: ${errorBody}`);
      } catch (error) {
        if (i < maxRetries - 1) {
          console.warn(`[Clips] Speech request failed with a network error. Retrying... (${i + 1}/${maxRetries})`, error);
          await sleep(1000);
          continue;
        }
        throw error;
      }
    }
  };

  /**
   * Stops the D-ID stream and cleans up resources
   */
  const stop = async () => {
    console.log("Manually stopping D-ID stream...");
    try {
      // Stop the stream via API
      if (streamId.current) {
        await fetch(`${API_BASE}/stream/${streamId.current}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId.current || ""
          }),
        });
        console.log("D-ID stream deleted successfully");
      }

      // Close WebRTC connection
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      // Reset state
      streamId.current = null;
      sessionId.current = null;
      pendingIce.current = [];
      setReady(false);
      setError(null);

      // Clear video
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

    } catch (err) {
      console.error("Failed to stop D-ID stream:", err);
      setError("Failed to stop stream");
    }
  };

  return { videoRef, say, ready, error, stop };
}