import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import RoomSound from './RoomSound';

export const metadata: Metadata = { title: 'Room sound (dev)', robots: { index: false, follow: false } };

/**
 * dev/room-sound — upload a recording and hear it in a real room (impulse
 * responses from roughclip, in public/dev-media/room-sound/, gitignored).
 * Internal only: the IRs' licences haven't been checked.
 */
export default function RoomSoundPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <RoomSound />;
}
