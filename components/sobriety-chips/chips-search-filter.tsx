'use client';

import { useState, useMemo, useEffect } from 'react';
import { Chip as FilterChip } from '@heroui/react';
import SearchBox from '@/components/search-box';
import ChipCard from '@/components/sobriety-chips/chip-card';
import sobrietyChipsData from '@/json/sobriety-chips.json';

export default function ChipsSearchFilter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(24); // Start with 24 chips (4 rows of 6)

  // Define filter categories with brand colors
  const filterCategories = [
    { key: 'all', label: 'All Chips', color: 'default' as const },
    { key: 'hours', label: 'Hours', color: 'primary' as const },
    { key: 'days', label: 'Days', color: 'primary' as const },
    { key: 'weeks', label: 'Weeks', color: 'secondary' as const },
    { key: 'months', label: 'Months', color: 'secondary' as const },
    { key: 'years', label: 'Years', color: 'danger' as const },
  ];

  // Function to determine chip SVG color based on milestone
  const getChipSvgColor = (chipData: any) => {
    const chipText = chipData.chipText.toLowerCase();
    const chipNumber = chipData.chipNumber;

    // Special milestone colors
    if (chipText.includes('year')) {
      if (chipNumber === 20) return '#FFD700'; // 20 years = Gold
      if (chipNumber === 15) return '#C0C0C0'; // 15 years = Silver
      if (chipNumber >= 10) return '#CD7F32'; // 10+ years = Bronze
      return '#DC2626'; // Other years = Red
    }
    
    // Standard colors by time period
    if (chipText.includes('month')) return '#F59E0B'; // Orange for months
    if (chipText.includes('week')) return '#7C3AED'; // Purple for weeks
    if (chipText.includes('day')) return '#2563EB'; // Blue for days
    if (chipText.includes('hour')) return '#059669'; // Green for hours
    
    return '#6B7280'; // Default gray
  };

  // Filter and search logic
  const filteredChips = useMemo(() => {
    let filtered = sobrietyChipsData;

    // Apply filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(chip => {
        const chipText = chip.chipText.toLowerCase();
        if (selectedFilter === 'hours') return chipText.includes('hour');
        if (selectedFilter === 'days') return chipText.includes('day') && !chipText.includes('week');
        if (selectedFilter === 'weeks') return chipText.includes('week');
        if (selectedFilter === 'months') return chipText.includes('month');
        if (selectedFilter === 'years') return chipText.includes('year');
        return true;
      });
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(chip => 
        chip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chip.chipText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chip.chipNumber.toString().includes(searchQuery)
      );
    }

    return filtered;
  }, [searchQuery, selectedFilter]);

  // Infinite scroll logic
  const LOAD_MORE_COUNT = 24; // Load 24 more chips at a time
  
  // Get the chips to display (limited by displayCount)
  const displayedChips = useMemo(() => {
    return filteredChips.slice(0, displayCount);
  }, [filteredChips, displayCount]);

  const hasMoreChips = filteredChips.length > displayCount;

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(24);
  }, [searchQuery, selectedFilter]);

  return (
    <>
      {/* Search and Filter Section */}
      <div className="mb-12 max-w-3xl mx-auto">
        {/* Search Box */}
        <div className="mb-6">
          <SearchBox
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Search for a specific milestone (e.g., '30 days', '1 year', '6 months')..."
            variant="primary"
            size="lg"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-3 justify-center">
          {filterCategories.map((category) => (
            <FilterChip
              key={category.key}
              variant={selectedFilter === category.key ? "solid" : "bordered"}
              color={selectedFilter === category.key ? category.color : "default"}
              className={`cursor-pointer transition-all ${
                selectedFilter === category.key 
                  ? "shadow-lg" 
                  : "border-neutral-300 text-neutral-700 hover:border-primary"
              }`}
              onClick={() => setSelectedFilter(category.key)}
            >
              {category.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-neutral-900">
            {selectedFilter === 'all' ? 'All Milestone Chips' : `${filterCategories.find(f => f.key === selectedFilter)?.label} Milestones`}
          </h2>
          <div className="text-neutral-600 text-sm">
            {filteredChips.length} chip{filteredChips.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {filteredChips.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {displayedChips.map((chipData, index) => {
                // Apply dynamic color override
                const dynamicColor = getChipSvgColor(chipData);
                const modifiedChipData = {
                  ...chipData,
                  chipColor: dynamicColor
                };
                
                return (
                  <ChipCard 
                    key={chipData.id}
                    chipData={modifiedChipData}
                    index={index}
                  />
                );
              })}
            </div>
            
            {/* Load More Button/Indicator */}
            {hasMoreChips && (
              <div className="text-center mt-8">
                <div className="text-neutral-600 text-sm mb-4">
                  Showing {displayedChips.length} of {filteredChips.length} chips
                </div>
                <button
                  onClick={() => setDisplayCount(prev => prev + LOAD_MORE_COUNT)}
                  className="bg-primary hover:bg-primary-600 text-neutral-900 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  Load More Chips
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-neutral-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.935.609-5.514 1.652M15 17a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl text-neutral-900 mb-2">No chips found</h3>
            <p className="text-neutral-600">
              Try adjusting your search or filter to find the milestone you&apos;re looking for.
            </p>
          </div>
        )}
      </div>
    </>
  );
}