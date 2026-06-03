import { Metadata } from 'next';
import { DayPage } from '../components/DayPage';

export const metadata: Metadata = {
  title: 'Day 6: Something About You | Just For a Week',
  description: 'Day 6 of your gratitude journey.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Day6Page() {
  return <DayPage day={6} />;
}
