import { Metadata } from 'next';
import { DayPage } from '../components/DayPage';

export const metadata: Metadata = {
  title: 'Day 4: Your Body | Just For a Week',
  description: 'Day 4 of your gratitude journey.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Day4Page() {
  return <DayPage day={4} />;
}
