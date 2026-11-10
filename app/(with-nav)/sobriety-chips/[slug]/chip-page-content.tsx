"use client";

import { Input, Textarea, Card, CardBody } from "@heroui/react";
import { Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MilestoneFooter, {
  type MilestoneLink,
} from "@/components/milestone/milestone-footer";
import ChipVideoStudio from "@/components/sobriety-chips/chip-video-studio";
import { saveChip } from "@/lib/sobriety-chips";

interface ChipPageContentProps {
  initialChipData: any;
  inspirationMessage: string;
  previous: MilestoneLink | null;
  next: MilestoneLink | null;
  matchingCard: MilestoneLink | null;
}

export default function ChipPageContent({
  initialChipData,
  inspirationMessage,
  previous,
  next,
  matchingCard,
}: ChipPageContentProps) {
  const router = useRouter();
  const [chipData] = useState(() => ({
    ...initialChipData,
    chipColor: "#F5F5F4",
  }));
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const customText = `${chipData.chipNumber} ${chipData.chipText}`;

  const handleGenerateCoin = async () => {
    setIsSaving(true);
    try {
      const chipId = await saveChip({
        chipId: chipData.id,
        chipNumber: chipData.chipNumber,
        chipText: chipData.chipText,
        chipColor: chipData.chipColor,
        chipNumberX: chipData.chipNumberX,
        chipNumberY: chipData.chipNumberY,
        chipTextX: chipData.chipTextX,
        chipTextY: chipData.chipTextY,
        recipientName,
        customText,
        personalMessage,
      });
      router.push(`/c/${chipId}`);
    } catch (error) {
      console.error("Failed to save chip:", error);
      alert("Failed to create chip. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/sobriety-chips"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-800"
        >
          ← Back to all chips
        </Link>
        <header className="mb-8 mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">
            Sobriety milestone
          </p>
          <h1 className="mt-2 text-4xl font-bold text-neutral-900">
            {initialChipData.title}
          </h1>
          <p className="mt-2 text-lg text-neutral-600">
            Make this moment personal.
          </p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-2">
          <Card className="border-primary-100">
            <CardBody className="p-5 sm:p-8">
              <ChipVideoStudio
                chipData={chipData}
                recipientName={recipientName}
                personalMessage={personalMessage}
              />
              <button
                type="button"
                onClick={handleGenerateCoin}
                disabled={isSaving}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-50 transition-colors hover:bg-primary-500 disabled:opacity-60"
              >
                {!isSaving && <Share2 className="h-5 w-5" />}
                {isSaving ? "Creating…" : "Make your chip"}
              </button>
            </CardBody>
          </Card>

          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-neutral-900">
                About this milestone
              </h2>
              <p className="mt-3 leading-relaxed text-neutral-600">
                This chip marks {initialChipData.title.toLowerCase()}. Maybe
                that is where you are now, or maybe you are making it for
                someone else. Either way, the day counts.
              </p>
            </section>

            <Card className="border-primary-100">
              <CardBody className="space-y-5 p-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">
                    Sending this to someone?
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Add their name, or leave it simple. Change the message so it
                    sounds like you.
                  </p>
                </div>
                <label className="block text-sm font-semibold text-neutral-900">
                  Name (optional)
                  <Input
                    value={recipientName}
                    onValueChange={setRecipientName}
                    placeholder="Your name or theirs…"
                    size="lg"
                    className="mt-2"
                    classNames={{
                      input: "text-neutral-900",
                      inputWrapper: "border-neutral-300",
                    }}
                  />
                </label>
                <label className="block text-sm font-semibold text-neutral-900">
                  A simple message
                  <Textarea
                    value={personalMessage}
                    onValueChange={setPersonalMessage}
                    placeholder={inspirationMessage}
                    minRows={3}
                    className="mt-2"
                    classNames={{
                      input: "text-neutral-900",
                      inputWrapper: "border-neutral-300",
                    }}
                  />
                </label>
              </CardBody>
            </Card>

            {matchingCard && (
              <Link
                href={matchingCard.href}
                className="block rounded-xl border border-primary-200 bg-primary-50 p-5 transition-colors hover:bg-primary-100"
              >
                <span className="font-semibold text-neutral-900">
                  Send the matching card →
                </span>
                <span className="mt-1 block text-sm text-neutral-600">
                  {matchingCard.title}, personalised with your own words.
                </span>
              </Link>
            )}
          </div>
        </div>

        <MilestoneFooter previous={previous} next={next} />
      </div>
    </main>
  );
}
