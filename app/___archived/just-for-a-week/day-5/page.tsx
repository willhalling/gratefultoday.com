import { Metadata } from 'next';
import { DayPage } from '../components/DayPage';

export const metadata: Metadata = {
  title: 'Day 5: A Place | Just For a Week',
  description: 'Day 5 of your gratitude journey.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Day5Page() {
  return <DayPage day={5} />;
}
