import type { CardArtwork } from "@/lib/sobriety-card-art";

export const CARD_PALETTES = [
  {
    id: "rainbow",
    label: "Rainbow",
    colors: [
      "#EE6352",
      "#F59A3E",
      "#F8D368",
      "#8CC56B",
      "#3FB8AF",
      "#7EC8E8",
      "#B9A3E3",
    ],
  },
  {
    id: "candy",
    label: "Candy",
    colors: ["#FF5D8F", "#FF8FAB", "#F6B3C5", "#B9A3E3", "#7EC8E8", "#F8D368"],
  },
  {
    id: "sunrise",
    label: "Sunrise",
    colors: ["#EE6352", "#F27C66", "#F59A3E", "#F8D368", "#F9B38A"],
  },
  {
    id: "ocean",
    label: "Ocean",
    colors: ["#247BA0", "#3FB8AF", "#7EC8E8", "#A8DCC0", "#F8D368"],
  },
  {
    id: "meadow",
    label: "Meadow",
    colors: ["#3A7D44", "#8CC56B", "#A8DCC0", "#F8D368", "#F27C66"],
  },
  {
    id: "electric",
    label: "Electric",
    colors: ["#6C4CF1", "#B9A3E3", "#3FB8AF", "#F8D368", "#FF5D8F"],
  },
];

export const CARD_ARTWORKS: { id: CardArtwork; label: string }[] = [
  { id: "stripes", label: "Crayon stripes" },
  { id: "confetti", label: "Confetti" },
  { id: "sunburst", label: "Sunburst" },
];
