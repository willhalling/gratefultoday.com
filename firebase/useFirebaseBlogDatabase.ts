import { firestoreAuth, firestoreDb } from './firebase-config';

import {
  serverTimestamp,
  doc,
  setDoc,
  addDoc,
  collection,
  deleteField,
  updateDoc,
} from 'firebase/firestore';


// import { TBlogPost } from '@/components/shared/blog/blog.types'

export const addBlogPost = async (post: any) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const uid = auth.currentUser.uid;
    try {
      await setDoc(
        doc(firestoreDb, 'posts', `${post.slug}`),
        {
          ...post,
          date_published: serverTimestamp(),
          author_uid: uid
        },
      );
    } catch (error) {
      throw error;
    }
  }
};

export const editBlogPost = async (post: any) => {
    const auth = firestoreAuth;
    if (auth && auth.currentUser) {
      const uid = auth.currentUser.uid;
      try {
        await setDoc(
          doc(firestoreDb, 'blog_posts', `${post.slug}`),
          {
            ...post,
            date_updated: serverTimestamp(),
            author_uid: uid
          },
          {
            merge: true,
          }
        );
      } catch (error) {
        throw error;
      }
    }
  };

/*
export const editChapter = async (name: string, order: number, videoId: string, chapterId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    try {
      await setDoc(
        doc(firestoreDb, 'videos', videoId, `chapters`, chapterId),
        {
          name: name
        },
        {
          merge: true,
        }
      );
    } catch (error) {
      throw error;
    }
  }
}; */