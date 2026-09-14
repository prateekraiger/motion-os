import { useEffect, useRef } from "react";
import { useStore } from "./useStore";

export function useAmbientSound() {
  const { timer, focusConfig } = useStore();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const isPlaying = timer.status === "running" && focusConfig.ambientSound !== "none";

    if (isPlaying) {
      if (!audioCtxRef.current) {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtor();
      }
      
      const ctx = audioCtxRef.current;
      
      // Resume context if suspended (common in browsers)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // If already playing something, stop it first unless it's the exact same sound
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }

      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }

      // Create a buffer for noise
      const bufferSize = ctx.sampleRate * 2; // 2 seconds of audio to loop
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      // Generate noise
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        
        if (focusConfig.ambientSound === "white") {
          output[i] = white;
        } else if (focusConfig.ambientSound === "pink") {
          // Approximation of pink noise
          const b0 = 0.99886 * (output[i - 1] || 0) + white * 0.0555179;
          const b1 = 0.99332 * (output[i - 2] || 0) + white * 0.0750759;
          const b2 = 0.96900 * (output[i - 3] || 0) + white * 0.1538520;
          const b3 = 0.86650 * (output[i - 4] || 0) + white * 0.3104856;
          const b4 = 0.55000 * (output[i - 5] || 0) + white * 0.5329522;
          const pink = b0 + b1 + b2 + b3 + b4 + white * -0.5362;
          output[i] = pink * 0.11; // scale down
          
          // store state for next iter
          output[i-1] = b0;
          output[i-2] = b1;
          output[i-3] = b2;
          output[i-4] = b3;
          output[i-5] = b4;
        } else if (focusConfig.ambientSound === "brown") {
          // Brown noise
          const brown = (lastOut + (0.02 * white)) / 1.02;
          lastOut = brown;
          output[i] = brown * 3.5; // scale up
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = focusConfig.ambientVolume;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start();
      
      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;

    } else {
      // Pause / Stop
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    }

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
    };
  }, [timer.status, focusConfig.ambientSound]); // Only restart source if sound type changes or play/pause toggles

  // Update volume smoothly when volume changes
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(
        focusConfig.ambientVolume,
        audioCtxRef.current.currentTime,
        0.1
      );
    }
  }, [focusConfig.ambientVolume]);

}
