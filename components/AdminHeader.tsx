'use client';

import {
  Avatar,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { Mail, Video, List, LogOut, User, Film, Music, FileAudio } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { firestoreAuth } from '@/firebase/firebase-config';

export default function AdminHeader() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firestoreAuth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(firestoreAuth);
    router.push('/');
  };

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/admin" className="text-xl font-bold text-neutral-900">
            grateful today <span className="text-xs text-neutral-500 ml-2">admin</span>
          </Link>

          {/* Admin Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/admin/newsletter/list"
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              <List className="w-4 h-4" />
              Newsletters
            </Link>
            <Link
              href="/admin/newsletter/generate"
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              <Mail className="w-4 h-4" />
              Generate
            </Link>
            <Link
              href="/admin/youtube/generate"
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              <Video className="w-4 h-4" />
              YouTube Generator
            </Link>
            <Link
              href="/admin/youtube/scripts"
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              <List className="w-4 h-4" />
              Scripts
            </Link>
            <Link
              href="/admin/audio/generate"
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              <Music className="w-4 h-4" />
              Audio
            </Link>
            <Link
              href="/admin/audio/transcribe"
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              <FileAudio className="w-4 h-4" />
              Transcribe
            </Link>
            <Link
              href="/admin/video-editor"
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              <Film className="w-4 h-4" />
              Video Editor
            </Link>
          </nav>

          {/* User Menu */}
          {user && (
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button variant="light" className="p-0 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-medium text-neutral-900">
                        {user.displayName || 'Admin'}
                      </p>
                      <p className="text-xs text-neutral-500">{user.email}</p>
                    </div>
                    <Avatar
                      src={user.photoURL || undefined}
                      name={user.displayName || user.email || 'A'}
                      size="sm"
                    />
                  </div>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="User menu">
                <DropdownItem
                  key="profile"
                  startContent={<User className="w-4 h-4" />}
                  textValue="Profile"
                >
                  <div>
                    <p className="font-medium">{user.displayName || 'Admin'}</p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  color="danger"
                  startContent={<LogOut className="w-4 h-4" />}
                  onPress={handleLogout}
                >
                  Logout
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  );
}
