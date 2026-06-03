import { Metadata } from 'next';
import SubmittedPage from '../../components/SubmittedPage';

export const metadata: Metadata = {
  title: 'Day 2 Complete | Just For a Week',
  description: 'Your response has been saved.',
};

export default function Day2SubmittedPage() {
  return <SubmittedPage day={2} />;
}
