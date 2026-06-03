'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import React from 'react';

type CTAButton = {
  href?: string;
  text: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
};

type HeroWithImageProps = {
  title: string;
  subtitle: string;
  ctas?: CTAButton[];
  backgroundImage?: string;
  backgroundOpacity?: number;
  textAlign?: 'left' | 'center';
  rightContent?: React.ReactNode;
  afterSubtitle?: React.ReactNode;
};

const HeroWithImage: React.FC<HeroWithImageProps> = ({
  title,
  subtitle,
  ctas = [],
  backgroundImage,
  backgroundOpacity = 40,
  textAlign = 'left',
  rightContent,
  afterSubtitle,
}) => {
  return (
    <div className="w-full bg-primary relative overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-white py-16 relative z-10 w-full">
        <div className={`grid gap-8 ${rightContent ? 'lg:grid-cols-2 items-center' : ''}`}>
          <div className={`flex flex-col ${textAlign === 'center' ? 'items-center text-center' : 'items-start'}`}>
            <motion.h1
              className="text-5xl md:text-6xl leading-tight m-0 p-0 max-w-2xl mb-6 font-bold"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {title}
            </motion.h1>
            <motion.p
              className="text-white/90 text-xl leading-relaxed m-0 p-0 max-w-2xl mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            >
              {subtitle}
            </motion.p>
            {afterSubtitle && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                className="mb-6"
              >
                {afterSubtitle}
              </motion.div>
            )}
            {ctas.length > 0 && (
              <motion.div
                className={`flex flex-wrap gap-4 ${textAlign === 'center' ? 'justify-center' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              >
                {ctas.map((cta, index) =>
                  cta.onClick ? (
                    <button
                      key={index}
                      onClick={cta.onClick}
                      className={
                        cta.variant === 'secondary'
                          ? 'inline-flex items-center rounded-lg border-2 border-white/30 px-8 py-4 text-white text-lg font-medium hover:bg-white/10 transition-colors'
                          : 'inline-flex items-center rounded-lg bg-accent px-8 py-4 text-neutral-900 text-lg font-medium shadow-md hover:bg-accent-600 transition-colors'
                      }
                    >
                      {cta.text}
                    </button>
                  ) : (
                    <a
                      key={index}
                      href={cta.href}
                      className={
                        cta.variant === 'secondary'
                          ? 'inline-flex items-center rounded-lg border-2 border-white/30 px-8 py-4 text-white text-lg font-medium hover:bg-white/10 transition-colors'
                          : 'inline-flex items-center rounded-lg bg-accent px-8 py-4 text-neutral-900 text-lg font-medium shadow-md hover:bg-accent-600 transition-colors'
                      }
                    >
                      {cta.text}
                    </a>
                  )
                )}
              </motion.div>
            )}
          </div>
          {rightContent && (
            <div className="self-center">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroWithImage;
