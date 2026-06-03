"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardBody, Button, Skeleton } from "@heroui/react";
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { IoSearch, IoHeart, IoStar, IoSparkles } from 'react-icons/io5';
import SearchBox from '@/components/search-box';

interface Quote {
  id: number;
  quote: string;
  author: string;
  title?: string;
}

const quoteStyles = [
  // Gradient styles
  {
    card: "bg-gradient-to-br from-primary-500/20 to-primary-700/30 border-primary-400/30",
    quote: "text-white font-medium text-lg",
    author: "text-neutral-200 text-sm",
    icon: IoHeart,
    iconColor: "text-accent"
  },
  // Elevated style
  {
    card: "bg-neutral-50/90 backdrop-blur-sm shadow-lg border-neutral-200/50",
    quote: "text-neutral-900 font-display text-xl italic",
    author: "text-primary-700 text-base font-semibold",
    icon: IoStar,
    iconColor: "text-primary-600"
  },
  // Minimal bordered
  {
    card: "bg-transparent border-2 border-accent/40 backdrop-blur-sm",
    quote: "text-neutral-100 text-lg font-light",
    author: "text-secondary text-sm uppercase tracking-wider",
    icon: IoSparkles,
    iconColor: "text-accent"
  },
  // Dark elevated
  {
    card: "bg-neutral-900/60 backdrop-blur-sm shadow-lg border border-neutral-700",
    quote: "text-white text-xl font-medium leading-relaxed",
    author: "text-neutral-300 text-base",
    icon: IoHeart,
    iconColor: "text-neutral-400"
  },
  // Warm gradient
  {
    card: "bg-gradient-to-tr from-accent/20 to-secondary/30 border-secondary/30",
    quote: "text-white text-lg font-display italic",
    author: "text-neutral-200 text-sm font-medium",
    icon: IoStar,
    iconColor: "text-secondary"
  }
];

// Skeleton Quote Component
const QuoteSkeleton: React.FC<{ style: any }> = ({ style }) => (
  <Card className={`${style.card} h-auto transition-all duration-200`}>
    <CardBody className="p-6 relative">
      
      {/* Quote text skeleton - more realistic line lengths */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-3 w-full rounded opacity-50" />
        <Skeleton className="h-3 w-5/6 rounded opacity-50" />
        <Skeleton className="h-3 w-4/5 rounded opacity-50" />
        <Skeleton className="h-3 w-2/3 rounded opacity-50" />
      </div>
      
      {/* Author skeleton - bottom */}
      <div className="pt-3 border-t border-white/10">
        <Skeleton className="h-2.5 w-20 rounded opacity-40" />
      </div>
    </CardBody>
  </Card>
);

// Header Component - Reusable and SEO-friendly
const QuotesHeader: React.FC<{
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredQuotes: Quote[];
  displayedQuotes: Quote[];
  allQuotes: Quote[];
  loading: boolean;
}> = ({ searchTerm, onSearchChange, filteredQuotes, displayedQuotes, allQuotes, loading }) => (
  <div className="text-center mb-16">
    <h1 className="text-4xl md:text-6xl font-bold text-neutral-300 mb-6 leading-tight">
      <span className="text-secondary">Gratitude</span>
      <span className="text-neutral-300">&nbsp;Quotes</span>
    </h1>
    <p className="text-xl text-neutral-200 max-w-lg mx-auto mb-8 leading-relaxed">
      A mix of famous and thoughtful quotes on gratitude, mindfulness, and appreciating the little things.
    </p>

    {/* Search Bar */}
    <div className="max-w-md mx-auto">
      <SearchBox
        value={searchTerm}
        onValueChange={onSearchChange}
        placeholder="Search quotes or authors..."
        variant="forest"
        size="lg"
      />
    </div>

    {/* Results count */}
    <p className="mt-4 text-neutral-300 text-sm">
      {loading ? (
        "Loading quotes..."
      ) : searchTerm ? (
        `${filteredQuotes.length} quote${filteredQuotes.length !== 1 ? 's' : ''} found${allQuotes.length === 0 ? ' (searching loaded quotes only)' : ''}`
      ) : (
        allQuotes.length > 0 ? 
          `${displayedQuotes.length} of ${allQuotes.length} quotes loaded` :
          `${displayedQuotes.length} quotes loaded`
      )}
    </p>
  </div>
);

const QuotesWall: React.FC = () => {
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [displayedQuotes, setDisplayedQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const QUOTES_PER_PAGE = 20; // Load 20 quotes at a time

  // Function to load full quotes dataset when needed
  const loadFullQuotes = useCallback(async () => {
    if (allQuotes.length > 0) {
      console.log('✅ Full quotes already loaded:', allQuotes.length);
      return allQuotes; // Return existing quotes
    }
    
    console.log('🌐 Fetching full quotes from /quotes.json...');
    try {
      const fullResponse = await fetch('/quotes.json');
      const allQuotesData: Quote[] = await fullResponse.json();
      console.log('📥 Received full quotes:', allQuotesData.length);
      setAllQuotes(allQuotesData);
      return allQuotesData;
    } catch (error) {
      console.error('Failed to load full quotes:', error);
      return [];
    }
  }, [allQuotes]);

  // Load initial quotes on component mount (fast load only)
  useEffect(() => {
    const loadInitialQuotes = async () => {
      try {
        // Load first 20 quotes quickly from quotes-start.json
        const response = await fetch('/quotes-start.json');
        const initialQuotesData: Quote[] = await response.json();
        
        setDisplayedQuotes(initialQuotesData);
        setFilteredQuotes(initialQuotesData);
        setLoading(false);
        
        // Don't load full dataset yet - only when needed
        
      } catch (error) {
        console.error('Failed to load quotes:', error);
        setLoading(false);
      }
    };

    loadInitialQuotes();
  }, []);

  // Load more quotes function
  const loadMoreQuotes = useCallback(async () => {
    if (loadingMore || searchTerm) return;
    
    console.log('🔄 LoadMoreQuotes triggered, current length:', displayedQuotes.length);
    setLoadingMore(true);
    
    try {
      // Load full dataset if we haven't already
      const fullQuotes = await loadFullQuotes();
      console.log('📚 Full quotes loaded result:', fullQuotes ? fullQuotes.length : 0);
      console.log('📊 AllQuotes state length:', allQuotes.length);
      
      // MUST use allQuotes state, not the return value from loadFullQuotes
      // because the return value might be stale
      if (allQuotes.length === 0) {
        console.log('❌ AllQuotes not loaded yet, cannot continue');
        setLoadingMore(false);
        return;
      }
      
      const currentLength = displayedQuotes.length;
      console.log('📈 Current displayed quotes length:', currentLength);
      console.log('🎯 Using allQuotes as source - length:', allQuotes.length);
      
      // If we've reached the end, we're done
      if (allQuotes.length <= currentLength) {
        console.log('❌ No more quotes to load - allQuotes.length:', allQuotes.length, 'currentLength:', currentLength);
        setLoadingMore(false);
        return;
      }
      
      const startIndex = currentLength;
      const endIndex = startIndex + QUOTES_PER_PAGE;
      
      const newQuotes = allQuotes.slice(startIndex, endIndex);
      console.log('✅ Loading quotes from', startIndex, 'to', endIndex, '- found:', newQuotes.length);
      
      if (newQuotes.length > 0) {
        setDisplayedQuotes(prev => {
          console.log('📋 Before update - prev length:', prev.length);
          console.log('🆕 Adding new quotes:', newQuotes.length);
          console.log('📋 New quotes IDs:', newQuotes.map(q => q.id));
          const updated = [...prev, ...newQuotes];
          console.log('📝 Updated displayedQuotes length:', updated.length);
          console.log('📋 All displayed IDs:', updated.map(q => q.id));
          return updated;
        });
        
        // Only update filtered quotes if we're not searching
        if (!searchTerm.trim()) {
          setFilteredQuotes(prev => {
            console.log('🔍 Updating filteredQuotes from', prev.length, 'to', prev.length + newQuotes.length);
            return [...prev, ...newQuotes];
          });
        }
      } else {
        console.log('⚠️ No new quotes found to load');
      }
      
    } catch (error) {
      console.error('Error loading more quotes:', error);
    }
    
    setLoadingMore(false);
  }, [loadFullQuotes, displayedQuotes, loadingMore, searchTerm, allQuotes]);

  // Check if there are more quotes to load
  const hasMoreQuotes = useMemo(() => {
    // If we haven't loaded the full dataset yet and we have at least 20 displayed, there might be more
    if (allQuotes.length === 0 && displayedQuotes.length >= 20) {
      return true; // Assume there are more until we load the full dataset
    }
    
    // If we have the full dataset, check if there are more to display
    if (allQuotes.length > 0) {
      return displayedQuotes.length < allQuotes.length;
    }
    
    return false;
  }, [displayedQuotes.length, allQuotes.length]);
  
  // Debug logging
  console.log('🔍 hasMoreQuotes check:', {
    displayedLength: displayedQuotes.length,
    allQuotesLength: allQuotes.length,
    hasMoreQuotes,
    searchTerm: searchTerm.length > 0
  });

  // Filter quotes based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Reset to displayed quotes when search is cleared - but only when not loading more
      if (!loadingMore) {
        console.log('🔍 Search cleared - resetting filteredQuotes to displayedQuotes length:', displayedQuotes.length);
        setFilteredQuotes(displayedQuotes);
      } else {
        console.log('🔍 Search cleared but loadingMore is true - skipping reset');
      }
      return;
    }

    const handleSearch = async () => {
      // Load full quotes for comprehensive search
      const fullQuotes = await loadFullQuotes();
      const quotesToSearch = fullQuotes && fullQuotes.length > 0 ? fullQuotes : displayedQuotes;
      
      const filtered = quotesToSearch.filter(
        quote =>
          quote.quote.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredQuotes(filtered);
    };

    handleSearch();
  }, [searchTerm, displayedQuotes, loadFullQuotes, loadingMore]);

  const getQuoteStyle = (index: number) => {
    return quoteStyles[index % quoteStyles.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Single Header - Always Rendered */}
        <QuotesHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filteredQuotes={filteredQuotes}
          displayedQuotes={displayedQuotes}
          allQuotes={allQuotes}
          loading={loading}
        />

        {/* Content Area */}
        {loading ? (
          /* Skeleton Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <QuoteSkeleton 
                key={index} 
                style={getQuoteStyle(index)} 
              />
            ))}
          </div>
        ) : (
          <>
            {/* Quotes Grid - Masonry Layout */}
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {filteredQuotes.map((quote, index) => {
                const style = getQuoteStyle(index);
                const IconComponent = style.icon;
                
                return (
                  <Card
                    key={quote.id}
                    className={`${style.card} break-inside-avoid mb-6 transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                    radius="lg"
                  >
                    <CardBody className="p-6">
                      {/* Quote Icon */}
                      <div className="flex items-center justify-between mb-4">
                        <IconComponent className={`h-5 w-5 ${style.iconColor}`} />
                        <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-accent/50"></div>
                      </div>

                      {/* Quote Text */}
                      <blockquote className={`${style.quote} leading-relaxed mb-4`}>
                        &ldquo;{quote.quote}&rdquo;
                      </blockquote>

                      {/* Author */}
                      <div className="flex flex-col">
                        <cite className={`${style.author} not-italic`}>
                          — {quote.author}
                        </cite>
                        {quote.title && (
                          <p className="text-xs text-neutral-400 mt-1 opacity-75">
                            {quote.title}
                          </p>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            {/* No results message */}
            {filteredQuotes.length === 0 && searchTerm && (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 opacity-30">
                  <IoSearch className="w-full h-full text-neutral-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No quotes found</h3>
                <p className="text-neutral-300">
                  Try searching with different keywords or browse all quotes.
                </p>
                <Button
                  onPress={() => setSearchTerm("")}
                  className="mt-4 bg-primary hover:bg-primary-hover text-white"
                  radius="full"
                >
                  Clear search
                </Button>
              </div>
            )}

            {/* Load More Button */}
            {!searchTerm && hasMoreQuotes && (
              <div className="text-center py-16">
                <div className="flex flex-col items-center space-y-6">
                  {/* Progress indicator */}
                  {allQuotes.length > 0 && (
                    <div className="w-48 h-2 bg-primary-700/30 rounded-full">
                      <div 
                        className="h-full bg-primary-600 rounded-full transition-all duration-300"
                        style={{ width: `${(displayedQuotes.length / allQuotes.length) * 100}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Load More Button */}
                  <Button
                    onPress={loadMoreQuotes}
                    disabled={loadingMore}
                    size="lg"
                    className="bg-primary hover:bg-primary-hover text-white px-8 py-6 font-semibold min-w-48"
                    radius="full"
                  >
                    {loadingMore ? (
                      <>
                        <AiOutlineLoading3Quarters className="h-5 w-5 animate-spin mr-2" />
                        Loading more quotes...
                      </>
                    ) : (
                      <>
                        Load More Quotes
                        {allQuotes.length > 0 && (
                          <span className="ml-2 text-neutral-300">
                            ({displayedQuotes.length} of {allQuotes.length})
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                  
                  {/* Helpful text */}
                  <p className="text-neutral-400 text-sm">
                    {allQuotes.length === 0 
                      ? "Click to load the full collection of quotes"
                      : `${allQuotes.length - displayedQuotes.length} more quotes available`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Back to top button */}
            {displayedQuotes.length > 20 && (
              <div className="text-center mt-16">
                <Button
                  onPress={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  variant="bordered"
                  className="border-neutral-300 text-neutral-300 hover:bg-neutral-300 hover:text-neutral-900"
                  radius="full"
                >                  Back to top
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QuotesWall;