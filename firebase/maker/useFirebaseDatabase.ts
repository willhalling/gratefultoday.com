// @ts-nocheck
import { firestoreAuth, firestoreDb, updateProfile } from '@/firebase/firebase-config';

import {
  serverTimestamp,
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

import { uniqueID, slugify } from '@/utils/maker/helpers';

import { MIN_TEXT_SLIDE_DURATION } from '@/config/maker/config'
import { BLACK_PLACEHOLDER } from '@/config/maker/config'

import { TEMPLATES_ALL } from '../../constants/templates-all';

const ADMIN_UID = 'OuPXRURBSOQzqhylS9MWgaPBYJw2';

import {
  calculateMovieDuration,
  calculateSlideDuration
} from '@/utils/remotion';

// Import shared duration calculator for consistency
import { buildInputProps } from '@/lib/shared-input-props';
import { TSlide, TMyComp } from '@/components/maker/media/media.types';
import { TAudioItem } from '@/components/maker/audio/audio.types';

import { TAudioItem } from '@/components/maker/audio/audio.types'


import { TConfig, TVideoDocument } from '@/components/maker/media/media.types';
import { SelectedTemplate } from '@/utils/template-selection';

const delCollectionDoc = async (col: any, id: any) => {
  const docRef = doc(firestoreDb, col, id);
  return await deleteDoc(docRef);
};

export const addVideo = async (name: string, outroText: string, source?: 'funeralcollage' | 'easyslideshow') => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const uid = auth.currentUser.uid;
    let updatedVideoId = `${slugify(name)}-${uniqueID()}`;

    // Get user's selected template or fall back to default
    let selectedTemplate = TEMPLATES_ALL[2]; // Default fallback

    const slideVideo = {
      // General settings
      config: {
        template: selectedTemplate.template,
        templateBackgroundImage: selectedTemplate.templateBackgroundImage,
        outroType: 'collage-outro',
        main: {
          templateFontColor: "#ffffff",
          templateFontBackgroundColor: "transparent"
        },
        sub: {
          templateFontColor: "#ffffff",
          templateFontBackgroundColor: "transparent"
        },
      },
      // Intro slide object
      introSlide: {
        id: `intro-${uniqueID()}`,
        type: 'intro',
        url: BLACK_PLACEHOLDER,
        durationInFrames: 330, // Default: 10 secs with transition offset (10 * 30fps)
        mainText: 'Celebrating the life of',
        subText: name
      },
      // Outro slide object
      outroSlide: {
        id: `outro-${uniqueID()}`,
        type: 'collage-outro',
        url: BLACK_PLACEHOLDER,
        durationInFrames: 330, // Default: 10 secs with transition offset (10 * 30fps)
        mainText: 'Thank you for watching',
        subText: outroText,
      },
      dateCreated: serverTimestamp(),
      dateUpdated: serverTimestamp(),
      authorUid: uid,
      id: updatedVideoId,
      status: 'draft',
      source: source || 'funeralcollage' // Default to funeralcollage if not provided
    };
    // @ts-ignore
    try {
      await setDoc(
        doc(firestoreDb, 'videos', updatedVideoId),
        {
          ...slideVideo,
          roles: {
            [uid]: 'owner',
            [uid !== ADMIN_UID ? ADMIN_UID : null]: `${uid !== ADMIN_UID ? 'owner' : null
              }`,
          },
        },
        { merge: true }
      );
      // Update the user's display name with the updatedVideoId
      /*
      await updateProfile(auth.currentUser, {
        displayName: updatedVideoId,
      }); */
      return updatedVideoId;
    } catch (error) {
      throw error;
    }
  }
};

export const addVideoKey = async (videoId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const uid = auth.currentUser.uid;
    // Add a new document with a generated id.
    try {
      await setDoc(doc(firestoreDb, 'users', uid, `video_keys`, videoId), {
        dateCreated: serverTimestamp(),
        videoId: videoId,
      });
    } catch (error) {
      throw error;
    }
  }
};

export const getUserVideo = async (videoId: string) => {
  try {
    const docRef = doc(firestoreDb, 'videos', videoId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const videoData = docSnap.data();
      return videoData;
    } else {
      throw new Error('No such document!');
    }
  } catch (error) {
    console.log('error', error)
    throw error;
  }
};

export const updateConfig = async (
  videoId: string,
  config: TConfig
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    try {
      return await setDoc(
        doc(firestoreDb, 'videos', videoId),
        {
          dateUpdated: serverTimestamp(),
          config: config,
        },
        {
          merge: true,
        }
      );
    } catch (error) {
      console.warn(error)
      throw error;
    }
  }
};

// update video date_modified 
export const updateVideo = async (videoId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const videoRef = doc(firestoreDb, 'videos', videoId);
    try {
      await updateDoc(videoRef, {
        dateUpdated: serverTimestamp(),
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// Update video status (e.g., from paid to draft for re-editing)
export const updateVideoStatus = async (videoId: string, status: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const videoRef = doc(firestoreDb, 'videos', videoId);
    try {
      await updateDoc(videoRef, {
        status: status,
        dateUpdated: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error updating video status:', error);
      throw error;
    }
  } else {
    throw new Error('User not authenticated');
  }
};

// @TODO: v similar to updateSubtitles, may be able to merge later
// Update intro/outro slides
export const updateIntroOutroSlides = async (
  videoId: string,
  introSlideId?: string | null,
  outroSlideId?: string | null
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const videoRef = doc(firestoreDb, 'videos', videoId);
    try {
      const updateData: any = {
        dateUpdated: serverTimestamp(),
      };

      // Helper function to find a slide in the slides collection
      const findSlideInCollection = async (slideId: string) => {
        try {
          const slideRef = doc(firestoreDb, 'videos', videoId, 'slides', slideId);
          const slideDoc = await getDoc(slideRef);
          if (slideDoc.exists()) {
            console.log(`Found slide ${slideId} in slides collection`);
            return slideDoc.data();
          }
        } catch (error) {
          console.log(`Slide ${slideId} not found in slides collection`);
        }
        return null;
      };

      // If intro slide ID is provided, find the slide data
      if (introSlideId !== undefined) {
        if (introSlideId) {
          const introSlideData = await findSlideInCollection(introSlideId);
          if (introSlideData) {
            updateData.introSlide = introSlideData;
            updateData.introSlideId = introSlideId;
          } else {
            console.error(`Intro slide ${introSlideId} not found`);
          }
        } else {
          // If null, clear the intro slide
          updateData.introSlide = null;
          updateData.introSlideId = null;
        }
      }

      // If outro slide ID is provided, find the slide data
      if (outroSlideId !== undefined) {
        if (outroSlideId) {
          const outroSlideData = await findSlideInCollection(outroSlideId);
          if (outroSlideData) {
            updateData.outroSlide = outroSlideData;
            updateData.outroSlideId = outroSlideId;
          } else {
            console.error(`Outro slide ${outroSlideId} not found`);
          }
        } else {
          // If null, clear the outro slide
          updateData.outroSlide = null;
          updateData.outroSlideId = null;
        }
      }

      await updateDoc(videoRef, updateData);
      console.log('Successfully updated intro/outro slides:', updateData);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// Update intro/outro text
export const updateIntroOutroText = async (
  videoId: string,
  slideType: 'intro' | 'outro',
  heading?: string,
  mainText?: string
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const videoRef = doc(firestoreDb, 'videos', videoId);
    try {
      const updateData: any = {
        dateUpdated: serverTimestamp(),
      };

      // Update the appropriate slide object's text fields with correct property names
      const slideField = slideType === 'intro' ? 'introSlide' : 'outroSlide';

      if (heading !== undefined) {
        updateData[`${slideField}.mainText`] = heading;
      }
      if (mainText !== undefined) {
        updateData[`${slideField}.subText`] = mainText;
      }

      await updateDoc(videoRef, updateData);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// Update intro/outro styles in their respective slide documents
export const updateIntroOutroStyles = async (
  videoId: string,
  slideType: 'intro' | 'outro',
  styles: {
    headingFontFamily?: string;
    mainTextFontFamily?: string;
    headingFontSize?: number;
    mainTextFontSize?: number;
    headingStyle?: Record<string, any>;
    mainTextStyle?: Record<string, any>;
  }
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const videoRef = doc(firestoreDb, 'videos', videoId);
    try {
      const updateData: any = {
        dateUpdated: serverTimestamp(),
      };

      // Update the appropriate slide object's styles
      const slideField = slideType === 'intro' ? 'introSlide' : 'outroSlide';

      // Build the nested styles object to match TIntroOutroSlide type
      const stylesUpdate: any = {
        main: {},
        sub: {}
      };

      if (styles.headingFontFamily !== undefined) {
        stylesUpdate.main.fontFamily = styles.headingFontFamily;
      }
      if (styles.headingFontSize !== undefined) {
        stylesUpdate.main.fontSize = styles.headingFontSize;
      }
      if (styles.mainTextFontFamily !== undefined) {
        stylesUpdate.sub.fontFamily = styles.mainTextFontFamily;
      }
      if (styles.mainTextFontSize !== undefined) {
        stylesUpdate.sub.fontSize = styles.mainTextFontSize;
      }

      // Update the styles object within the slide
      updateData[`${slideField}.styles`] = stylesUpdate;

      await updateDoc(videoRef, updateData);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// Update intro/outro slide media (image URLs)
export const updateIntroOutroSlideMedia = async (
  videoId: string,
  slideType: 'intro' | 'outro',
  newUrl: string,
  newImageUrl?: string
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const videoRef = doc(firestoreDb, 'videos', videoId);
    try {
      const updateData: any = {
        dateUpdated: serverTimestamp(),
      };

      // Update the appropriate slide object
      const slideField = slideType === 'intro' ? 'introSlide' : 'outroSlide';
      updateData[`${slideField}.url`] = newUrl;

      await updateDoc(videoRef, updateData);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// Update intro/outro slide duration
export const updateIntroOutroDuration = async (
  videoId: string,
  slideType: 'intro' | 'outro',
  durationInFrames: number
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const videoRef = doc(firestoreDb, 'videos', videoId);
    try {
      const updateData: any = {
        dateUpdated: serverTimestamp(),
      };

      // Update the appropriate slide object with both legacy and new duration fields
      const slideField = slideType === 'intro' ? 'introSlide' : 'outroSlide';
      const durationInSeconds = Math.round(durationInFrames / 30);

      updateData[`${slideField}.durationInFrames`] = durationInFrames;
      updateData[`${slideField}.duration`] = durationInSeconds; // Keep legacy field for backward compatibility

      await updateDoc(videoRef, updateData);
      console.log(`Successfully updated ${slideType} duration:`, {
        durationInFrames,
        durationInSeconds
      });
      return true;
    } catch (error) {
      console.error(`Error updating ${slideType} duration:`, error);
      throw error;
    }
  }
};

export const updateSlideContent = async (
  videoId: string,
  slideId: string,
  content: any,
  fieldName?: string = 'subtitles'
) => {
  const auth = firestoreAuth;

  if (auth && auth.currentUser && slideId) {
    try {
      await setDoc(
        doc(firestoreDb, 'videos', videoId, 'slides', slideId),
        {
          [fieldName]: content
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

export const addAudio = async (
  videoId: string,
  audioDoc: {
    url: string;
    reference: string;
    id: string;
  },
  duration: number,
  fileName: string,
  durationInFrames: number
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const uid = auth.currentUser.uid;
    const audio = {
      dateUpdated: serverTimestamp(),
      authorUid: uid,
      duration,
      fileName: fileName,
      durationInFrames,
      ...audioDoc,
    };
    // @ts-ignore
    try {
      // Save the audio document
      await setDoc(
        doc(firestoreDb, 'videos', videoId, 'audio', `audio_${audioDoc.id}`),
        {
          ...audio,
        },
        {
          merge: true,
        }
      );

      // Update audio_order array to include this new audio at the end
      const currentAudioOrder = await getAudioOrder(videoId) as string[];
      const newAudioOrder = [...currentAudioOrder, `audio_${audioDoc.id}`];
      await updateAudioOrder(videoId, newAudioOrder);

      return true;
    } catch (error) {
      throw error;
    }
  }
};

export const addLibraryAudio = async (
  videoId: string,
  audio: TAudioItem
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const uid = auth.currentUser.uid;
    // @ts-ignore
    try {
      // Save the audio document ensuring authorUid is set to current user
      await setDoc(
        doc(firestoreDb, 'videos', videoId, 'audio', `audio_${audio.id}`),
        {
          ...audio,
          authorUid: uid, // Ensure authorUid is set to current user
          dateUpdated: serverTimestamp() // Update the timestamp
        },
        {
          merge: true,
        }
      );

      // Get the current audioOrder, ensuring it's initialized if undefined
      const currentAudioOrder = await getAudioOrder(videoId) as string[];
      console.log('Current audioOrder before adding library audio:', currentAudioOrder);

      // Ensure audioOrder is always an array
      const audioOrderArray = Array.isArray(currentAudioOrder) ? currentAudioOrder : [];
      const newAudioOrder = [...audioOrderArray, `audio_${audio.id}`];

      console.log('New audioOrder after adding library audio:', newAudioOrder);
      await updateAudioOrder(videoId, newAudioOrder);

      return true;
    } catch (error) {
      throw error;
    }
  }
};

export const updateAudioSettings = async (
  videoId: string,
  audioId: string,
  settings: {
    startFrame?: number;
    endFrame?: number;
    volume?: number;
    loopCount?: number;
    fadeIn?: boolean;
    fadeOut?: boolean;
    fadeDuration?: 'quick' | 'standard' | 'smooth';
  }
) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    try {
      console.log('🔥 Firebase updateAudioSettings called:', {
        videoId,
        audioId,
        settings,
        docPath: `videos/${videoId}/audio/audio_${audioId}`
      });

      await updateDoc(
        doc(firestoreDb, 'videos', videoId, 'audio', `audio_${audioId}`),
        settings
      );

      console.log('🔥 Firebase updateDoc completed successfully:', {
        videoId,
        audioId,
        settingsSaved: settings
      });

      return true;
    } catch (error) {
      console.error('Error updating audio settings:', error);
      throw error;
    }
  }
};

export const addMusic = async (audio: {
  durationInFrames: number;
  fileName: string;
  id: string;
  url: string;
  type: string;
  tags: Array<string>;
}) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const uid = auth.currentUser.uid;
    const updatedAudio = {
      dateAdded: serverTimestamp(),
      authorUid: uid,
      ...audio,
    };
    // @ts-ignore
    try {
      return await setDoc(
        doc(firestoreDb, 'music', updatedAudio.id),
        {
          ...updatedAudio,
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


export const addStandardSlide = async (
  url: string,
  width: number,
  height: number,
  name: string,
  videoId: string,
) => {
  const auth = firestoreAuth;
  const slideId = `image_${name}`;
  if (auth && auth.currentUser) {
    const slideImage = {
      id: slideId,
      dateUpdated: serverTimestamp(),
      fileName: name,
      zoom: {
        x: width / 2, // center zoom by default
        y: height / 2,
      },
      width,
      height,
      type: 'image',
      url: `${url}?v=${uniqueID()}`
    };

    // @ts-ignore
    try {
      await setDoc(
        doc(firestoreDb, 'videos', videoId, 'slides', slideId),
        {
          ...slideImage,
        },
        { merge: true }
      );
      return name;
    } catch (error) {
      throw error;
    }
  }
};

export const addStandardVideoSlide = async (
  url: string,
  videoUrl: string,
  width: number,
  height: number,
  name: string,
  duration: number,
  videoId: string,
) => {
  const auth = firestoreAuth;
  const slideId = `video_${name}`;
  if (auth && auth.currentUser) {
    const videoDurationInSeconds = Math.round(duration);
    const durationInFrames = videoDurationInSeconds * 30;

    // All videos are treated as completed since no conversion is needed
    const conversionStatus = 'completed';

    const slideImage = {
      id: slideId,
      dateUpdated: serverTimestamp(),
      zoom: {
        x: width / 2, // center zoom by default
        y: height / 2,
      },
      width,
      height,
      durationInFrames,
      type: 'video',
      url: `${url}?v=${uniqueID()}`,
      videoUrl: `${videoUrl}`,
      conversionStatus
    };

    // @ts-ignore
    try {
      await setDoc(
        doc(firestoreDb, 'videos', videoId, 'slides', slideId),
        {
          ...slideImage,
        },
        { merge: true }
      );
      return name;
    } catch (error) {
      throw error;
    }
  }
};

export const updateSlideMedia = async (videoId: string, updatedSlide: any) => {
  const auth = firestoreAuth;
  return new Promise(async (resolve) => {
    if (auth && auth.currentUser) {
      // All video slides are treated as completed
      if (updatedSlide.type === 'video' && updatedSlide.videoUrl) {
        updatedSlide.conversionStatus = 'completed';
      }

      await setDoc(
        doc(
          firestoreDb,
          'videos',
          videoId,
          'slides',
          updatedSlide.id
        ),
        {
          dateUpdated: serverTimestamp(),
          ...updatedSlide
        },
        { merge: true }
      );
      resolve(true);
    }
  });
};

export const updateOrder = async (
  videoId: string,
  slidesOrdering: Array<String>
) => {
  const auth = firestoreAuth;
  console.log('videoId', videoId);
  console.log('slidesOrdering', slidesOrdering);
  return new Promise(async (resolve) => {
    if (auth && auth.currentUser) {
      await setDoc(
        doc(firestoreDb, 'videos', videoId),
        {
          slidesOrder: slidesOrdering,
        },
        {
          merge: true,
        }
      );
      resolve(true);
    }
  });
};

export const updateAudioOrder = async (
  videoId: string,
  audioOrdering: Array<String>
) => {
  const auth = firestoreAuth;
  console.log('updateAudioOrder - videoId:', videoId);
  console.log('updateAudioOrder - audioOrdering:', audioOrdering);

  return new Promise(async (resolve) => {
    if (auth && auth.currentUser) {
      try {
        await setDoc(
          doc(firestoreDb, 'videos', videoId),
          {
            audioOrder: audioOrdering,
          },
          {
            merge: true,
          }
        );
        console.log('updateAudioOrder - Successfully updated audioOrder in database');
        resolve(true);
      } catch (error) {
        console.error('updateAudioOrder - Error updating audioOrder:', error);
        resolve(false);
      }
    } else {
      console.error('updateAudioOrder - User not authenticated');
      resolve(false);
    }
  });
};

export const removeSlide = async (videoId: string, slideId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    try {
      return await deleteDoc(
        doc(firestoreDb, 'videos', videoId, 'slides', slideId)
      );
    } catch (error) {
      throw error;
    }
  }
};

export const removeAudio = async (videoId: string, audioId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    try {
      // Remove the audio document
      await deleteDoc(
        doc(firestoreDb, 'videos', videoId, 'audio', audioId)
      );

      // Update audio_order array to remove this audio ID
      const currentAudioOrder = await getAudioOrder(videoId) as string[];
      const newAudioOrder = currentAudioOrder.filter(id => id !== audioId);
      await updateAudioOrder(videoId, newAudioOrder);

      return true;
    } catch (error) {
      throw error;
    }
  }
};

export const removeSlidesOrder = async (videoId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    try {
      return await delCollectionDoc(
        `videos/${videoId}/slides-order/`,
        'byUserOrder'
      );
    } catch (error) {
      throw error;
    }
  }
};

export const removeSlideAudio = async (videoId: string, id: any) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    try {
      // Use the new removeAudio function - it expects the document ID (audio_${id})
      return await removeAudio(videoId, `audio_${id}`);
    } catch (error) {
      throw error;
    }
  }
};

export const reorderAudio = async (videoId: string, audioDocs: any) => {
  const auth = firestoreAuth;

  const collectionRef = collection(firestoreDb, `videos/${videoId}/audio`);

  if (auth && auth.currentUser) {
    try {
      // Fetch the documents from the collection
      const querySnapshot = await getDocs(collectionRef);

      // Create an array of promises to update the documents
      const updatePromises = [];

      audioDocs.forEach(async (audio, index) => {
        if (audio.id) {
          const updatePromise = await setDoc(
            doc(firestoreDb, 'videos', videoId, 'audio', `audio_${audio.id}`),
            {
              dateUpdated: serverTimestamp(),
              order: index,
            },
            { merge: true }
          );
          updatePromises.push(updatePromise);
        }
      });

      // Wait for all update promises to complete
      await Promise.all(updatePromises);

    } catch (error) {
      console.error('Error updating order:', error);
    }
  }
};

export const removeVideo = async (videoId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    try {
      return await delCollectionDoc('videos/', videoId);
    } catch (error) {
      throw error;
    }
  }
};

export const archiveVideo = async (videoId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const uid = auth.currentUser.uid;
    try {
      // 1. Update the main video document with isArchived flag
      const videoDocRef = doc(firestoreDb, 'videos', videoId);
      await updateDoc(videoDocRef, {
        isArchived: true,
        archivedAt: serverTimestamp(),
        archivedBy: uid,
        dateUpdated: serverTimestamp()
      });

      // 2. Remove the video_key document from user's collection (hides from dashboard)
      await deleteDoc(doc(firestoreDb, 'users', uid, 'video_keys', videoId));

      console.log(`Successfully archived video ${videoId}`);

      return { success: true };
    } catch (error) {
      console.error('Error archiving video:', error);
      throw error;
    }
  }
};

export const getSlideOrder = (videoId: string) => {
  return new Promise(async (resolve) => {
    const videoDocRef = doc(firestoreDb, 'videos', videoId);
    const videoDocSnap = await getDoc(videoDocRef);

    if (videoDocSnap.exists()) {
      const videoData = videoDocSnap.data();
      const slidesOrder = videoData?.slidesOrder || []; // Assuming 'slides_order' is an array field

      resolve(slidesOrder);
    } else {
      resolve([]); // Return an empty array if the document doesn't exist
    }
  });
};

export const getAudioOrder = (videoId: string) => {
  return new Promise(async (resolve) => {
    try {
      const videoDocRef = doc(firestoreDb, 'videos', videoId);
      const videoDocSnap = await getDoc(videoDocRef);

      if (videoDocSnap.exists()) {
        const videoData = videoDocSnap.data();
        const audioOrder = videoData?.audioOrder;

        console.log('getAudioOrder - videoData.audioOrder:', audioOrder);

        // Ensure we always return an array
        if (Array.isArray(audioOrder)) {
          resolve(audioOrder);
        } else {
          console.log('audioOrder is not an array or undefined, initializing as empty array');
          resolve([]);
        }
      } else {
        console.log('Video document does not exist, returning empty audioOrder');
        resolve([]); // Return an empty array if the document doesn't exist
      }
    } catch (error) {
      console.error('Error getting audioOrder:', error);
      resolve([]); // Return empty array on error
    }
  });
};

export const getTemplates = () => {
  return new Promise(async (resolve) => {
    const templatesQuery = query(collection(firestoreDb, 'templates'));
    const templateSnap = await getDocs(templatesQuery);
    const templates = templateSnap.docs.map((doc) => {
      return {
        ...doc.data(),
      };
    });
    resolve(templates)
  });
};

export const getTemplateById = async (templateId) => {
  const templatesQuery = query(collection(firestoreDb, 'templates'), where('id', '==', templateId));
  const templateSnap = await getDocs(templatesQuery);

  if (templateSnap.docs.length === 1) {
    const templateDoc = templateSnap.docs[0];
    return templateDoc.data();
  } else {
    return null; // Return null or handle the case where no or multiple documents match the template ID
  }
};

// New function to get slideshow templates from Firestore
export const getSlideshowTemplates = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const templatesQuery = query(
        collection(firestoreDb, 'slideshow_templates'),
        where('active', '==', true)
      );
      const templateSnap = await getDocs(templatesQuery);
      const templates = templateSnap.docs.map((doc) => {
        const data = doc.data();
        // Fields are now camelCase in Firestore after migration
        return {
          id: data.id,
          template: data.template,
          templateBackgroundImage: data.templateBackgroundImage,
          templateBackgroundColor: data.templateBackgroundColor,
          templateFontColor: data.templateFontColor,
          templateFontBackgroundColor: data.templateFontBackgroundColor,
          slideBackgroundImage: data.slideBackgroundImage,
          name: data.name,
          description: data.description,
          category: data.category,
          type: data.type,
          tags: data.tags,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          showBorder: data.showBorder, // Add showBorder field
          // Include nested color structures if they exist
          main: data.main || {
            templateFontColor: data.mainTemplateFontColor || data.templateFontColor,
            templateFontBackgroundColor: data.mainTemplateFontBackgroundColor || data.templateFontBackgroundColor,
          },
          sub: data.sub || {
            templateFontColor: data.subTemplateFontColor || data.templateFontColor,
            templateFontBackgroundColor: data.subTemplateFontBackgroundColor || 'transparent',
          }
        };
      });
      resolve(templates);
    } catch (error) {
      console.error('Error fetching slideshow templates:', error);
      reject(error);
    }
  });
};

// Function to get user's custom templates
export const getUserTemplates = (userId: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Simplified query to avoid index requirement
      const templatesQuery = query(
        collection(firestoreDb, 'user_templates'),
        where('userId', '==', userId),
        where('active', '==', true)
        // Remove orderBy for now to avoid index requirement
      );
      const templateSnap = await getDocs(templatesQuery);
      const templates = templateSnap.docs.map((doc) => {
        const data = doc.data();
        // Fields are now camelCase in Firestore after migration
        return {
          id: data.id,
          template: data.template,
          templateBackgroundImage: data.templateBackgroundImage,
          templateBackgroundColor: data.templateBackgroundColor,
          templateFontColor: data.templateFontColor,
          templateFontBackgroundColor: data.templateFontBackgroundColor,
          slideBackgroundImage: data.slideBackgroundImage,
          name: data.name,
          description: data.description,
          category: data.category,
          tags: data.tags,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          userId: data.userId,
          showBorder: data.showBorder, // Add showBorder field
          // Include nested color structure if present
          main: data.main,
          sub: data.sub,
          // Include template type if present
          type: data.type,
        };
      });

      // Sort by createdAt on the client side instead
      const sortedTemplates = templates.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });

      resolve(sortedTemplates);
    } catch (error) {
      console.error('Error fetching user templates:', error);
      reject(error);
    }
  });
};

// Function to create a new user template
export const createUserTemplate = async (userId: string, templateData: any, imageFile: File) => {
  try {
    const auth = firestoreAuth;
    if (!auth || !auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Import Firebase Storage functions and get storage instance
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('@/firebase/firebase-config');

    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }

    const imageRef = ref(storage, `user-templates/${userId}/${Date.now()}_${imageFile.name}`);
    const uploadResult = await uploadBytes(imageRef, imageFile);
    const imageUrl = await getDownloadURL(uploadResult.ref);

    // Create template document (using camelCase fields after migration)
    const templateId = `user_${userId}_${Date.now()}`;
    const templateDoc = {
      id: templateId,
      template: templateData.template,
      templateBackgroundImage: imageUrl,
      templateBackgroundColor: templateData.templateBackgroundColor,
      templateFontColor: templateData.templateFontColor,
      templateFontBackgroundColor: templateData.templateFontBackgroundColor,
      slideBackgroundImage: imageUrl,
      name: templateData.name,
      description: templateData.description,
      category: 'custom',
      tags: ['custom', 'user-created'],
      userId: userId,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Add template type if provided
      type: templateData.type || 'user-custom',
      // Add AI metadata if provided (only if not undefined)
      ...(templateData.aiGenerated !== undefined && { aiGenerated: templateData.aiGenerated }),
      ...(templateData.prompt !== undefined && { prompt: templateData.prompt }),
      // Add suggested colors if provided
      ...(templateData.suggestedColours !== undefined && { suggestedColours: templateData.suggestedColours }),
    };

    // Only add nested color structure if provided and not undefined
    if (templateData.main && typeof templateData.main === 'object') {
      templateDoc.main = {};
      if (templateData.main.templateFontColor !== undefined) {
        templateDoc.main.templateFontColor = templateData.main.templateFontColor;
      }
      if (templateData.main.templateFontBackgroundColor !== undefined) {
        templateDoc.main.templateFontBackgroundColor = templateData.main.templateFontBackgroundColor;
      }
    }

    if (templateData.sub && typeof templateData.sub === 'object') {
      templateDoc.sub = {};
      if (templateData.sub.templateFontColor !== undefined) {
        templateDoc.sub.templateFontColor = templateData.sub.templateFontColor;
      }
      if (templateData.sub.templateFontBackgroundColor !== undefined) {
        templateDoc.sub.templateFontBackgroundColor = templateData.sub.templateFontBackgroundColor;
      }
    }

    // Save to Firestore
    const docRef = doc(firestoreDb, 'user_templates', templateId);
    await setDoc(docRef, templateDoc);

    // Return the created template in camelCase format (now matches Firestore)
    return {
      id: templateDoc.id,
      template: templateDoc.template,
      templateBackgroundImage: templateDoc.templateBackgroundImage,
      templateBackgroundColor: templateDoc.templateBackgroundColor,
      templateFontColor: templateDoc.templateFontColor,
      templateFontBackgroundColor: templateDoc.templateFontBackgroundColor,
      slideBackgroundImage: templateDoc.slideBackgroundImage,
      name: templateDoc.name,
      description: templateDoc.description,
      category: templateDoc.category,
      tags: templateDoc.tags,
      userId: templateDoc.userId,
      createdAt: templateDoc.createdAt,
      updatedAt: templateDoc.updatedAt,
      // Include nested color structure and metadata
      main: templateDoc.main,
      sub: templateDoc.sub,
      type: templateDoc.type,
      aiGenerated: templateDoc.aiGenerated,
      prompt: templateDoc.prompt,
    };

  } catch (error) {
    console.error('Error creating user template:', error);
    throw error;
  }
};

// Function to delete a user template
export const deleteUserTemplate = async (userId: string, templateId: string) => {
  try {
    const auth = firestoreAuth;
    if (!auth || !auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // First, get the template document to access the image URL
    const templateDoc = await getDoc(doc(firestoreDb, 'user_templates', templateId));

    if (!templateDoc.exists()) {
      throw new Error('Template not found');
    }

    const templateData = templateDoc.data();

    // Verify the template belongs to the current user
    if (templateData.userId !== userId) {
      throw new Error('Unauthorized: Template does not belong to this user');
    }

    // Only delete the image from Firebase Storage if it's NOT an AI-generated template
    const isAIGenerated = templateData.aiGenerated === true ||
      templateData.templateBackgroundImage?.includes('fal.media') ||
      templateData.name?.startsWith('AI:') ||
      templateData.name?.startsWith('AI Generated:');

    if (templateData.templateBackgroundImage && !isAIGenerated) {
      try {
        const { ref, deleteObject } = await import('firebase/storage');
        const { storage } = await import('@/firebase/firebase-config');

        if (storage) {
          const imageRef = ref(storage, templateData.templateBackgroundImage);
          await deleteObject(imageRef);
        }
      } catch (storageError) {
        console.warn('Error deleting template image from storage:', storageError);
        // Continue with document deletion even if storage deletion fails
      }
    } else if (isAIGenerated) {
      console.log(`Preserving AI-generated image for template "${templateData.name}" - image may be used by other users`);
    }

    // Delete the template document from Firestore (removes from user's personal collection)
    await deleteDoc(doc(firestoreDb, 'user_templates', templateId));

    return { success: true, message: 'Template deleted successfully' };

  } catch (error) {
    console.error('Error deleting user template:', error);
    throw error;
  }
};

// Function to update a user template (for color modifications)
export const updateUserTemplate = async (userId: string, templateId: string, updates: Partial<any>) => {
  try {
    const auth = firestoreAuth;
    if (!auth || !auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // First, verify the template belongs to the current user
    const templateDoc = await getDoc(doc(firestoreDb, 'user_templates', templateId));

    if (!templateDoc.exists()) {
      throw new Error('Template not found');
    }

    const templateData = templateDoc.data();

    if (templateData.userId !== userId) {
      throw new Error('Unauthorized: Template does not belong to this user');
    }

    // Prepare updates with camelCase keys for Firestore (after migration)
    const firestoreUpdates: any = {
      updatedAt: serverTimestamp(),
    };

    // Map camelCase keys to camelCase for Firestore (no conversion needed after migration)
    if (updates.templateBackgroundColor !== undefined) {
      firestoreUpdates.templateBackgroundColor = updates.templateBackgroundColor;
    }
    if (updates.templateFontColor !== undefined) {
      firestoreUpdates.templateFontColor = updates.templateFontColor;
    }
    if (updates.templateFontBackgroundColor !== undefined) {
      firestoreUpdates.templateFontBackgroundColor = updates.templateFontBackgroundColor;
    }
    if (updates.name !== undefined) {
      firestoreUpdates.name = updates.name;
    }
    if (updates.description !== undefined) {
      firestoreUpdates.description = updates.description;
    }

    // Handle nested main/sub color structure (new format)
    if (updates.main !== undefined) {
      firestoreUpdates.main = updates.main;
    }
    if (updates.sub !== undefined) {
      firestoreUpdates.sub = updates.sub;
    }

    // Update the template document
    const docRef = doc(firestoreDb, 'user_templates', templateId);
    await updateDoc(docRef, firestoreUpdates);

    // Return the updated template data
    const updatedDoc = await getDoc(docRef);
    const updatedData = updatedDoc.data();

    return {
      id: updatedData?.id,
      template: updatedData?.template,
      templateBackgroundImage: updatedData?.templateBackgroundImage,
      templateBackgroundColor: updatedData?.templateBackgroundColor,
      templateFontColor: updatedData?.templateFontColor,
      templateFontBackgroundColor: updatedData?.templateFontBackgroundColor,
      slideBackgroundImage: updatedData?.slideBackgroundImage,
      name: updatedData?.name,
      description: updatedData?.description,
      category: updatedData?.category,
      tags: updatedData?.tags,
      userId: updatedData?.userId,
      createdAt: updatedData?.createdAt,
      updatedAt: updatedData?.updatedAt,
      // Include nested color structure if present
      main: updatedData?.main,
      sub: updatedData?.sub,
    };

  } catch (error) {
    console.error('Error updating user template:', error);
    throw error;
  }
};

export const fetchInputProps = (videoId: string): Promise<NonNullable<TMyComp>> => {
  return new Promise(async (resolve, reject) => {
    const auth = firestoreAuth;
    if (auth && auth.currentUser) {
      try {
        const slidesSnap = await getDocs(collection(firestoreDb, 'videos', videoId, 'slides'));
        let slides: TSlide[] = [];

        if (slidesSnap.size > 0) {
          slides = slidesSnap.docs.map((doc) => {
            const data = doc.data();

            if (data.type === 'image') {
              const { video_url, ...imageSlideData } = data;
              return imageSlideData;
            } else if (data.type === 'video') {
              return { ...data };
            } else {
              return { ...data };
            }
          });
        }

        const audioQuery = collection(firestoreDb, 'videos', videoId, 'audio');
        const audioSnap = await getDocs(audioQuery);
        let audio: TAudioItem[] = [];

        if (audioSnap.size > 0) {
          audio = audioSnap.docs.map((doc) => doc.data());
        }

        const slidesOrderData = await getSlideOrder(videoId) as string[];
        const audioOrderData = await getAudioOrder(videoId) as string[];

        const videoDataSnap = await getDoc(doc(firestoreDb, 'videos', videoId));
        const videoData = videoDataSnap.data();

        const inputProps: NonNullable<TMyComp> = buildInputProps({
          videoId,
          slides,
          audio,
          videoData,
          slidesOrder: slidesOrderData || [],
          audioOrder: audioOrderData || []
        }, false);

        resolve(inputProps);
      } catch (error) {
        reject(error);
      }
    } else {
      reject(new Error('User not authenticated'));
    }
  });
};

export const addTextSlide = async (
  text: string,
  styles: {
    alignment: string | undefined
  },
  videoId: string,
  subText?: string,
  id?: string
) => {
  const auth = firestoreAuth;
  const slideId = id || `text_${uniqueID()}`;

  const words = text.split(/\s+/).length;

  const WORDS_PER_MINUTE = 130; // Adjust as needed based on average reading speed
  const FRAMES_PER_SECOND = 30; // Update with your actual frame rate
  const readingTimeMinutes = words / WORDS_PER_MINUTE;
  const duration_in_seconds = Math.max(readingTimeMinutes * 60, MIN_TEXT_SLIDE_DURATION); // Minimum 8-second duration
  const duration_in_frames = Math.ceil(duration_in_seconds * FRAMES_PER_SECOND);

  if (auth && auth.currentUser) {
    const textSlide = {
      id: slideId,
      dateUpdated: serverTimestamp(),
      authorUid: auth.currentUser.uid,
      type: 'text',
      text,
      subText: subText ? subText : null,
      styles,
      duration_in_frames
    };

    // @ts-ignore
    try {
      await setDoc(
        doc(firestoreDb, 'videos', videoId, 'slides', slideId),
        {
          ...textSlide,
        },
        { merge: true }
      );
      return slideId;
    } catch (error) {
      throw error;
    }
  }
};

export const updateSlideStyles = async (
  videoId: string,
  slideId: string,
  content: any
) => {
  const auth = firestoreAuth;

  if (auth && auth.currentUser && slideId) {
    try {
      await setDoc(
        doc(firestoreDb, 'videos', videoId, 'slides', slideId),
        {
          styles: {
            ...content
          }
        },
        { merge: true }
      );
      await updateVideo(videoId);
      return slideId;
    } catch (error) {
      throw error;
    }
  }
};

// Function to fetch music from the music_library collection
export const getMusicLibrary = async (): Promise<TAudioItem[]> => {
  try {
    const musicQuery = query(
      collection(firestoreDb, 'music_library'),
      where('isActive', '==', true),
      orderBy('dateAdded', 'desc')
    );

    const musicSnapshot = await getDocs(musicQuery);
    const musicLibrary: TAudioItem[] = [];

    for (const doc of musicSnapshot.docs) {
      const musicData = doc.data();

      // Transform music_library data to TAudioItem format
      const audioItem: TAudioItem = {
        id: doc.id,
        authorUid: musicData.authorUid || '',
        duration: musicData.duration || 0,
        durationInFrames: musicData.durationInFrames || Math.round((musicData.duration || 0) * 30), // Calculate if missing (30 FPS)
        fileName: musicData.title || musicData.fileName || '',
        reference: musicData.reference || '',
        url: musicData.url || '', // Use 'url' field as shown in debug
        dateUpdated: musicData.dateUpdated && typeof musicData.dateUpdated.toDate === 'function'
          ? musicData.dateUpdated.toDate()
          : new Date(),
        // Default audio editing properties
        startFrame: 0,
        endFrame: musicData.durationInFrames || Math.round((musicData.duration || 0) * 30),
        volume: 1,
        loopCount: 1,
        fadeIn: false,
        fadeOut: false,
        fadeDuration: 'standard'
      };

      // Debug: Log what we're getting vs what we're setting
      console.log(`🔍 getMusicLibrary mapping for ${doc.id}:`);
      console.log('  Raw musicData.url:', musicData.url);
      console.log('  Mapped audioItem.url:', audioItem.url);
      console.log('  audioItem.fileName:', audioItem.fileName);

      musicLibrary.push(audioItem);
    }

    return musicLibrary;
  } catch (error) {
    console.error('Error fetching music library:', error);
    return [];
  }
};

// AI Template Usage Functions (Video-based)
export const checkVideoAIUsageLimit = async (videoId: string) => {
  try {
    const videoDoc = await getDoc(doc(firestoreDb, 'videos', videoId));

    if (!videoDoc.exists()) {
      return {
        canGenerate: false,
        remainingAttempts: 0,
        maxAttempts: 3,
        currentAttempts: 0,
        reason: 'Video not found'
      };
    }

    const videoData = videoDoc.data();
    const currentAttempts = videoData.aiTemplateAttempts || 0;
    const maxAttempts = 3;
    const remainingAttempts = maxAttempts - currentAttempts;

    return {
      canGenerate: remainingAttempts > 0,
      remainingAttempts,
      maxAttempts,
      currentAttempts,
      reason: remainingAttempts <= 0 ? 'AI template generation limit reached for this video' : undefined
    };
  } catch (error) {
    console.error('Error checking video AI usage limit:', error);
    return {
      canGenerate: false,
      remainingAttempts: 0,
      maxAttempts: 3,
      currentAttempts: 0,
      reason: 'Error checking usage limit'
    };
  }
};

export const recordVideoAIUsage = async (videoId: string) => {
  const auth = firestoreAuth;
  if (auth && auth.currentUser) {
    const videoRef = doc(firestoreDb, 'videos', videoId);
    try {
      // Get current attempts first to ensure we don't exceed the limit
      const videoDoc = await getDoc(videoRef);
      if (videoDoc.exists()) {
        const currentAttempts = videoDoc.data().aiTemplateAttempts || 0;
        await updateDoc(videoRef, {
          aiTemplateAttempts: currentAttempts + 1,
          dateUpdated: serverTimestamp(),
        });
      } else {
        throw new Error('Video not found');
      }
    } catch (error) {
      console.error('Error recording video AI usage:', error);
      throw error;
    }
  }
};

export const getVideoAIUsageSummary = async (videoId: string) => {
  try {
    const usageCheck = await checkVideoAIUsageLimit(videoId);

    return {
      aiTemplateAttempts: usageCheck.currentAttempts,
      maxAttempts: usageCheck.maxAttempts,
      remainingAttempts: usageCheck.remainingAttempts
    };
  } catch (error) {
    console.error('Error getting video AI usage summary:', error);
    return {
      aiTemplateAttempts: 0,
      maxAttempts: 3,
      remainingAttempts: 3
    };
  }
};

// Outtakes slide functions
export const saveOuttakesSlide = async (videoId: string, outtakesData: any) => {
  const auth = firestoreAuth;
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const docRef = doc(firestoreDb, 'videos', videoId);

    if (outtakesData === null) {
      // Remove outtakes
      await updateDoc(docRef, {
        outtakesSlide: null,
        updatedAt: serverTimestamp()
      });
    } else {
      // Add/update outtakes
      await updateDoc(docRef, {
        outtakesSlide: {
          ...outtakesData,
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving outtakes slide:', error);
    throw error;
  }
};

export const getOuttakesSlide = async (videoId: string) => {
  const auth = firestoreAuth;
  if (!auth?.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const docRef = doc(firestoreDb, 'videos', videoId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.outtakesSlide || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting outtakes slide:', error);
    throw error;
  }
};

// Template Selection Functions

/**
 * Save user's template selection to Firestore
 */
export const saveUserTemplateSelection = async (selectedTemplate: SelectedTemplate) => {
  const auth = firestoreAuth;
  if (!auth || !auth.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const uid = auth.currentUser.uid;
    await setDoc(
      doc(firestoreDb, 'users', uid, 'preferences', 'template_selection'),
      {
        selectedTemplate,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    console.log('✅ Template selection saved to Firestore:', selectedTemplate);
  } catch (error) {
    console.error('❌ Failed to save template selection to Firestore:', error);
    throw error;
  }
};

/**
 * Get user's template selection from Firestore
 */
export const getUserTemplateSelection = async (): Promise<SelectedTemplate | null> => {
  const auth = firestoreAuth;
  if (!auth || !auth.currentUser) {
    return null;
  }

  try {
    const uid = auth.currentUser.uid;
    const docSnap = await getDoc(
      doc(firestoreDb, 'users', uid, 'preferences', 'template_selection')
    );

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ Template selection retrieved from Firestore:', data.selectedTemplate);
      return data.selectedTemplate || null;
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to get template selection from Firestore:', error);
    return null;
  }
};

/**
 * Clear user's template selection from Firestore
 */
export const clearUserTemplateSelection = async () => {
  const auth = firestoreAuth;
  if (!auth || !auth.currentUser) {
    return;
  }

  try {
    const uid = auth.currentUser.uid;
    await deleteDoc(doc(firestoreDb, 'users', uid, 'preferences', 'template_selection'));
    console.log('✅ Template selection cleared from Firestore');
  } catch (error) {
    console.error('❌ Failed to clear template selection from Firestore:', error);
  }
};
