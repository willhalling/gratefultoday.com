// @ts-nocheck

import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  uploadBytes,
  deleteObject,
  uploadBytesResumable,
} from 'firebase/storage';

import { firestoreAuth } from '@/firebase/firebase-config';

import { uniqueID, getFileExtension } from '@/utils/maker/helpers';

export const uploadPortraitImage = async (
  videoId: string,
  canvasImage64: string
) => {
  // Create a root reference
  const storage = getStorage();
  // @ts-ignore
  const uid = firestoreAuth.currentUser.uid;
  const reference = `/users/${uid}/${videoId}/portrait.jpg`;
  const imageRef = ref(storage, reference);
  const uploadImage = await uploadString(imageRef, canvasImage64, 'data_url');
  try {
    const url = await getDownloadURL(uploadImage.ref);
    return { url };
  } catch (error) {
    throw error;
  }
};

export const uploadStandardThumb = async (
  blob: Blob,
  fileName: string,
  videoId: string
) => {
  // Create a root reference
  const storage = getStorage();
  const uid = firestoreAuth.currentUser.uid;

  // Storage ID is what is passed to Firestore so we can link the media with the correct post entry
  const id = `image_${fileName}`;

  const reference = `/users/${uid}/${videoId}/${id}/original.jpg`;
  const imageRef = ref(storage, reference);

  let uploadImage;

  // 1. Get downloadeded URL
  try {
    uploadImage = await uploadBytes(imageRef, blob);
  } catch (error) {
    throw error;
  }
  // Get downloadeded URL
  try {
    const url = await getDownloadURL(uploadImage.ref);
    return { url };
  } catch (error) {
    throw error;
  }
};

export const uploadStandardImage = (
  blob: Blob,
  fileName: string,
  videoId: string,
  onProgress: (progress: number) => void
): Promise<{ url: string } | null> => {

  return new Promise(async (resolve) => {
    // Create a root reference
    const storage = getStorage();
    const uid = firestoreAuth.currentUser.uid;

    const id = `image_${fileName}`;

    const reference = `/users/${uid}/${videoId}/${id}/original.jpg`;
    const imageRef = ref(storage, reference);

    // Create an upload task
    const uploadTask = uploadBytesResumable(imageRef, blob);

    // Register observers to track upload progress
    uploadTask.on('state_changed',
      (snapshot) => {
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(progress); // Update progress using the callback function
        console.log('Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case 'paused':
            console.log('Upload is paused');
            break;
          case 'running':
            console.log('Upload is running');
            break;
        }
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error('Upload failed:', error);
        resolve(null); // Resolve the Promise with null in case of an error
      },
      async () => {
        // Handle successful uploads on complete
        try {
          // Get the video URL
          const url = await getDownloadURL(uploadTask.snapshot.ref);

          // Resolve the Promise with the video URL upon successful upload
          resolve({ url });
        } catch (error) {
          console.error('Error getting download URL:', error);
          resolve(null); // Resolve the Promise with null in case of an error
        }
      }
    );

    try {
      await uploadTask; // Wait for the upload to complete
    } catch (error) {
      console.error('Upload process error:', error);
      resolve(null); // Resolve the Promise with null in case of an error
    }
  });
};

export const uploadStandardVideo = (
  blob: Blob,
  fileName: string,
  videoId: string,
  onProgress: (progress: number) => void
): Promise<{ videoUrl: string } | null> => {
  return new Promise(async (resolve) => {
    // Create a root reference
    const storage = getStorage();
    const uid = firestoreAuth.currentUser.uid;;

    // Storage ID is what is passed to Firestore so we can link the media with the correct post entry
    const reference = `/users/${uid}/${videoId}/video-${fileName}/video.${getFileExtension(fileName)}`;
    const videoRef = ref(storage, reference);

    // Create an upload task
    const uploadTask = uploadBytesResumable(videoRef, blob);

    // Register observers to track upload progress
    uploadTask.on('state_changed',
      (snapshot) => {
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(progress); // Update progress using the callback function
        console.log('Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case 'paused':
            console.log('Upload is paused');
            break;
          case 'running':
            console.log('Upload is running');
            break;
        }
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error('Upload failed:', error);
        resolve(null); // Resolve the Promise with null in case of an error
      },
      async () => {
        // Handle successful uploads on complete
        try {
          // Get the video URL
          const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // Resolve the Promise with the video URL upon successful upload
          resolve({ videoUrl });
        } catch (error) {
          console.error('Error getting download URL:', error);
          resolve(null); // Resolve the Promise with null in case of an error
        }
      }
    );

    try {
      await uploadTask; // Wait for the upload to complete
    } catch (error) {
      console.error('Upload process error:', error);
      resolve(null); // Resolve the Promise with null in case of an error
    }
  });
};


export const uploadRotatedImage = async (
  base64: string,
  fileName: string,
  videoId: string
) => {
  // Create a root reference
  const storage = getStorage();
  const uid = firestoreAuth.currentUser.uid;

  // Storage ID is what is passed to Firestore so we can link the media with the correct post entry
  const id = `image_${fileName}`;

  const reference = `/users/${uid}/${videoId}/${id}/original.jpg`;
  const imageRef = ref(storage, reference);

  let uploadImage;

  // 1. Get downloadeded URL
  try {
    uploadImage = await uploadString(imageRef, base64, 'data_url');
  } catch (error) {
    throw error;
  }
  // Get downloadeded URL
  try {
    const url = await getDownloadURL(uploadImage.ref);
    return { url };
  } catch (error) {
    throw error;
  }
};

export const uploadSlideImage = async (
  videoId: string,
  base64: string,
  type: string,
  id?: string,
  fileName?: string,
  isCropped?: boolean,
  isOriginal?: boolean
) => {
  // Create a root reference
  const storage = getStorage();
  // Storage ID is what is passed to Firestore so we can link the media with the correct post entry
  const storageId = id || `image_${fileName}`;
  let imageId;

  // cropped images are already in correct naming format
  if (isCropped) {
    imageId = storageId;
  } else {
    imageId = `${type}_${storageId}`;
  }

  const uid = firestoreAuth.currentUser.uid;

  let name = '';

  if (isOriginal) {
    name = 'original';
  } else {
    name = 'resized';
  }

  const reference = `/users/${uid}/${videoId}/${imageId}/${name}.jpg`;
  const imageRef = ref(storage, reference);
  let uploadImage;
  try {
    uploadImage = await uploadString(imageRef, base64, 'data_url');
  } catch (error) {
    throw error;
  }
  try {
    const url = await getDownloadURL(uploadImage.ref);
    return { url, id: imageId, storageId };
  } catch (error) {
    throw error;
  }
};

export const uploadSlideVideo = async (
  videoId: string,
  fileBlob: Blob,
  fileName: string
) => {
  /* 
    function blobToBase64(blob) {
      return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } */

  // Create a root reference
  const storage = getStorage();
  // Storage ID is what is passed to Firestore so we can link the media with the correct post entry
  // const storageId = uniqueID();
  const storageId = `${fileName}`;
  // @ts-ignore
  const uid = firestoreAuth.currentUser.uid;
  const reference = `/users/${uid}/${videoId}/video-${storageId}/video.webm`;
  const videoRef = ref(storage, reference);
  const uploadVideo = await uploadBytes(videoRef, fileBlob);
  try {
    const videoUrl = await getDownloadURL(uploadVideo.ref);
    return { videoUrl, id: `video_${storageId}` };
  } catch (error) {
    throw error;
  }
};

export const uploadAudioFile = (
  blob: Blob,
  videoId: string,
  onProgress: (progress: number) => void
): Promise<{ url: string, reference: string, id: string } | null> => {

  return new Promise(async (resolve) => {
    // Create a root reference
    const storageId = uniqueID();
    const storage = getStorage();
    const uid = firestoreAuth.currentUser.uid;
    const reference = `/users/${uid}/${videoId}/audio_${storageId}/audio.mp3`;
    const audioRef = ref(storage, reference);
    const metadata = {
      contentType: 'audio/mpeg',
    };

    // Create an upload task
    const uploadTask = uploadBytesResumable(audioRef, blob, metadata);

    // Register observers to track upload progress
    uploadTask.on('state_changed',
      (snapshot) => {
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(progress); // Update progress using the callback function
        console.log('Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case 'paused':
            console.log('Upload is paused');
            break;
          case 'running':
            console.log('Upload is running');
            break;
        }
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error('Upload failed:', error);
        resolve(null); // Resolve the Promise with null in case of an error
      },
      async () => {
        // Handle successful uploads on complete
        try {
          // Get the video URL
          const url = await getDownloadURL(uploadTask.snapshot.ref);

          // Resolve the Promise with the video URL upon successful upload
          resolve({ url, reference, id: storageId });
        } catch (error) {
          console.error('Error getting download URL:', error);
          resolve(null); // Resolve the Promise with null in case of an error
        }
      }
    );

    try {
      await uploadTask; // Wait for the upload to complete
    } catch (error) {
      console.error('Upload process error:', error);
      resolve(null); // Resolve the Promise with null in case of an error
    }
  });
};

export const uploadMusicFile = async (id: string, audioBlob: Blob) => {
  const storage = getStorage();
  const storageId = uniqueID();
  const reference = `/music/music-${id}/${id}.mp3`;
  const audioRef = ref(storage, reference);
  const metadata = {
    contentType: 'audio/mpeg',
  };
  const uploadAudio = await uploadBytes(audioRef, audioBlob, metadata);
  try {
    const url = await getDownloadURL(uploadAudio.ref);
    return { url, reference, id: storageId };
  } catch (error) {
    throw error;
  }
};

export const removeAudioFile = async (reference: string) => {
  const storage = getStorage();

  const audioRef = ref(storage, reference);

  deleteObject(audioRef)
    .then(() => {
      return 'Audio file deleted';
    })
    .catch((error) => {
      throw error;
    });
};

export const uploadAITemplate = async (
  imageBlob: Blob,
  templateName: string,
  uniqueId: string
) => {
  const storage = getStorage();
  
  // Get file extension from blob type or default to jpg
  let extension = 'jpg';
  if (imageBlob.type) {
    const mimeTypes = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp'
    };
    extension = mimeTypes[imageBlob.type] || 'jpg';
  }
  
  // Create filename: template-name-slug + unique ID + extension
  const slug = templateName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
  
  const fileName = `${slug}-${uniqueId}.${extension}`;
  const reference = `ai-templates/${fileName}`;
  const imageRef = ref(storage, reference);

  try {
    // Upload the image blob
    const uploadResult = await uploadBytes(imageRef, imageBlob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    return {
      url: downloadURL,
      reference: reference,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error uploading AI template to Firebase Storage:', error);
    throw error;
  }
};

// Upload outtakes file (audio or video)
export const uploadOuttakesFile = async ({
  videoId,
  file,
  fileName,
  onProgress
}: {
  videoId: string;
  file: File;
  fileName: string;
  onProgress?: (progress: number) => void;
}) => {
  try {
    const storage = getStorage();
    const uid = firestoreAuth.currentUser?.uid;
    
    if (!uid) {
      throw new Error('User not authenticated');
    }

    // Generate unique file name
    const fileExtension = getFileExtension(fileName);
    const uniqueFileName = `outtakes_${Date.now()}.${fileExtension}`;
    const reference = `/users/${uid}/${videoId}/outtakes/${uniqueFileName}`;
    const storageRef = ref(storage, reference);

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          console.error('Error uploading outtakes file:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              success: true,
              url: downloadURL,
              reference: reference,
              fileName: fileName
            });
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error setting up outtakes file upload:', error);
    throw error;
  }
};
