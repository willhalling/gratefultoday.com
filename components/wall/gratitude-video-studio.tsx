"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Video } from "lucide-react";
import SignatureVideoDownloadButton from "@/components/signature-video/signature-video-download-button";
import SignatureVideoPreview from "@/components/signature-video/signature-video-preview";
import type { SignatureVideoOptions } from "@/lib/signature-video";

const RECORDING_SECONDS = 15;

function recorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return (
    [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
  );
}

function fitAudioBuffer(buffer: AudioBuffer): AudioBuffer {
  const length = Math.round(RECORDING_SECONDS * buffer.sampleRate);
  const fitted = new AudioBuffer({
    length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    fitted.copyToChannel(
      buffer
        .getChannelData(channel)
        .subarray(0, Math.min(buffer.length, length)),
      channel,
    );
  }
  return fitted;
}

export default function GratitudeVideoStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const loadIdRef = useRef(0);
  const [text, setText] = useState("");
  const [clip, setClip] = useState<{ url: string; name: string } | null>(null);
  const [voiceover, setVoiceover] = useState<AudioBuffer | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [audioWarning, setAudioWarning] = useState("");

  const options = useMemo<SignatureVideoOptions>(
    () => ({
      scenes: [
        {
          text: text.trim() || "One thing I am grateful for today.",
          media: clip ? { kind: "video", url: clip.url } : null,
        },
        { text: "One day. One thing." },
      ],
      voiceover,
      durationSec: RECORDING_SECONDS,
    }),
    [text, clip, voiceover],
  );

  const clearClip = useCallback(() => {
    loadIdRef.current += 1;
    setClip(null);
    setVoiceover(null);
    setPreparing(false);
    setAudioWarning("");
  }, []);

  useEffect(
    () => () => {
      if (clip) URL.revokeObjectURL(clip.url);
    },
    [clip],
  );

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording")
        recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const prepareClip = useCallback(async (file: File) => {
    const loadId = ++loadIdRef.current;
    setPreparing(true);
    setError("");
    setAudioWarning("");
    setClip({ url: URL.createObjectURL(file), name: file.name });
    setVoiceover(null);
    try {
      const { decodeAudioFile } =
        await import("@/lib/tiktok-maker/tiktok-video");
      const buffer = await decodeAudioFile(file);
      if (loadId !== loadIdRef.current) return;
      setVoiceover(fitAudioBuffer(buffer));
    } catch {
      if (loadId === loadIdRef.current) {
        setAudioWarning(
          "The clip audio could not be decoded in this browser. You can still export a silent video or try an MP4/WebM clip.",
        );
      }
    } finally {
      if (loadId === loadIdRef.current) setPreparing(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    if (text.trim().length < 3) {
      setError("Write one thing you are grateful for before recording.");
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "This browser cannot record directly. Use the upload option below with the same opening hook.",
      );
      return;
    }

    setError("");
    clearClip();
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const mimeType = recorderMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const extension = type.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        void prepareClip(
          new File([blob], `gratitude-${Date.now()}.${extension}`, { type }),
        );
      };
      recorder.start(250);
      setIsRecording(true);
      const startedAt = performance.now();
      timerRef.current = window.setInterval(() => {
        const seconds = Math.min(
          RECORDING_SECONDS,
          (performance.now() - startedAt) / 1000,
        );
        setElapsed(seconds);
        if (seconds >= RECORDING_SECONDS) stopRecording();
      }, 100);
    } catch (recordingError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(
        recordingError instanceof DOMException &&
          recordingError.name === "NotAllowedError"
          ? "Camera or microphone permission was denied. You can allow access in browser settings or upload a clip instead."
          : "The camera could not start. Try the upload option below.",
      );
      setIsRecording(false);
    }
  };

  const handleUpload = (file: File | undefined) => {
    if (!file) return;
    if (text.trim().length < 3) {
      setError("Write one thing you are grateful for before adding your clip.");
      return;
    }
    void prepareClip(file);
  };

  return (
    <div className="rounded-2xl border border-primary-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="max-w-2xl">
        <label
          htmlFor="gratitude-video-text"
          className="text-sm font-semibold text-neutral-900"
        >
          What are you grateful for?
        </label>
        <textarea
          id="gratitude-video-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          maxLength={180}
          placeholder="One honest thing is enough…"
          className="mt-2 w-full resize-none rounded-xl border border-primary-200 px-4 py-3 text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
      </div>

      <div className="mt-5 rounded-xl bg-primary-50 p-4 text-sm leading-relaxed text-neutral-700">
        <p className="font-semibold text-primary-900">The opening hook</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            At <strong>0:00</strong>, stay completely out of the frame so the
            opening shot is empty.
          </li>
          <li>
            When the cue appears at <strong>0:01</strong>, step into the frame.{" "}
            <strong>Your entrance is the hook.</strong>
          </li>
          <li>
            Speak your gratitude naturally, then hold the final frame briefly.
          </li>
        </ol>
      </div>

      <div className="mt-5 grid items-start gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
        <div>
          {clip && !isRecording ? (
            <SignatureVideoPreview
              options={options}
              widthClass="max-w-[280px]"
            />
          ) : (
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-neutral-950">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`h-full w-full object-cover ${isRecording ? "block" : "hidden"}`}
              />
              {!isRecording && !clip && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-400">
                  Your 15-second portrait recording starts here
                </div>
              )}
              {isRecording && (
                <>
                  <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">
                    0:{String(Math.floor(elapsed)).padStart(2, "0")} / 0:15
                  </div>
                  <div className="absolute inset-x-3 bottom-5 rounded-xl bg-black/70 p-4 text-center text-sm font-semibold text-white">
                    {elapsed < 1
                      ? "Stay out of frame"
                      : elapsed < 3
                        ? "Step in now — this is the hook"
                        : text.trim()}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-50 hover:bg-primary-500"
            >
              <Video className="h-4 w-4" />{" "}
              {clip ? "Record again" : "Record 15-second video"}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white"
            >
              Stop recording
            </button>
          )}
          <label className="cursor-pointer rounded-full border border-primary-300 px-5 py-3 text-center text-sm font-semibold text-primary-800 hover:bg-primary-50">
            Upload a recorded clip
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(event) => {
                handleUpload(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {clip && (
            <button
              type="button"
              onClick={clearClip}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              <RotateCcw className="h-4 w-4" /> Retake or start over
            </button>
          )}
          {preparing && (
            <p className="text-sm text-neutral-600">Preparing your clip…</p>
          )}
          {clip && !preparing && (
            <SignatureVideoDownloadButton options={options} />
          )}
          <p className="text-xs leading-relaxed text-neutral-500">
            Recording and rendering stay on your device. Nothing is uploaded to
            the Wall or Grateful Today.
          </p>
        </div>
      </div>

      {audioWarning && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {audioWarning}
        </p>
      )}
      {error && (
        <p
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
