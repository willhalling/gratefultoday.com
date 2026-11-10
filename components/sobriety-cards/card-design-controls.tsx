"use client";

import { Input, Textarea } from "@heroui/react";
import { Shuffle } from "lucide-react";
import { useMemo } from "react";
import type {
  CardDesign,
  PhotoDesign,
  StripesDesign,
} from "@/lib/sobriety-card-design";
import { photoCardFonts } from "@/lib/sobriety-card-font";
import { CARD_ARTWORKS, CARD_PALETTES } from "@/lib/sobriety-card-palettes";
import {
  ACTIVE_CARD_PHOTOS,
  cardPhotoCredit,
  cardPhotoUrl,
  getCardPhoto,
  TYPE_STYLE_IDS,
  TYPE_STYLES,
} from "@/lib/sobriety-card-photo-art";

interface CardDesignControlsProps {
  design: CardDesign;
  /** The card's default photo + stripes designs, to switch between styles. */
  photoDefault: PhotoDesign;
  stripesDefault: StripesDesign;
  onChange: (design: CardDesign) => void;
}

// min-w-0: fieldsets default to min-content width, which defeats overflow scrolling.
const fieldsetClass = "min-w-0 space-y-3";
const legendClass = "text-sm font-semibold text-neutral-900 mb-2";

/** Style switch, photo + lettering pickers, and the words on the front. */
export default function CardDesignControls({
  design,
  photoDefault,
  stripesDefault,
  onChange,
}: CardDesignControlsProps) {
  const currentPhoto =
    design.style === "photo"
      ? getCardPhoto(design.photoId)
      : getCardPhoto(photoDefault.photoId);

  // Photos that suit this card first, then everything else (retired photos are never offered).
  const photos = useMemo(() => {
    const mood = getCardPhoto(photoDefault.photoId).mood;
    return [
      ...ACTIVE_CARD_PHOTOS.filter((p) => p.mood === mood),
      ...ACTIVE_CARD_PHOTOS.filter((p) => p.mood !== mood),
    ];
  }, [photoDefault.photoId]);

  const setStyle = (style: CardDesign["style"]) => {
    if (style === design.style) return;
    onChange(style === "photo" ? photoDefault : stripesDefault);
  };

  const updatePhoto = (patch: Partial<PhotoDesign>) => {
    if (design.style === "photo") onChange({ ...design, ...patch });
  };

  const updateStripes = (patch: Partial<StripesDesign>) => {
    if (design.style === "stripes") onChange({ ...design, ...patch });
  };

  const shuffleStripes = () => {
    if (design.style !== "stripes") return;
    let next = design.seed;
    while (next === design.seed) next = 1 + Math.floor(Math.random() * 99999);
    onChange({ ...design, seed: next });
  };

  const shufflePhoto = () => {
    if (design.style !== "photo") return;
    const others = photos.slice(0, 12).filter((p) => p.id !== design.photoId);
    updatePhoto({
      photoId: others[Math.floor(Math.random() * others.length)].id,
    });
  };

  return (
    <div className="space-y-6">
      <fieldset className="min-w-0">
        <legend className={legendClass}>Card style</legend>
        <div
          className="inline-flex rounded-full bg-neutral-100 p-1"
          role="radiogroup"
          aria-label="Card style"
        >
          {(["photo", "stripes"] as const).map((style) => (
            <label
              key={style}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                design.style === style
                  ? "bg-white text-neutral-900 shadow"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <input
                type="radio"
                name="card-style"
                value={style}
                checked={design.style === style}
                onChange={() => setStyle(style)}
                className="sr-only"
              />
              {style === "photo" ? "Photo" : "Colourful art"}
            </label>
          ))}
        </div>
      </fieldset>

      {design.style === "stripes" && (
        <>
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Artwork</legend>
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Artwork"
            >
              {CARD_ARTWORKS.map((artwork) => (
                <label
                  key={artwork.id}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-medium ${design.artwork === artwork.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}
                >
                  <input
                    type="radio"
                    name="card-artwork"
                    value={artwork.id}
                    checked={design.artwork === artwork.id}
                    onChange={() => updateStripes({ artwork: artwork.id })}
                    className="sr-only"
                  />
                  {artwork.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Colours</legend>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Colour palette"
            >
              {CARD_PALETTES.map((palette) => (
                <label
                  key={palette.id}
                  className={`cursor-pointer rounded-xl border p-2 ${design.palette.join(",") === palette.colors.join(",") ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"}`}
                >
                  <input
                    type="radio"
                    name="card-palette"
                    value={palette.id}
                    checked={
                      design.palette.join(",") === palette.colors.join(",")
                    }
                    onChange={() => updateStripes({ palette: palette.colors })}
                    className="sr-only"
                  />
                  <span className="flex h-6 overflow-hidden rounded-md">
                    {palette.colors.map((color) => (
                      <span
                        key={color}
                        className="flex-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  <span className="mt-1.5 block text-center text-xs font-medium text-neutral-700">
                    {palette.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Textarea
            label="Three lines on the front"
            labelPlacement="outside-top"
            value={design.headline}
            onValueChange={(headline) => updateStripes({ headline })}
            minRows={3}
            maxLength={140}
            classNames={{
              label: "pb-1.5",
              input: "text-neutral-900",
              inputWrapper: "border-neutral-300",
            }}
          />

          <button
            type="button"
            onClick={shuffleStripes}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary"
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            Shuffle the artwork
          </button>
        </>
      )}

      {design.style === "photo" && (
        <>
          <fieldset className={fieldsetClass}>
            <div className="flex items-center justify-between">
              <legend className={legendClass}>Photo</legend>
              <button
                type="button"
                onClick={shufflePhoto}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                Surprise me
              </button>
            </div>
            <div
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
              role="radiogroup"
              aria-label="Photo"
            >
              {photos.map((photo) => {
                const selected = photo.id === design.photoId;
                return (
                  <label
                    key={photo.id}
                    className={`relative block w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-offset-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                      selected
                        ? "ring-[3px] ring-neutral-900"
                        : "opacity-90 hover:opacity-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="card-photo"
                      value={photo.id}
                      checked={selected}
                      onChange={() => updatePhoto({ photoId: photo.id })}
                      className="sr-only"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cardPhotoUrl(photo, 128, 179)}
                      alt={photo.alt}
                      loading="lazy"
                      className="block aspect-[5/7] w-full object-cover"
                    />
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-neutral-500">
              <a
                href={currentPhoto.page}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-neutral-700"
              >
                {cardPhotoCredit(currentPhoto)}
              </a>
            </p>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Lettering</legend>
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              role="radiogroup"
              aria-label="Lettering"
            >
              {TYPE_STYLE_IDS.map((id) => {
                const style = TYPE_STYLES[id];
                const selected = design.typeStyle === id;
                const font = photoCardFonts[style.headline.font];
                return (
                  <label
                    key={id}
                    className={`cursor-pointer rounded-xl border px-2 py-2 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                      selected
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="card-lettering"
                      value={id}
                      checked={selected}
                      onChange={() => updatePhoto({ typeStyle: id })}
                      className="sr-only"
                    />
                    <span
                      className="block text-2xl leading-tight"
                      style={{ fontFamily: font.style.fontFamily }}
                      aria-hidden="true"
                    >
                      {style.headline.textCase === "upper"
                        ? "AA"
                        : style.headline.textCase === "lower"
                          ? "aa"
                          : "Aa"}
                    </span>
                    <span className="block text-xs">{style.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className={legendClass}>Words on the front</legend>
            <Input
              label="Small line on top"
              labelPlacement="outside-top"
              value={design.kicker}
              onValueChange={(kicker) => updatePhoto({ kicker })}
              maxLength={28}
              classNames={{
                label: "pb-1.5",
                input: "text-neutral-900",
                inputWrapper: "border-neutral-300",
              }}
            />
            <Input
              label="Big words"
              labelPlacement="outside-top"
              value={design.headline}
              onValueChange={(headline) => updatePhoto({ headline })}
              maxLength={40}
              classNames={{
                label: "pb-1.5",
                input: "text-neutral-900",
                inputWrapper: "border-neutral-300",
              }}
            />
            <Input
              label="Small line underneath"
              labelPlacement="outside-top"
              value={design.footer}
              onValueChange={(footer) => updatePhoto({ footer })}
              maxLength={40}
              classNames={{
                label: "pb-1.5",
                input: "text-neutral-900",
                inputWrapper: "border-neutral-300",
              }}
            />
          </fieldset>
        </>
      )}
    </div>
  );
}
