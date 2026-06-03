import { Metadata } from 'next';
import WallPageClient from './WallPageClient';

export const metadata: Metadata = {
  title: 'Gratitude Wall | Grateful Today',
  description: 'Share and read anonymous gratitude posts from our recovery community',
};

export default function WallPage() {
  return <WallPageClient />;
}
