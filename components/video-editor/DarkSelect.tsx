'use client';

/**
 * Reusable dark theme classNames for Select components
 * Use this to avoid dark text on dark background issues with HeroUI
 */
export const darkSelectClasses = {
  trigger: 'bg-gray-900 border-gray-700 hover:bg-gray-800 data-[hover=true]:bg-gray-800',
  value: '!text-white',
  label: 'text-gray-400',
  selectorIcon: 'text-gray-400',
  listbox: 'bg-gray-900',
  popoverContent: 'bg-gray-900 border border-gray-700',
};

/**
 * Reusable dark theme classNames for SelectItem components
 */
export const darkSelectItemClasses = {
  base: '!text-gray-300 data-[hover=true]:!bg-gray-800 data-[hover=true]:!text-white data-[selectable=true]:focus:!bg-purple-600 data-[selectable=true]:focus:!text-white data-[focus=true]:!bg-purple-600 data-[focus=true]:!text-white',
  title: '!text-gray-300 data-[hover=true]:!text-white data-[focus=true]:!text-white',
};
