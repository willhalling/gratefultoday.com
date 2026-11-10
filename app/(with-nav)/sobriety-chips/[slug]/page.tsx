import type { Metadata } from "next";
import { notFound } from "next/navigation";
import sobrietyChipsData from "@/json/sobriety-chips.json";
import { cardHref, getCardForMilestone } from "@/lib/sobriety-card-data";
import {
  getMilestoneNeighbors,
  type SobrietyChip,
} from "@/lib/sobriety-milestones";
import ChipPageContent from "./chip-page-content";

interface ChipPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return sobrietyChipsData.map((chip) => ({ slug: chip.id }));
}

export async function generateMetadata({
  params,
}: ChipPageProps): Promise<Metadata> {
  const { slug } = await params;
  const chipData = sobrietyChipsData.find((chip) => chip.id === slug);
  if (!chipData) return { title: "Chip Not Found | Grateful Today" };
  const title = `${chipData.title} Sobriety Chip | Grateful Today`;
  const description = `Make a free, personal sobriety chip for ${chipData.title.toLowerCase()}, then keep or share the private link.`;
  return {
    title,
    description,
    alternates: { canonical: `/sobriety-chips/${slug}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function getInspirationMessage(chipData: any): string {
  const { chipNumber, chipText } = chipData;
  if (chipText === "hours") return "You chose to start. That choice is yours.";
  if (chipText === "days") {
    if (chipNumber === 1) return "Today you showed up.";
    if (chipNumber <= 7) return "Each day is its own choice.";
    if (chipNumber === 30) return "A month of choosing differently.";
    if (chipNumber === 60) return "Two months of being present.";
    if (chipNumber === 90) return "Three months. Still here.";
    return `${chipNumber} days of showing up.`;
  }
  if (chipText === "WEEK" || chipText === "weeks") {
    if (chipNumber === 1) return "You made it through one week.";
    return `${chipNumber} weeks of steady choices.`;
  }
  if (chipText === "month" || chipText === "months") {
    if (chipNumber === 1) return "One month counts.";
    if (chipNumber === 3) return "Three months of being here.";
    if (chipNumber === 6) return "Half a year. You kept going.";
    return `${chipNumber} months of choosing this.`;
  }
  if (chipText === "year" || chipText === "years") {
    if (chipNumber === 1) return "One year. You stayed.";
    if (chipNumber === 5) return "Five years of quiet strength.";
    return `${chipNumber} years. Still choosing.`;
  }
  return "This moment matters.";
}

function getChipColor(chipData: any): string {
  const chipText = chipData.chipText.toLowerCase();
  const chipNumber = chipData.chipNumber;
  if (chipText.includes("year")) {
    if (chipNumber === 20) return "#FFD700";
    if (chipNumber === 15) return "#C0C0C0";
    if (chipNumber >= 10) return "#CD7F32";
    return "#DC2626";
  }
  if (chipText.includes("month")) return "#F59E0B";
  if (chipText.includes("week")) return "#7C3AED";
  if (chipText.includes("day")) return "#2563EB";
  if (chipText.includes("hour")) return "#059669";
  return "#6B7280";
}

function milestoneLink(chip: SobrietyChip | null) {
  return chip
    ? { href: `/sobriety-chips/${chip.id}`, title: chip.title }
    : null;
}

export default async function ChipPage({ params }: ChipPageProps) {
  const { slug } = await params;
  const chipData = sobrietyChipsData.find((chip) => chip.id === slug);
  if (!chipData) notFound();
  const modifiedChipData = { ...chipData, chipColor: getChipColor(chipData) };
  const neighbors = getMilestoneNeighbors(slug);
  const matchingCard = getCardForMilestone(slug);

  return (
    <ChipPageContent
      initialChipData={modifiedChipData}
      inspirationMessage={getInspirationMessage(chipData)}
      previous={milestoneLink(neighbors.previous)}
      next={milestoneLink(neighbors.next)}
      matchingCard={
        matchingCard
          ? { href: cardHref(matchingCard), title: matchingCard.title }
          : null
      }
    />
  );
}
