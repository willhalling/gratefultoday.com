import { Metadata } from 'next';
import SubmittedPage from '../../components/SubmittedPage';

export const metadata: Metadata = {
  title: 'Day 3 Complete | Just For a Week',
  description: 'Your response has been saved.',
};

export default function Day3SubmittedPage() {
  return <SubmittedPage day={3} />;
}
