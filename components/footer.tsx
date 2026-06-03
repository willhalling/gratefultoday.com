'use client';

import { Link, Button, Divider } from '@heroui/react';
import React from 'react';
import { GratefulTodayLogo } from './nav';

const GratefulTodayFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Tools',
      links: [
        { label: 'Sobriety Chips', href: '/sobriety-chips' },
        { label: 'Quotes Generator', href: '/quotes' },
        { label: 'Gratitude Wall', href: '/gratitude-wall' },
        { label: 'Daily Reflections', href: '/reflections' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', href: '/help' },
        { label: 'Contact Us', href: '/contact' },
        { label: 'FAQs', href: '/faqs' },
        { label: 'Community', href: '/community' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'About Us', href: '/about' },
        { label: 'Blog', href: '/blog' },
      ],
    },
  ];

  const socialLinks = [
    {
      name: 'Instagram',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M12.017 0C8.396 0 7.929.013 7.794.048 2.548.418.125 2.85.048 7.875.013 9.27 0 9.737 0 12.017s.013 2.747.048 2.882c.418 5.025 2.85 7.447 7.875 7.525 1.396.035 1.862.048 2.882.048s1.486-.013 2.882-.048c5.025-.078 7.457-2.5 7.875-7.525.035-1.135.048-1.602.048-2.882s-.013-1.747-.048-2.882C23.582 2.5 21.16.078 16.135.048 14.74.013 14.273 0 12.017 0zm0 2.17c2.204 0 2.466.009 3.637.052 2.012.092 3.108 1.188 3.2 3.2.043 1.171.052 1.433.052 3.637s-.009 2.466-.052 3.637c-.092 2.012-1.188 3.108-3.2 3.2-1.171.043-1.433.052-3.637.052s-2.466-.009-3.637-.052c-2.012-.092-3.108-1.188-3.2-3.2-.043-1.171-.052-1.433-.052-3.637s.009-2.466.052-3.637c.092-2.012 1.188-3.108 3.2-3.2 1.171-.043 1.433-.052 3.637-.052zM5.838 12.017a6.179 6.179 0 1112.358 0 6.179 6.179 0 01-12.358 0zM12.017 16a3.983 3.983 0 110-7.966 3.983 3.983 0 010 7.966zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: 'Twitter',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      href: '#',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-neutral-100 border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <svg
            width="40"
            height="45"
            viewBox="0 0 150 166"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-neutral-900"
          >
            <path
              d="M149.895 89.2422C148.554 123.248 132.246 147.178 101.43 160.369C92.6372 164.131 83.2548 166 73.7917 166C61.8929 166 49.8711 163.046 38.7276 157.193C18.6345 146.641 4.61396 128.377 0.255866 107.081C-1.06387 100.633 3.06083 98.6874 4.89403 98.1468C10.3512 96.5506 12.5663 101.288 13.398 103.072C13.9073 104.166 14.408 105.264 14.9087 106.366C16.8353 110.593 18.8297 114.964 21.2655 118.842C30.3424 133.293 43.1833 142.64 59.4317 146.624C82.979 152.4 107.265 143.07 122.817 122.273C131.088 111.214 135.263 97.8233 136.35 78.8818C135.955 76.3918 135.611 73.8847 135.272 71.3818C134.516 65.8313 133.731 60.0935 132.365 54.6878C128.346 38.7641 119.507 26.7693 106.102 19.0479C86.5223 7.76815 58.1332 9.78148 40.0685 23.7301C30.0156 31.494 25.2926 40.6157 25.6278 51.6146C26.3153 74.0209 36.5973 91.1534 56.1939 102.535C68.6147 109.75 83.5815 107.567 95.2639 96.8486C105.822 87.1565 108.97 73.0291 103.484 59.9829C98.82 48.8989 91.4363 42.2162 81.5319 40.1177C74.5895 38.6449 67.7363 40.5646 62.7289 45.3788C57.3906 50.5121 54.9718 58.2079 56.266 65.959C57.8149 75.2425 64.77 81.2995 73.1128 80.6653C77.0677 80.3716 80.4583 78.171 82.1854 74.7828C83.8064 71.6032 83.6579 68.0234 81.7823 64.9587C80.6577 63.1199 79.181 62.0686 77.7297 62.0686C76.3336 62.0728 74.9248 63.0816 73.8639 64.8311C73.1849 65.9548 71.984 66.6273 70.834 67.1764C69.2512 67.9341 67.7957 68.6023 66.2043 67.385C64.6597 66.2016 64.0401 63.0603 64.4051 61.2428C65.1859 57.3353 67.8805 54.4451 71.9925 53.1129C78.8712 50.8782 85.8858 53.4917 89.8619 59.7615C94.3304 66.8018 94.0885 76.3237 89.2806 82.917C84.5491 89.4039 74.2882 92.707 65.9243 90.434C52.8415 86.8798 44.8764 75.5617 45.1395 60.9065C45.3262 50.627 49.8159 41.1733 57.4585 34.9673C64.6682 29.1146 74.0506 26.782 83.2039 28.5655C94.8056 30.83 105.164 38.6279 111.627 49.9588C118.128 61.3577 119.575 74.3657 115.607 85.6454C111.203 98.1639 101.549 108.256 89.1236 113.334C76.6561 118.429 62.6355 117.952 50.6476 112.036C30.457 102.063 18.189 85.024 14.1916 61.3875C10.7076 40.803 18.1296 24.2451 36.2536 12.1779C48.3519 4.12882 62.207 0.0255391 77.4284 0H77.5897C102.44 0 121.756 10.2752 135.009 30.549C145.923 47.2474 150.795 66.4485 149.895 89.2422Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Copyright & Links - Centered */}
        <div className="text-center space-y-8">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/about"
              className="text-neutral-600 hover:text-primary transition-colors duration-200"
            >
              About
            </Link>
            <Link
              href="https://youtube.com/@gratefultoday"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-primary transition-colors duration-200 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              YouTube
            </Link>
            <Link
              href="/terms"
              className="text-neutral-600 hover:text-primary transition-colors duration-200"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-neutral-600 hover:text-primary transition-colors duration-200"
            >
              Privacy
            </Link>
          </div>

          <div className="text-neutral-600 text-sm">
            <p>&copy; {currentYear} Grateful Today. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GratefulTodayFooter;
