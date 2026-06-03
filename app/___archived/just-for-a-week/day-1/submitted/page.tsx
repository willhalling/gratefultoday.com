import { Metadata } from 'next';
import SubmittedPage from '../../components/SubmittedPage';

export const metadata: Metadata = {
  title: 'Day 1 Complete | Just For a Week',
  description: 'Your response has been saved.',
};

export default function Day1SubmittedPage() {
  return <SubmittedPage day={1} />;
}
