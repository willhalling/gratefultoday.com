"use client";

import { Button, Input, Switch, Textarea, Card, CardBody } from "@heroui/react";
import { Link2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CardStage from "@/components/sobriety-cards/card-stage";
import {
  CardDownloadActions,
  CardShareActions,
} from "@/components/sobriety-cards/card-actions";
import CardDesignControls from "@/components/sobriety-cards/card-design-controls";
import CardVideoStudio from "@/components/sobriety-cards/card-video-studio";
import { getCollection, type SobrietyCard } from "@/lib/sobriety-card-data";
import {
  cardFrontText,
  defaultCardDesign,
  designToSavedFields,
  photoDesign,
  stripesDesign,
  type CardDesign,
} from "@/lib/sobriety-card-design";
import { saveCard } from "@/lib/sobriety-cards";

interface CardStudioProps {
  card: SobrietyCard;
}

/** Detail-page editor: design, personalisation, share link and downloads. */
export default function CardStudio({ card }: CardStudioProps) {
  const sensitive = getCollection(card).discreetByDefault;
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [message, setMessage] = useState(card.insideMessage);
  const [design, setDesign] = useState<CardDesign>(() =>
    defaultCardDesign(card),
  );
  const [showRecipientOnFront, setShowRecipientOnFront] = useState(false);
  const photoDefault = useMemo(() => photoDesign(card), [card]);
  const stripesDefault = useMemo(() => stripesDesign(card), [card]);
  const [discreet, setDiscreet] = useState(sensitive);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  // A link is a snapshot — editing the card means making a new one.
  useEffect(() => {
    setShareUrl("");
  }, [toName, fromName, message, design, discreet]);

  useEffect(() => {
    setDesign((current) => ({
      ...current,
      recipientName: showRecipientOnFront ? toName : "",
    }));
  }, [showRecipientOnFront, toName]);

  const changeDesign = (next: CardDesign) => {
    setDesign({ ...next, recipientName: showRecipientOnFront ? toName : "" });
    setOpen(false);
  };

  const handleCreateLink = async () => {
    setIsSaving(true);
    setSaveError("");
    try {
      const cardId = await saveCard({
        cardSlug: card.slug,
        ...designToSavedFields(design),
        toName: toName.trim(),
        fromName: fromName.trim(),
        message: message.trim(),
        discreet,
      });
      setShareUrl(`${window.location.origin}/card/${cardId}`);
    } catch (error) {
      console.error("Failed to save card:", error);
      setSaveError("The link could not be created. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const sender = fromName.trim() || "Someone";

  return (
    <div className="grid lg:grid-cols-2 gap-10">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <CardStage
          design={design}
          toName={toName}
          fromName={fromName}
          message={message}
          open={open}
          onOpenChange={setOpen}
          ripple
          headlineAs="h2"
        />
      </div>

      <div className="min-w-0 space-y-6">
        <Card className="border-neutral-200">
          <CardBody className="p-6">
            <CardDesignControls
              design={design}
              photoDefault={photoDefault}
              stripesDefault={stripesDefault}
              onChange={changeDesign}
            />
          </CardBody>
        </Card>

        <Card className="border-neutral-200">
          <CardBody className="p-6 space-y-5">
            <Input
              label="To"
              labelPlacement="outside-top"
              value={toName}
              onValueChange={setToName}
              placeholder="Their name"
              size="lg"
              maxLength={60}
              classNames={{
                label: "pb-1.5",
                input: "text-neutral-900",
                inputWrapper: "border-neutral-300",
              }}
            />
            <Switch
              isSelected={showRecipientOnFront}
              onValueChange={setShowRecipientOnFront}
            >
              <span className="font-semibold text-neutral-900">
                Show their name on the front
              </span>
            </Switch>
            <Input
              label="From (optional)"
              labelPlacement="outside-top"
              value={fromName}
              onValueChange={setFromName}
              placeholder="Your name"
              size="lg"
              maxLength={60}
              classNames={{
                label: "pb-1.5",
                input: "text-neutral-900",
                inputWrapper: "border-neutral-300",
              }}
            />
            <Textarea
              label="Inside message"
              labelPlacement="outside-top"
              value={message}
              onValueChange={setMessage}
              placeholder="A thought, a memory, a thank you..."
              minRows={4}
              maxLength={600}
              classNames={{
                label: "pb-1.5",
                input: "text-neutral-900",
                inputWrapper: "border-neutral-300",
              }}
              description="We started you off. Change it, or write your own."
            />
          </CardBody>
        </Card>

        <Card className="border-neutral-200">
          <CardBody className="p-6">
            <Switch
              isSelected={discreet}
              onValueChange={setDiscreet}
              aria-describedby="discreet-help"
            >
              <span className="font-semibold text-neutral-900">
                Discreet link preview
              </span>
            </Switch>
            <p
              id="discreet-help"
              className="mt-2 text-sm text-neutral-600 leading-relaxed"
            >
              {discreet
                ? `On: the text preview just says “${sender} sent you a card”, without the words on the front.${
                    sensitive
                      ? " Nothing about sobriety shows on a lock screen."
                      : " Handy for a surprise."
                  }`
                : "Off: the preview shows the full card. Good if they are happy for anyone nearby to see it."}
            </p>
          </CardBody>
        </Card>

        <Card className="border-neutral-200">
          <CardBody className="p-6 space-y-5">
            {shareUrl ? (
              <>
                <h3 className="text-lg font-bold text-neutral-900">
                  Your card is ready
                </h3>
                <CardShareActions
                  url={shareUrl}
                  shareTitle={`${sender} sent you a card`}
                  shareText={
                    discreet
                      ? `${sender} sent you a card`
                      : `${sender} sent you a card: ${cardFrontText(design)}`
                  }
                />
              </>
            ) : (
              <>
                <Button
                  onPress={handleCreateLink}
                  isLoading={isSaving}
                  className="w-full bg-primary hover:bg-primary-600 text-primary-50 font-semibold"
                  size="lg"
                  radius="full"
                  startContent={
                    !isSaving ? <Link2 className="w-5 h-5" /> : null
                  }
                >
                  {isSaving ? "Creating..." : "Create shareable link"}
                </Button>
                {saveError && (
                  <p className="text-sm text-red-700" role="alert">
                    {saveError}
                  </p>
                )}
              </>
            )}
            <div className="border-t border-neutral-200 pt-5">
              <CardDownloadActions
                design={design}
                filename={`${card.slug}-card`}
              />
            </div>
          </CardBody>
        </Card>
      </div>
      <section className="border-t border-primary-100 pt-8 lg:col-span-2">
        <h2 className="text-2xl font-bold text-neutral-900">
          Make a signature video
        </h2>
        <p className="mb-6 mt-2 text-sm leading-relaxed text-neutral-600">
          One scene at a time, using the same template as Today, chips, and the
          Gratitude Wall.
        </p>
        <CardVideoStudio
          card={card}
          design={design}
          toName={toName}
          fromName={fromName}
          message={message}
        />
      </section>
    </div>
  );
}
