'use client';

import { Button } from '@heroui/react';
import { motion } from 'motion/react';
import Link from 'next/link';
import React from 'react';
// import { TodayStats } from './stats/TodayStats';

interface HeroHomeProps {
  /**
   * Position of the hero content on desktop
   * @default 'center-left'
   */
  position?:
    | 'center'
    | 'center-left'
    | 'center-right'
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
}

export default function HeroHome({ position = 'center-left' }: HeroHomeProps) {
  const positionClasses = {
    center: 'items-center justify-center',
    'center-left': 'items-start justify-center',
    'center-right': 'items-end justify-center',
    'top-left': 'items-start justify-start pt-32',
    'top-center': 'items-center justify-start pt-32',
    'top-right': 'items-end justify-start pt-32',
    'bottom-left': 'items-start justify-end pb-32',
    'bottom-center': 'items-center justify-end pb-32',
    'bottom-right': 'items-end justify-end pb-32',
  };

  const textAlignClasses = {
    center: 'text-center',
    'center-left': 'text-left',
    'center-right': 'text-right',
    'top-left': 'text-left',
    'top-center': 'text-center',
    'top-right': 'text-right',
    'bottom-left': 'text-left',
    'bottom-center': 'text-center',
    'bottom-right': 'text-right',
  };

  const buttonAlignClasses = {
    center: 'justify-center',
    'center-left': 'justify-start',
    'center-right': 'justify-end',
    'top-left': 'justify-start',
    'top-center': 'justify-center',
    'top-right': 'justify-end',
    'bottom-left': 'justify-start',
    'bottom-center': 'justify-center',
    'bottom-right': 'justify-end',
  };

  return (
    <div className={`relative z-10 flex flex-col h-full ${positionClasses[position]}`}>
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className={`max-w-md ${textAlignClasses[position]}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.h1
            className="text-4xl md:text-5xl font-bold leading-normal text-white mb-6 drop-shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          >
            start grateful today
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-white mb-8 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          >
            daily prompts in your inbox. for recovery, for peace, for noticing what's good. share
            anonymously with people who get it
          </motion.p>
          <motion.div
            className={`flex flex-col sm:flex-row gap-4 ${buttonAlignClasses[position]}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          >
            <Button
              as={Link}
              href="/newsletter"
              size="lg"
              className="bg-secondary hover:bg-secondary-600 text-neutral-900 text-lg px-8 py-4 font-semibold shadow-xl"
              radius="full"
            >
              Start Here
            </Button>
            <Button
              as={Link}
              href="/sobriety-chips"
              variant="bordered"
              size="lg"
              className="border-2 border-secondary text-secondary hover:bg-secondary hover:text-neutral-900 text-lg px-8 py-4 shadow-xl"
              radius="full"
            >
              Sobriety Chips
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
