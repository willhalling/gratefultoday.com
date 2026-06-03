import { Metadata } from 'next';
import { DayPage } from '../components/DayPage';

export const metadata: Metadata = {
  title: 'Day 3: Small Wins | Just For a Week',
  description: 'Day 3 of your gratitude journey.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Day3Page() {
  return <DayPage day={3} />;
}
