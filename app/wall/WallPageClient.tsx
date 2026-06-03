'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, useDisclosure } from '@heroui/react';
import { HiPlus } from 'react-icons/hi';
import { useAuth } from '@/context/AuthUserContext';
import { GratitudePostForm } from '@/components/wall/GratitudePostForm';
import { GratitudeWall } from '@/components/wall/GratitudeWall';

export default function WallPageClient() {
  const { authUser: user, loading: authLoading } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

  const handlePostCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
    onClose();
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#9EADA0]/10 via-stone-50 to-[#78716c]/5">
      {/* Fixed Header with Logo and Add Button */}
      <div className="flex-shrink-0 bg-[#9EADA0] border-b border-white/20">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="hover:opacity-80 transition">
              <img
                src="/logo.svg"
                alt="Grateful Today"
                className="h-8 w-auto"
              />
            </a>
            <h1 className="text-xl font-semibold text-white tracking-wide">gratitude wall</h1>
          </div>
          
          {authLoading ? (
            <div className="h-10 w-32 sm:w-40 bg-white/10 rounded-full animate-pulse" />
          ) : user ? (
            <Button
              onPress={onOpen}
              className="bg-amber-200 hover:bg-amber-300 text-[#78716c] font-semibold shadow-sm hover:shadow-md transition-all rounded-full"
              startContent={<HiPlus className="w-5 h-5" />}
            >
              <span className="hidden sm:inline">add gratitude</span>
            </Button>
          ) : (
            <Button
              as="a"
              href="/newsletter"
              className="bg-amber-200 hover:bg-amber-300 text-[#78716c] font-semibold shadow-sm hover:shadow-md transition-all rounded-full"
            >
              join community
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Full Width Wall */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <GratitudeWall refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Drawer Modal - Left on Desktop, Bottom on Mobile */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="auto"
        size="lg"
        className="sm:max-w-md"
        classNames={{
          base: "sm:m-0 sm:rounded-r-3xl sm:rounded-l-none",
          wrapper: "items-start sm:items-stretch sm:justify-start",
        }}
        motionProps={{
          variants: {
            enter: {
              x: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              x: -50,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent className="bg-[#9EADA0]">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white">
                <h2 className="text-2xl font-bold">share your gratitude</h2>
                <p className="text-sm text-white/90">what are you grateful for today?</p>
              </ModalHeader>
              <ModalBody className="pb-6">
                <GratitudePostForm onPostCreated={handlePostCreated} />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
