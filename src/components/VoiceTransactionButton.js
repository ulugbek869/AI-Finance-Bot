'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../lib/telegram';
import { getLocale, t } from '../lib/i18n';

const MAX_RECORDING_MS = 30_000;
const MIN_RECORDING_MS = 700;
const SPEECH_RMS_THRESHOLD = 5;
const REQUIRED_SPEECH_FRAMES = 3;
// This must exceed the server's two per-model time budgets.
const VOICE_REQUEST_TIMEOUT_MS = 34_000;

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function VoiceTransactionButton({ onNotify }) {
  const { addTransaction, categories, settings } = useApp();
  const language = settings.language || 'uz';
  const [state, setState] = useState('idle');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timeoutRef = useRef(null);
  const requestControllerRef = useRef(null);
  const requestTimeoutRef = useRef(null);
  const unmountedRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const speechDetectedRef = useRef(false);
  const speechFrameCountRef = useRef(0);
  const speechAnalysisAvailableRef = useRef(false);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioAnalysisFrameRef = useRef(null);

  const notify = (message, type = 'success') => onNotify(message, type);

  const stopSpeechDetection = () => {
    if (audioAnalysisFrameRef.current) {
      cancelAnimationFrame(audioAnalysisFrameRef.current);
      audioAnalysisFrameRef.current = null;
    }
    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== 'closed') void audioContext.close().catch(() => {});
  };

  const startSpeechDetection = (stream) => {
    speechDetectedRef.current = false;
    speechFrameCountRef.current = 0;
    speechAnalysisAvailableRef.current = false;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      audioSourceRef.current = source;
      speechAnalysisAvailableRef.current = true;
      void audioContext.resume().catch(() => {});

      const samples = new Uint8Array(analyser.fftSize);
      const measureVolume = () => {
        if (recorderRef.current?.state === 'inactive') return;
        analyser.getByteTimeDomainData(samples);
        const sumOfSquares = samples.reduce((sum, sample) => sum + (sample - 128) ** 2, 0);
        const rms = Math.sqrt(sumOfSquares / samples.length);
        if (rms >= SPEECH_RMS_THRESHOLD) {
          speechFrameCountRef.current += 1;
          if (speechFrameCountRef.current >= REQUIRED_SPEECH_FRAMES) speechDetectedRef.current = true;
        } else {
          speechFrameCountRef.current = 0;
        }
        audioAnalysisFrameRef.current = requestAnimationFrame(measureVolume);
      };
      measureVolume();
    } catch {
      // Older browsers can still use the server-side speech recognition.
      speechAnalysisAvailableRef.current = false;
    }
  };

  useEffect(() => {
    // React development mode can mount, clean up, then mount a component
    // again. Resetting this flag keeps the microphone usable after settings
    // changes or route transitions.
    unmountedRef.current = false;

    return () => {
      unmountedRef.current = true;
      clearTimeout(timeoutRef.current);
      clearTimeout(requestTimeoutRef.current);
      stopSpeechDetection();
      requestControllerRef.current?.abort();
      const recorder = recorderRef.current;
      if (recorder?.state !== 'inactive') recorder?.stop();
      recorder?.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const processRecording = async (audio) => {
    try {
      if (unmountedRef.current) return;
      if (!unmountedRef.current) setState('processing');
      const audioBase64 = await blobToBase64(audio);
      if (unmountedRef.current) return;

      const controller = new AbortController();
      requestControllerRef.current = controller;
      requestTimeoutRef.current = setTimeout(() => controller.abort(), VOICE_REQUEST_TIMEOUT_MS);
      const response = await fetch('/api/voice-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          audioBase64,
          mimeType: audio.type || 'audio/webm',
          categories,
          currencySymbol: settings.currencySymbol,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (unmountedRef.current) return;
      if (!response.ok) throw new Error(t(language, 'voiceFailed'));

      await addTransaction({ ...data.transaction, date: new Date().toISOString().slice(0, 10) });
      triggerHaptic('success');
      const label = data.transaction.type === 'income' ? t(language, 'income') : t(language, 'expense');
      const amount = new Intl.NumberFormat(getLocale(language)).format(data.transaction.amount);
      notify(t(language, 'voiceAdded', { type: label, amount, currency: settings.currencySymbol }));
    } catch (error) {
      if (unmountedRef.current) return;
      if (error.name === 'AbortError') {
        triggerHaptic('error');
        notify(t(language, 'voiceTimeout'), 'error');
        return;
      }
      triggerHaptic('error');
      notify(error.message || t(language, 'voiceRetry'), 'error');
    } finally {
      if (!unmountedRef.current) setState('idle');
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
      requestControllerRef.current = null;
      recorderRef.current = null;
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    clearTimeout(timeoutRef.current);
    setState('processing');
    recorder.stop();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      notify(t(language, 'voiceUnsupported'), 'error');
      return;
    }

    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (unmountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const recordingDuration = Date.now() - recordingStartedAtRef.current;
        const speechDetected = speechDetectedRef.current;
        const speechAnalysisAvailable = speechAnalysisAvailableRef.current;
        stopSpeechDetection();
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!audio.size || recordingDuration < MIN_RECORDING_MS) {
          if (!unmountedRef.current) setState('idle');
          notify(t(language, 'voiceNotRecorded'), 'error');
          return;
        }
        if (speechAnalysisAvailable && !speechDetected) {
          if (!unmountedRef.current) setState('idle');
          notify(t(language, 'voiceNotHeard'), 'error');
          return;
        }
        processRecording(audio);
      };

      recorderRef.current = recorder;
      recorder.start();
      recordingStartedAtRef.current = Date.now();
      startSpeechDetection(stream);
      setState('recording');
      triggerHaptic('medium');
      timeoutRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch {
      if (!unmountedRef.current) setState('idle');
      notify(t(language, 'microphonePermission'), 'error');
    }
  };

  const handleClick = () => {
    if (state === 'recording') stopRecording();
    else if (state === 'idle') startRecording();
  };

  const recording = state === 'recording';
  const processing = state === 'processing' || state === 'requesting';
  const title = recording ? t(language, 'voiceStop') : processing ? t(language, 'voiceProcessing') : t(language, 'voiceAdd');

  return (
    <button
      onClick={handleClick}
      className={`fab ${recording ? 'recording' : ''}`}
      title={title}
      aria-label={title}
      disabled={processing}
    >
      {recording ? <Square size={22} fill="currentColor" /> : <Mic size={25} />}
    </button>
  );
}
