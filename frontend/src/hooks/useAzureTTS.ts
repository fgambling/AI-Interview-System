import { useCallback } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export interface SpeakOptions {
  region?: string;
  voice?: string; // e.g. en-US-JennyNeural
  language?: string; // default en-US
}

export const useAzureTTS = (options?: SpeakOptions) => {
  const region = options?.region || ''; // Don't set default value, let backend decide
  const voice = options?.voice || 'en-US-JennyNeural';

  const speakTextWithViseme = useCallback(async (text: string, onViseme?: (id: number, offsetMs?: number) => void) => {
    if (!text || !text.trim()) return;

    // Get short-lived token from backend
    let token = '';
    let actualRegion = region;
    try {
      // Don't pass region parameter, let backend use value from environment variables
      const url = `http://localhost:8080/api/speech/token`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const data = await resp.json().catch(() => ({}));
      token = (data && (data.token || data)) || '';
      // Use actual region returned from backend
      actualRegion = data?.region || 'eastus'; // If backend doesn't return region, use default value
      console.log('TTS: Using region from backend:', actualRegion, 'instead of frontend:', region);
      if (!token) throw new Error('Empty token from /speech/token');
      if (!actualRegion) throw new Error('Empty region from /speech/token');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch Azure Speech token:', err);
      return;
    }

    // Build Speech SDK config using the actual region from backend
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, actualRegion);
    speechConfig.speechSynthesisVoiceName = voice;
    // Enable viseme animation events
    speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceResponse_RequestSentenceBoundary, 'true');

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    const visemeHandler = (_s: SpeechSDK.SpeechSynthesizer, e: any) => {
      try {
        if (onViseme) onViseme(e.visemeId, e.audioOffset);
      } catch (inner) {
        // eslint-disable-next-line no-console
        console.error('Error in onViseme handler', inner);
      }
    };
    synthesizer.visemeReceived = visemeHandler;

    await new Promise<void>((resolve) => {
      synthesizer.speakTextAsync(
        text,
        () => {
          synthesizer.close();
          resolve();
        },
        (error) => {
          // eslint-disable-next-line no-console
          console.error('speakTextAsync error:', error);
          synthesizer.close();
          resolve();
        }
      );
    });
  }, [region, voice]);

  return { speakTextWithViseme };
};

export default useAzureTTS;


