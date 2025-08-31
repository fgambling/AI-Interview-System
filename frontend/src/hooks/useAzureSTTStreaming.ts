import { useEffect, useRef, useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import { API_BASE } from "../apiBase";

/**
 * Represents a final speech recognition result with timing information
 */
type FinalResult = { 
  text: string; 
  offsetMs: number; 
  durationMs: number; 
};

/**
 * Custom React hook for Azure Speech-to-Text streaming functionality
 * Provides real-time speech recognition with continuous listening capabilities
 */
export function useAzureSTTStreaming() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string>();

  // Refs for managing speech recognition state and resources
  const finalsRef = useRef<FinalResult[]>([]);
  const recognizerRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentPartialTextRef = useRef<string>("");
  const sttInit = useRef(false);

  /**
   * Starts continuous speech recognition
   * @param onSpeechEndCallback - Callback function triggered when speech ends
   */
  const start = async (onSpeechEndCallback: () => void) => {
    if (listening) return;
    
    try {
      setError(undefined);
      
      // Get Azure Speech token and region from backend
      const tokenResp = await fetch(`${API_BASE}/speech/token`);
      if (!tokenResp.ok) {
        throw new Error(`Failed to get speech token: ${tokenResp.status}`);
      }
      
      const { token, region } = await tokenResp.json();
      
      // Configure Azure Speech SDK
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-US";
      
      // Optimize recognition parameters for better responsiveness
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "1500");
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "3000");
      
      // Get microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Create audio configuration
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      
      // Create speech recognizer
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // Clear previous results
      finalsRef.current = [];
      currentPartialTextRef.current = "";

      // Set up event handlers
      recognizer.recognizing = (_s: any, e: any) => {
        if (e.result?.text) {
            currentPartialTextRef.current = e.result.text;
            console.log("Partial:", e.result.text);
        }
      };

      recognizer.recognized = (_s: any, e: any) => {
        if (e.result?.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
          const final: FinalResult = {
            text: e.result.text,
            offsetMs: e.result.offset / 10000,
            durationMs: e.result.duration / 10000
          };
          finalsRef.current.push(final);
          console.log("Final:", final.text);
          currentPartialTextRef.current = "";
        }
      };

      // Handle speech end detection
      recognizer.speechEndDetected = (_s: any, _e: any) => {
        console.log("🎤 Silence Detected (speech end). Triggering callback.");
        
        // Detach handler to prevent multiple firings
        if (recognizerRef.current) {
          recognizerRef.current.speechEndDetected = undefined;
        }

        // Trigger callback and stop recognition
        onSpeechEndCallback();
        stop();
      };

      recognizer.canceled = (_s: any, e: any) => {
        console.log("Recognition canceled:", e.reason);
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          setError(`Recognition error: ${e.errorDetails}`);
        }
        stop();
      };

      recognizer.sessionStopped = () => {
        console.log("Recognition session stopped");
        stop();
      };

      // Start continuous recognition
      await new Promise<void>((resolve, reject) => {
        recognizer.startContinuousRecognitionAsync(
          () => {
            console.log("Continuous recognition started");
            setListening(true);
            resolve();
          },
          (error: any) => {
            console.error("Failed to start recognition:", error);
            setError(`Failed to start recognition: ${error}`);
            reject(error);
          }
        );
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("STT start error:", errorMsg);
      setError(errorMsg);
      setListening(false);
    }
  };

  /**
   * Stops speech recognition and cleans up resources
   */
  const stop = async () => {
    if (!listening) return;
    
    try {
        const recognizer = recognizerRef.current;
        recognizerRef.current = null;

        // Detach handlers to prevent memory leaks
        recognizer.recognizing = undefined;
        recognizer.recognized = undefined;
        recognizer.speechEndDetected = undefined;
        recognizer.canceled = undefined;
        recognizer.sessionStopped = undefined;

        await new Promise<void>((resolve) => {
            recognizer.stopContinuousRecognitionAsync(resolve, resolve);
        });
        
        recognizer.close();
      
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      setListening(false);
    } catch (err) {
      console.error("Error during STT stop:", err);
      setListening(false);
    }
  };

  /**
   * Gets the complete transcript from all recognized speech
   */
  const getFinalTranscript = () => {
    return finalsRef.current.map(result => result.text).join(" ").trim();
  };

  /**
   * Gets words with timestamps for detailed analysis
   */
  const getTimedWords = () => {
    return finalsRef.current;
  };

  /**
   * Gets current partial recognition result for real-time display
   */
  const getCurrentPartial = () => {
    return currentPartialTextRef.current;
  };

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    if (sttInit.current === true) {
        return;
    }
    sttInit.current = true;

    return () => {
        console.log("Cleanup effect for Azure STT is running.");
        if (recognizerRef.current) {
            stop();
        }
        sttInit.current = false;
    };
  }, []);

  return {
    start,
    stop,
    listening,
    error,
    getFinalTranscript,
    getTimedWords,
    getCurrentPartial
  };
}

export default useAzureSTTStreaming;
