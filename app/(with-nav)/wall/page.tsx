import type { Metadata } from "next";
import WallPageClient from "./WallPageClient";

export const metadata: Metadata = {
  title: "Gratitude Wall | Grateful Today",
  description:
    "Share one thing you are grateful for, read the community wall, or make a 15-second gratitude video on your device.",
  alternates: { canonical: "/wall" },
};

export default function WallPage() {
  return <WallPageClient />;
}
