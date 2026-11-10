"use client";

import { useState, useMemo, useEffect } from "react";
import { Chip as FilterChip } from "@heroui/react";
import SearchBox from "@/components/search-box";
import CardThumb from "@/components/sobriety-cards/card-thumb";
import {
  CARD_COLLECTIONS,
  type CardCategory,
  type CardCollectionId,
  type CardLook,
} from "@/lib/sobriety-card-data";

const LOOKS: { key: "all" | CardLook; label: string }[] = [
  { key: "all", label: "All looks" },
  { key: "colour", label: "Colourful" },
  { key: "quiet", label: "Quiet" },
];

const PAGE_SIZE = 24;

const FILTER_COLORS: Partial<
  Record<
    "all" | CardCategory,
    "default" | "primary" | "secondary" | "danger" | "success"
  >
> = {
  all: "default",
  hours: "primary",
  days: "primary",
  weeks: "secondary",
  months: "secondary",
  years: "danger",
  occasions: "success",
};

interface CardsSearchFilterProps {
  collection?: CardCollectionId;
}

export default function CardsSearchFilter({
  collection = "sobriety",
}: CardsSearchFilterProps) {
  const {
    cards: collectionCards,
    categories,
    searchPlaceholder,
  } = CARD_COLLECTIONS[collection];
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | CardCategory>(
    "all",
  );
  const [selectedLook, setSelectedLook] = useState<"all" | CardLook>("all");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const filteredCards = useMemo(() => {
    let filtered = collectionCards;
    if (selectedLook !== "all") {
      filtered = filtered.filter((card) => card.look === selectedLook);
    }
    if (selectedFilter !== "all") {
      filtered = filtered.filter((card) => card.category === selectedFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.title.toLowerCase().includes(query) ||
          card.headline.toLowerCase().includes(query) ||
          card.category.includes(query),
      );
    }
    return filtered;
  }, [collectionCards, searchQuery, selectedFilter, selectedLook]);

  const displayedCards = useMemo(
    () => filteredCards.slice(0, displayCount),
    [filteredCards, displayCount],
  );
  const hasMoreCards = filteredCards.length > displayCount;

  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, selectedFilter, selectedLook]);

  const selectedLabel = categories.find(
    (category) => category.key === selectedFilter,
  )?.label;

  return (
    <>
      <div className="mb-12 max-w-3xl mx-auto">
        <div className="mb-6">
          <SearchBox
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder={searchPlaceholder}
            variant="primary"
            size="lg"
          />
        </div>

        <div
          className="flex flex-wrap gap-3 justify-center"
          role="group"
          aria-label="Filter cards"
        >
          {categories.map((category) => {
            const selected = selectedFilter === category.key;
            return (
              <button
                key={category.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedFilter(category.key)}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <FilterChip
                  variant={selected ? "solid" : "bordered"}
                  color={
                    selected
                      ? (FILTER_COLORS[category.key] ?? "primary")
                      : "default"
                  }
                  className={`cursor-pointer transition-all ${
                    selected
                      ? "shadow-lg"
                      : "border-neutral-300 text-neutral-700 hover:border-primary"
                  }`}
                >
                  {category.label}
                </FilterChip>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center">
          <div
            className="inline-flex rounded-full border border-neutral-300 bg-white p-1"
            role="group"
            aria-label="Card look"
          >
            {LOOKS.map((look) => (
              <button
                key={look.key}
                type="button"
                aria-pressed={selectedLook === look.key}
                onClick={() => setSelectedLook(look.key)}
                data-testid={`look-${look.key}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedLook === look.key
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:text-neutral-900"
                }`}
              >
                {look.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900">
            {selectedFilter === "all" ? "All Cards" : `${selectedLabel} Cards`}
          </h2>
          <div className="text-neutral-600 text-sm" aria-live="polite">
            {filteredCards.length} card{filteredCards.length !== 1 ? "s" : ""}{" "}
            found
          </div>
        </div>

        {filteredCards.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {displayedCards.map((card) => (
                <CardThumb key={card.slug} card={card} />
              ))}
            </div>

            {hasMoreCards && (
              <div className="text-center mt-8">
                <div className="text-neutral-600 text-sm mb-4">
                  Showing {displayedCards.length} of {filteredCards.length}{" "}
                  cards
                </div>
                <button
                  type="button"
                  onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
                  className="bg-primary hover:bg-primary-600 text-primary-50 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-neutral-900/30"
                >
                  Load More Cards
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl text-neutral-900 mb-2">No cards found</h3>
            <p className="text-neutral-600">
              Try adjusting your search or filter to find the card you&apos;re
              looking for.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
