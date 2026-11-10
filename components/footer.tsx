import Link from "next/link";
import { BrandLockup } from "@/components/brand";

const footerLinks = [
  { label: "About", href: "/about" },
  {
    label: "YouTube",
    href: "https://youtube.com/@gratefultoday",
    external: true,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@gratefultoday",
    external: true,
  },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export default function GratefulTodayFooter() {
  return (
    <footer className="border-t border-neutral-700 bg-neutral">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-neutral-700 pb-8 text-center">
          <p className="text-sm text-primary-200">
            having a hard time today? you don&apos;t have to do it alone →{" "}
            <Link
              href="/support"
              className="font-semibold text-secondary underline underline-offset-4 hover:text-primary-100"
            >
              Support
            </Link>
          </p>
        </div>
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <BrandLockup variant="light" />
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm"
            aria-label="Footer"
          >
            {footerLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-100 transition-colors hover:text-secondary"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-primary-100 transition-colors hover:text-secondary"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-primary-300 md:text-left">
          &copy; {new Date().getFullYear()} Grateful Today. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
