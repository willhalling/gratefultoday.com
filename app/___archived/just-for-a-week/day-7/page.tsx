import { Metadata } from 'next';
import { DayPage } from '../components/DayPage';

export const metadata: Metadata = {
  title: 'Day 7: Looking Forward | Just For a Week',
  description: 'Complete your 7-day gratitude journey.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Day7Page() {
  return <DayPage day={7} />;
}
