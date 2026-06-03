'use client';

import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@heroui/react';
import Link from 'next/link';
import React, { useState } from 'react';
import HeroHome from '@/components/hero-home';

export default function GratefulTodayPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Toggle between 'image' and 'video' background
  const backgroundType: 'image' | 'video' = 'image';

  const navLinks = [
    { label: 'Start Your Practice', href: '/newsletter' },
    { label: 'Sobriety Chips', href: '/sobriety-chips' },
    { label: 'Quotes', href: '/quotes' },
  ];

  return (
    <div className="relative w-full h-dvh overflow-hidden">
      {/* Background - Image or Video */}
      {backgroundType === 'video' ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/grateful-today-hero.jpg"
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src="/grateful-today-hero_slowed.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div
          className="absolute top-0 left-0 w-full h-full bg-primary bg-cover bg-center"
          style={{ backgroundImage: 'url(/grateful-today-hero.jpg)' }}
        />
      )}

      {/* Overlay for better text readability */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/50 md:bg-black/10" />

      {/* Transparent Header */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-transparent">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-white opacity-50 font-bold text-2xl drop-shadow-lg">
              <img src="/logo.svg" alt="Grateful Today Logo" className="h-16 w-auto" />
            </Link>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white hover:text-secondary transition-colors drop-shadow-lg"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden flex items-center gap-2 text-white hover:text-secondary transition-colors drop-shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span className="text-sm font-medium">Menu</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <Drawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} placement="right" size="xs">
        <DrawerContent className="bg-neutral-900">
          <DrawerBody className="pt-8">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg text-neutral-100 hover:text-secondary transition-colors py-3 px-4 rounded-lg hover:bg-neutral-800"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Hero Content */}
      <HeroHome />

      {/* Transparent Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/80 text-sm">
            <p className="drop-shadow-lg">
              &copy; {new Date().getFullYear()} Grateful Today. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/about" className="hover:text-white transition-colors drop-shadow-lg">
                About
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors drop-shadow-lg">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors drop-shadow-lg">
                Terms
              </Link>
              <Link
                href="https://youtube.com/@gratefultoday"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors drop-shadow-lg flex items-center gap-1"
                aria-label="YouTube Channel"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
