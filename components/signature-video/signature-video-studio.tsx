"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SignatureVideoDownloadButton from "@/components/signature-video/signature-video-download-button";
import SignatureVideoPreview from "@/components/signature-video/signature-video-preview";
import type {
  SignatureScene,
  SignatureVideoOptions,
} from "@/lib/signature-video";

export default function SignatureVideoStudio({
  initialScenes,
  voiceover = null,
  music = null,
  durationSec = 15,
  textCenterY = 0.2,
  staticCamera = false,
  fileName = "grateful-today",
  editable = true,
}: {
  initialScenes: SignatureScene[];
  voiceover?: AudioBuffer | null;
  music?: AudioBuffer | null;
  durationSec?: number;
  textCenterY?: number;
  staticCamera?: boolean;
  fileName?: string;
  editable?: boolean;
}) {
  const [scenes, setScenes] = useState(initialScenes);
  const localUrls = useRef(new Set<string>());
  const options = useMemo<SignatureVideoOptions>(
    () => ({
      scenes,
      voiceover,
      music,
      durationSec,
      textCenterY,
      staticCamera,
    }),
    [scenes, voiceover, music, durationSec, textCenterY, staticCamera],
  );

  useEffect(
    () => () => {
      localUrls.current.forEach((url) => URL.revokeObjectURL(url));
      localUrls.current.clear();
    },
    [],
  );

  const updateScene = (index: number, patch: Partial<SignatureScene>) => {
    setScenes((current) =>
      current.map((scene, sceneIndex) =>
        sceneIndex === index ? { ...scene, ...patch } : scene,
      ),
    );
  };

  const setMedia = (index: number, file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    localUrls.current.add(url);
    updateScene(index, {
      media: { kind: file.type.startsWith("video/") ? "video" : "image", url },
    });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <SignatureVideoPreview options={options} />
      <div className="space-y-5">
        {editable && (
          <div className="space-y-4">
            {scenes.map((scene, index) => (
              <div
                key={index}
                className="rounded-xl border border-primary-100 bg-white p-4"
              >
                <label className="block text-sm font-semibold text-neutral-900">
                  Scene {index + 1}
                  <input
                    value={scene.text}
                    onChange={(event) =>
                      updateScene(index, { text: event.target.value })
                    }
                    maxLength={180}
                    className="mt-2 block w-full rounded-lg border border-primary-200 px-3 py-2 text-sm font-normal text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <label className="cursor-pointer font-semibold text-primary-800 underline underline-offset-4">
                    {scene.media ? "Replace background" : "Add background"}
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(event) => {
                        setMedia(index, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {scene.media && (
                    <>
                      <span className="text-neutral-500">
                        {scene.media.kind}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateScene(index, { media: null })}
                        className="text-neutral-500 underline"
                      >
                        Use default
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <SignatureVideoDownloadButton options={options} fileName={fileName} />
      </div>
    </div>
  );
}
