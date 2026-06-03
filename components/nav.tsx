'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link, Drawer, DrawerContent, DrawerBody } from '@heroui/react';

export const GratefulTodayLogo = () => {
  return (
    <svg fill="none" height="36" viewBox="0 0 32 32" width="36">
      <path
        clipRule="evenodd"
        d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};

interface NavItem {
  label: string;
  href: string;
}

export default function Nav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Define Grateful Today specific navigation items
  const navItems: NavItem[] = [
    { label: 'Sobriety Chips', href: '/sobriety-chips' },
    { label: 'Quotes', href: '/quotes' },
    { label: 'Gratitude Wall', href: '/wall' },
    { label: 'Get Free Prompts', href: '/newsletter' },
  ];

  // Function to check if a route is active
  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      <div className="bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            {/* Logo - Left */}
            <Link href="/">
              <img src="/logo.svg" alt="Grateful Today Logo" className="h-12 w-auto" />
            </Link>

            {/* Desktop Nav Links - Right */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive(item.href)
                      ? 'text-secondary font-semibold'
                      : 'text-neutral-100 hover:text-secondary transition-colors'
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden flex items-center gap-2 text-white hover:text-secondary transition-colors"
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
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} placement="right" size="xs">
        <DrawerContent className="bg-neutral-900">
          <DrawerBody className="pt-8">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg text-neutral-100 hover:text-secondary transition-colors py-3 px-4 rounded-lg hover:bg-neutral-800"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
