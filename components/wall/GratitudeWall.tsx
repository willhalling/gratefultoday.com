'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  startAfter,
  doc,
  updateDoc,
  increment,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { FaPrayingHands } from 'react-icons/fa';
import { HiArchive, HiFlag } from 'react-icons/hi';
import { Virtuoso } from 'react-virtuoso';
import { useAuth } from '@/context/AuthUserContext';
import { firestoreDb } from '@/firebase/firebase-config';
import type { GratitudePost } from '@/types/gratitude';
import { isAdmin } from '@/types/gratitude';

const POSTS_PER_PAGE = 50; // Load more for masonry layout

interface GratitudeWallProps {
  refreshTrigger?: number;
}

export function GratitudeWall({ refreshTrigger }: GratitudeWallProps) {
  const { authUser: user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<GratitudePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [view, setView] = useState<'all' | 'personal'>('all');
  const [switching, setSwitching] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'confirm',
  });
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const showModal = (
    title: string,
    message: string,
    type: 'info' | 'confirm' = 'info',
    action?: () => void
  ) => {
    setModalContent({ title, message, type });
    setPendingAction(action ? () => action : null);
    setModalOpen(true);
  };

  const handleModalConfirm = () => {
    if (pendingAction) {
      pendingAction();
    }
    setModalOpen(false);
    setPendingAction(null);
  };

  const formatRelativeTime = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'Just now';

    const date = 'toDate' in timestamp ? timestamp.toDate() : timestamp;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const handleFlag = async (postId: string) => {
    if (!user) {
      showModal('Sign In Required', 'Please sign in to flag posts');
      return;
    }

    showModal(
      'Flag Post',
      'Flag this post for review? This will help keep our community safe and supportive.',
      'confirm',
      async () => {
        try {
          const postRef = doc(firestoreDb, 'gratitudePosts', postId);
          const currentPost = posts.find((p) => p.id === postId);
          const newFlagCount = (currentPost?.flagCount || 0) + 1;

          // Only update flagCount and flagged together
          await updateDoc(postRef, {
            flagCount: increment(1),
            ...(newFlagCount >= 3 && { flagged: true }),
          });

          // Remove from local state if now flagged
          if (newFlagCount >= 3) {
            setPosts(posts.filter((p) => p.id !== postId));
          }
          showModal('Thank You', 'Thank you for helping keep our community safe.');
        } catch (error) {
          console.error('Error flagging post:', error);
          showModal('Error', 'Something went wrong. Please try again.');
        }
      }
    );
  };

  const handleArchive = async (postId: string) => {
    if (!user || !isAdmin(user.uid)) {
      showModal('Admin Required', 'Admin access required');
      return;
    }

    showModal(
      'Archive Post',
      'Archive this post? It will be hidden from the wall.',
      'confirm',
      async () => {
        try {
          const postRef = doc(firestoreDb, 'gratitudePosts', postId);
          await updateDoc(postRef, {
            isArchived: true,
          });

          // Remove from local state
          setPosts(posts.filter((p) => p.id !== postId));
          showModal('Success', 'Post archived successfully.');
        } catch (error) {
          console.error('Error archiving post:', error);
          showModal('Error', 'Something went wrong. Please try again.');
        }
      }
    );
  };

  const GratitudeCard = useMemo(() => {
    return ({ post, index }: { post: GratitudePost; index: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index < 10 ? index * 0.05 : 0 }}
        className="break-inside-avoid mb-4 group"
      >
        <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-neutral-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                style={{ backgroundColor: post.avatarColor }}
              >
                <FaPrayingHands className="w-4 h-4 text-white" />
              </div>
              {post.firstName && post.lastname && (
                <span className="text-sm text-neutral-700 font-medium">
                  {post.firstName} {post.lastname}.
                </span>
              )}
              <span className="text-xs text-neutral-500 font-medium">
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>
            <div className="flex gap-2">
              {user && isAdmin(user.uid) && (
                <button
                  onClick={() => handleArchive(post.id)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-stone-100 rounded-lg text-stone-600"
                  title="Archive post"
                >
                  <HiArchive className="w-4 h-4" />
                </button>
              )}
              {user && (
                <button
                  onClick={() => handleFlag(post.id)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-stone-100 rounded-lg text-stone-600"
                  title="Flag post"
                >
                  <HiFlag className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <p className="text-neutral-700 leading-relaxed mb-4 whitespace-pre-wrap break-words">
            {post.text}
          </p>

          {/* Prompt Tag */}
          {post.promptText && (
            <div className="text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-1.5 border border-neutral-100">
              {post.promptText}
            </div>
          )}
        </div>
      </motion.div>
    );
  }, [user, handleArchive, handleFlag, formatRelativeTime]);

  const loadMorePosts = useCallback(async () => {
    if (!lastDoc) return;
    setLoadingMore(true);

    try {
      const postsRef = collection(firestoreDb, 'gratitudePosts');
      let q;

      if (view === 'personal' && user) {
        q = query(
          postsRef,
          where('flagged', '==', false),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(POSTS_PER_PAGE)
        );
      } else {
        q = query(
          postsRef,
          where('flagged', '==', false),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(POSTS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(q);
      const newPosts = snapshot.docs
        .map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as GratitudePost
        )
        .filter((post) => !post.isArchived); // Filter out archived posts client-side

      setPosts([...posts, ...newPosts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, posts, view, user]);

  // Real-time listener for initial posts
  useEffect(() => {
    setSwitching(true);
    setLoading(true);

    const postsRef = collection(firestoreDb, 'gratitudePosts');
    let q;

    if (view === 'personal' && user) {
      q = query(
        postsRef,
        where('flagged', '==', false),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(POSTS_PER_PAGE)
      );
    } else {
      q = query(
        postsRef,
        where('flagged', '==', false),
        orderBy('createdAt', 'desc'),
        limit(POSTS_PER_PAGE)
      );
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newPosts = snapshot.docs
          .map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              }) as GratitudePost
          )
          .filter((post) => !post.isArchived); // Filter out archived posts client-side

        setPosts(newPosts);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
        setLoading(false);
        setSwitching(false);
      },
      (error) => {
        console.error('Error loading posts:', error);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, view, user]);

  if (loading) {
    return (
      <div>
        {/* View Toggle - Show during loading if user exists or auth is loading */}
        {(user || authLoading) && (
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={() => setView('all')}
              className={`text-sm font-medium transition-colors ${
                view === 'all'
                  ? 'text-[#78716c] underline underline-offset-4'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => setView('personal')}
              className={`text-sm font-medium transition-colors ${
                view === 'personal'
                  ? 'text-[#78716c] underline underline-offset-4'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              My Posts
            </button>
          </div>
        )}

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="break-inside-avoid mb-4 bg-stone-50 rounded-2xl p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-neutral-200" />
                <div className="h-3 w-16 bg-neutral-200 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-neutral-200 rounded w-full" />
                <div className="h-3 bg-neutral-200 rounded w-5/6" />
                <div className="h-3 bg-neutral-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm">
          <p className="text-neutral-700 text-lg font-medium mb-1">No posts yet</p>
          <p className="text-neutral-500 text-sm">Be the first to share your gratitude</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* View Toggle */}
      {user && (
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setView('all')}
            className={`text-sm font-medium transition-colors ${
              view === 'all'
                ? 'text-[#78716c] underline underline-offset-4'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            All Posts
          </button>
          <button
            onClick={() => setView('personal')}
            className={`text-sm font-medium transition-colors ${
              view === 'personal'
                ? 'text-[#78716c] underline underline-offset-4'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            My Posts
          </button>
        </div>
      )}

      {/* Masonry Grid with Virtualization */}
      <div className="min-h-[400px]">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {posts.map((post, index) => (
            <GratitudeCard key={post.id} post={post} index={index} />
          ))}
        </div>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMorePosts}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-[#78716c] hover:bg-[#78716c]/90 text-white text-sm font-semibold rounded-full transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading...' : 'Load More Gratitudes'}
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">{modalContent.title}</ModalHeader>
          <ModalBody>
            <p>{modalContent.message}</p>
          </ModalBody>
          <ModalFooter>
            {modalContent.type === 'confirm' ? (
              <>
                <Button color="default" variant="light" onPress={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleModalConfirm}>
                  Confirm
                </Button>
              </>
            ) : (
              <Button color="primary" onPress={() => setModalOpen(false)}>
                OK
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
