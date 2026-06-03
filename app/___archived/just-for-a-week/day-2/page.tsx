import { Metadata } from 'next';
import { DayPage } from '../components/DayPage';

export const metadata: Metadata = {
  title: 'Day 2: Someone Who Showed Up | Just For a Week',
  description: 'Day 2 of your gratitude journey.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Day2Page() {
  return <DayPage day={2} />;
}
