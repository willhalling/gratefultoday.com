import type {
  SignatureScene,
  SignatureVideoOptions,
} from "@/lib/signature-video";
import {
  getChipSignatureContent,
  type SobrietyChipVideoData,
} from "@/lib/chip-signature-content";
import { getSobrietyChipBackground } from "@/lib/sobriety-chip-backgrounds";
import { getChipBackgroundOption } from "@/lib/sobriety-chip-colour-backgrounds";
import { getSobrietyChipStory } from "@/lib/sobriety-chip-story";
import { loadStoryAmbientAudio } from "@/lib/sobriety-chip-story-audio";

export type { SobrietyChipVideoData } from "@/lib/chip-signature-content";

async function createChipSlotUrl(chipSvg: SVGSVGElement): Promise<string> {
  const clone = chipSvg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", "1024");
  clone.setAttribute("height", "1024");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.querySelectorAll("[fill]").forEach((element) => {
    const fill = element.getAttribute("fill");
    if (fill?.includes("var(--chip-color"))
      element.setAttribute("fill", "#FFFFFF");
  });
  const source = new XMLSerializer().serializeToString(clone);
  const objectUrl = URL.createObjectURL(
    new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Could not prepare the chip slot artwork."));
      image.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the chip slot canvas.");
    context.fillStyle = "#222C2A";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 340, 1000, 400, 400);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Could not encode the chip slot.")),
        "image/png",
      );
    });
    return URL.createObjectURL(blob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createChipVideoOptions({
  chipData,
  chipSvg,
  personalMessage = "",
  storyText,
  backgroundId,
}: {
  chipData: SobrietyChipVideoData;
  chipSvg: SVGSVGElement;
  personalMessage?: string;
  storyText?: string;
  backgroundId?: string;
}): Promise<SignatureVideoOptions> {
  const story = getSobrietyChipStory(chipData);
  const backgroundUrl =
    getChipBackgroundOption(backgroundId)?.url ??
    getSobrietyChipBackground(story.id).url;
  const content = getChipSignatureContent(chipData, {
    personalMessage: personalMessage || storyText || "",
  });
  const scenes: SignatureScene[] = content.lines.map((text) => ({
    text,
    media: { kind: "image", url: backgroundUrl },
  }));
  scenes.push({
    text: "one day. one thing.",
    media: { kind: "image", url: await createChipSlotUrl(chipSvg) },
    slot: "chip",
  });
  return {
    scenes,
    voiceover: null,
    music: await loadStoryAmbientAudio(story),
    durationSec: 20,
    textCenterY: 0.2,
    staticCamera: true,
  };
}
