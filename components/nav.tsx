"use client";

import { Drawer, DrawerBody, DrawerContent } from "@heroui/react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLockup } from "@/components/brand";

export const navLinks = [
  { label: "Today", href: "/" },
  { label: "Sobriety Chips", href: "/sobriety-chips" },
  { label: "Sobriety Cards", href: "/sobriety-cards" },
  { label: "Gratitude Wall", href: "/wall" },
];

export default function Nav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="relative z-30 border-b border-primary-100 bg-primary-100">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <BrandLockup />
          <div className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-sm py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                  isActive(link.href)
                    ? "text-primary-800 underline decoration-primary-400 underline-offset-8"
                    : "text-neutral-600 hover:text-primary-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/newsletter"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-50 transition-colors hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-800 focus-visible:ring-offset-2"
            >
              Daily Email
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-primary-200 px-3 py-2 text-sm font-medium text-primary-800 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            Menu
          </button>
        </nav>
      </header>

      <Drawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        placement="right"
        size="xs"
      >
        <DrawerContent className="bg-primary-100">
          <DrawerBody className="gap-3 pt-8">
            <BrandLockup className="mb-5" />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-base font-medium ${
                  isActive(link.href)
                    ? "bg-primary-100 text-primary-900"
                    : "text-neutral-700 hover:bg-primary-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/newsletter"
              onClick={() => setIsMenuOpen(false)}
              className="mt-3 rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-50"
            >
              Daily Email
            </Link>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
