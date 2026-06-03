import { Metadata } from 'next';
import { DayPage } from '../components/DayPage';

export const metadata: Metadata = {
  title: 'Day 1: Right Now | Just For a Week',
  description: 'Begin your 7-day gratitude journey for recovery.',
};

// This page relies on runtime query params and client auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Day1Page() {
  return <DayPage day={1} />;
}
