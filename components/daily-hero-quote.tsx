"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Quote {
  id: number;
  quote: string;
  author: string;
}

interface DailyHeroQuoteProps {
  /**
   * Size variant of the quote
   * @default "large"
   */
  size?: "small" | "medium" | "large";
  /**
   * Visual variant of the quote component
   * @default "elevated"
   */
  variant?: "flat" | "elevated" | "minimal" | "gradient";
  /**
   * Custom CSS classes
   */
  className?: string;
  /**
   * Whether to show decorative quote marks
   * @default true
   */
  showQuoteMarks?: boolean;
  /**
   * Whether to show navigation controls
   * @default true
   */
  showNavigation?: boolean;
  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;
}

const DailyHeroQuote: React.FC<DailyHeroQuoteProps> = ({
  size = "large",
  variant = "elevated",
  className = "",
  showQuoteMarks = true,
  showNavigation = true,
  animationDuration = 300
}) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fadeClass, setFadeClass] = useState("opacity-100");

  // Load quotes on component mount (fast load only)
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        // Load the fast quotes first
        const response = await fetch('/quotes-start.json');
        const quotesData: Quote[] = await response.json();
        setQuotes(quotesData);
        
        // Calculate daily quote index based on day of year
        const dayOfYear = getDayOfYear();
        const dailyIndex = (dayOfYear - 1) % quotesData.length; // -1 because arrays are 0-indexed
        setCurrentQuoteIndex(dailyIndex);
        
        // Don't load full quotes automatically - only when user navigates
        
      } catch (error) {
        console.error('Failed to load quotes:', error);
        // Fallback quote
        setQuotes([{
          id: 1,
          quote: "Gratitude turns what we have into enough.",
          author: "Anonymous"
        }]);
      }
    };

    loadQuotes();
  }, []);

  // Get day of year (1-365/366)
  const getDayOfYear = (): number => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // Load full quotes when needed for navigation
  const loadFullQuotes = async () => {
    if (quotes.length > 20) return; // Already loaded full set
    
    try {
      const fullResponse = await fetch('/quotes.json');
      const allQuotesData: Quote[] = await fullResponse.json();
      setQuotes(allQuotesData);
      
      // Recalculate daily index with full dataset
      const dayOfYear = getDayOfYear();
      const fullDailyIndex = (dayOfYear - 1) % allQuotesData.length;
      setCurrentQuoteIndex(fullDailyIndex);
    } catch (error) {
      console.log('Full quotes not available, using starter set');
    }
  };

  // Animation helper
  const animateQuoteChange = (newIndex: number) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setFadeClass("opacity-0");
    
    setTimeout(() => {
      setCurrentQuoteIndex(newIndex);
      setFadeClass("opacity-100");
      
      setTimeout(() => {
        setIsAnimating(false);
      }, animationDuration / 2);
    }, animationDuration / 2);
  };

  // Navigation handlers
  const handlePrevious = async () => {
    await loadFullQuotes(); // Load full quotes if needed
    const newIndex = currentQuoteIndex === 0 ? quotes.length - 1 : currentQuoteIndex - 1;
    animateQuoteChange(newIndex);
  };

  const handleNext = async () => {
    await loadFullQuotes(); // Load full quotes if needed
    const newIndex = (currentQuoteIndex + 1) % quotes.length;
    animateQuoteChange(newIndex);
  };

  // Size classes
  const sizeClasses = {
    small: {
      quote: "text-lg md:text-xl",
      author: "text-sm",
      container: "py-8 px-6",
      quoteMarks: "text-2xl"
    },
    medium: {
      quote: "text-xl md:text-2xl",
      author: "text-base",
      container: "py-10 px-8",
      quoteMarks: "text-3xl"
    },
    large: {
      quote: "text-2xl md:text-3xl lg:text-4xl",
      author: "text-lg",
      container: "py-12 px-10",
      quoteMarks: "text-4xl md:text-5xl"
    }
  };

  // Variant classes using Grateful Today theme colors
  const variantClasses = {
    flat: "bg-soft-sand-300 border border-soft-sand-400",
    elevated: "bg-surface shadow-premium border border-soft-sand-400/50",
    minimal: "bg-transparent border-l-4 border-terracotta-500 pl-8",
    gradient: "bg-gradient-warm shadow-soft"
  };

  const currentSize = sizeClasses[size];
  const isMinimal = variant === "minimal";
  const currentQuote = quotes[currentQuoteIndex];

  if (!currentQuote) {
    return null; // Loading state
  }

  const quoteContent = (
    <div className={`relative ${fadeClass} transition-opacity duration-${animationDuration}`}>
      {/* Quote Text */}
      <blockquote className="relative">
        {showQuoteMarks && (
          <span 
            className={`absolute -top-4 left-0 ${currentSize.quoteMarks} text-terracotta-500 opacity-60 font-serif leading-none`}
            aria-hidden="true"
          >
            &ldquo;
          </span>
        )}
        <p className={`${currentSize.quote} text-midnight-900 font-display font-medium leading-relaxed italic mb-6 ${showQuoteMarks ? 'pt-4' : ''}`}>
          {currentQuote.quote}
        </p>
        {showQuoteMarks && (
          <span 
            className={`absolute -bottom-2 right-0 ${currentSize.quoteMarks} text-terracotta-500 opacity-60 font-serif leading-none`}
            aria-hidden="true"
          >
            &rdquo;
          </span>
        )}
      </blockquote>

      {/* Author Information */}
      <div className="flex flex-col items-center pt-4">
        {/* Decorative line */}
        <div className="w-16 h-0.5 bg-terracotta-500 mb-4 opacity-60"></div>
        
        <cite className={`${currentSize.author} text-forest-900 font-semibold not-italic`}>
          {currentQuote.author}
        </cite>
      </div>
    </div>
  );

  return (
    <div className={`w-full max-w-4xl mx-auto relative ${className}`}>
      {isMinimal ? (
        // Minimal variant without Card wrapper
        <div className={`${variantClasses[variant]} ${currentSize.container} text-center`}>
          {quoteContent}
        </div>
      ) : (
        // Card-wrapped variants
        <Card className={`${variantClasses[variant]} backdrop-blur-sm`} radius="lg">
          <CardBody className={`${currentSize.container} text-center relative`}>
            {quoteContent}
          </CardBody>
        </Card>
      )}

      {/* Navigation Controls */}
      {showNavigation && quotes.length > 1 && (
        <>
          <Button
            isIconOnly
            variant="flat"
            size="sm"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-forest-700/10 hover:bg-forest-700/20 backdrop-blur-sm border border-forest-700/20"
            onPress={handlePrevious}
            isDisabled={isAnimating}
            aria-label="Previous quote"
          >
            <ChevronLeft className="h-4 w-4 text-forest-700" />
          </Button>

          <Button
            isIconOnly
            variant="flat"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-forest-700/10 hover:bg-forest-700/20 backdrop-blur-sm border border-forest-700/20"
            onPress={handleNext}
            isDisabled={isAnimating}
            aria-label="Next quote"
          >
            <ChevronRight className="h-4 w-4 text-forest-700" />
          </Button>

          {/* Quote counter */}
          <div className="absolute bottom-2 right-4 text-xs text-forest-700/60 font-medium">
            {currentQuoteIndex + 1} of {quotes.length}
          </div>
        </>
      )}
    </div>
  );
};

export default DailyHeroQuote;