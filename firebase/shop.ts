import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL
} from 'firebase/storage';
import { firestoreAuth, firestoreDb } from './firebase-config';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    serverTimestamp,
    query,
    getDocs,
    deleteField,
    updateDoc
} from 'firebase/firestore';

import { TPage, TPageType } from '@/components/stationery/stationery.types';

import { uniqueID, slugify } from '@/utils/maker/helpers';


interface UploadResult {
    url: string;
}

// Function to upload Base64 image and save URL to Firestore
/* example use:
const base64Image: string = 'data:image/png;base64,...'; // Your Base64 string here
  const fileName: string = 'myImage.png'; // Desired file name
  const firestoreCollection: string = 'yourFirestoreCollection'; // Name of your Firestore collection

  try {
  const result = await uploadBase64ImageToStorage(fileName, base64Image, firestore, firestoreCollection);
  console.log('Image uploaded and URL saved:', result.url);
  } catch (error) {
  console.error(error);
  }
  */

export const uploadImageToStorageOLD = async (
    id: string,
    imageBlob: Blob,
    previewBlob: Blob,
    firestoreCollection: string,
    size: string,
    type: string,
    index: number,  // New index prop
    onProgress: (progress: number) => void // Callback to report upload progress
): Promise<{ imageUrls: string[], previewUrls: string[], id: string }> => {
    const storage = getStorage();
    const uid = firestoreAuth.currentUser?.uid;

    if (!uid) throw new Error('User is not authenticated');

    // Get the current timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-'); // Replace ':' to avoid issues in filenames

    // Create references for the image and preview in Firebase Storage with timestamps
    const imageRef = ref(storage, `${firestoreCollection}/${uid}/${id}-${timestamp}.png`);
    const previewRef = ref(storage, `${firestoreCollection}/${uid}/${id}-preview-${timestamp}.png`);

    // Function to upload a blob and return its download URL
    const uploadBlob = async (blob: Blob, ref: any) => {
        return new Promise<string>((resolve, reject) => {
            const uploadTask = uploadBytesResumable(ref, blob);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    onProgress(progress); // Report the progress
                },
                (error) => {
                    reject(new Error('Upload failed: ' + error.message));
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    };

    try {
        // Upload both image and preview blobs
        const imageUrl = await uploadBlob(imageBlob, imageRef);
        const previewUrl = await uploadBlob(previewBlob, previewRef);

        // Save the URLs to Firestore
        const ordersCollectionRef = collection(firestoreDb, `orders/${uid}/order`);

        // Reference the document with the provided id
        const docRef = doc(ordersCollectionRef, id);

        // Check if the document already exists
        const docSnapshot = await getDoc(docRef);

        // Define the base fields
        let data: {
            imageUrls: string[];
            previewUrls: string[];
            size: string;
            type: string;
            status: string;
            id: string;
            authorUid: string;
            updatedAt: any;
            createdAt?: any;  // Mark `createdAt` as optional
        };

        if (docSnapshot.exists()) {
            // If the document exists, get the current imageUrls and previewUrls arrays
            const existingData = docSnapshot.data();
            const existingImageUrls = existingData?.imageUrls || [];
            const existingPreviewUrls = existingData?.previewUrls || [];

            // Insert the new URLs at the specified index
            existingImageUrls[index] = imageUrl;
            existingPreviewUrls[index] = previewUrl;

            data = {
                imageUrls: existingImageUrls,
                previewUrls: existingPreviewUrls,
                size,
                type,
                status: 'draft',
                id,
                authorUid: uid,
                updatedAt: serverTimestamp(), // Always update `updatedAt`
            };

            // Use `updateDoc` to remove the old `imageUrl` and `previewUrl`
            await updateDoc(docRef, {
                imageUrl: deleteField(), // Explicitly delete `imageUrl`
                previewUrl: deleteField(), // Explicitly delete `previewUrl`
            });
        } else {
            // If the document doesn't exist, create a new one with the arrays
            data = {
                imageUrls: Array(index + 1).fill(null), // Initialize array of nulls to ensure index exists
                previewUrls: Array(index + 1).fill(null),
                size,
                type,
                id,
                authorUid: uid,
                status: 'draft',
                updatedAt: serverTimestamp(), // Always update `updatedAt`
                createdAt: serverTimestamp() // Set `createdAt` for new documents
            };

            data.imageUrls[index] = imageUrl;
            data.previewUrls[index] = previewUrl;
        }

        // Set or update the document
        await setDoc(docRef, data, { merge: true });

        return { imageUrls: data.imageUrls, previewUrls: data.previewUrls, id }; // Return the image URLs and document ID
    } catch (error) {
        throw new Error('Upload process failed: ' + error);
    }
};




export const getPreviewImageUrls = async (id: string, uid: string, isPreview: boolean): Promise<string[] | null> => {
    // Create a reference to the document in Firestore
    const docRef = doc(firestoreDb, `orders/${uid}/order/${id}`);

    try {
        // Fetch the document
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Return the appropriate URL based on the isPreview flag
            return isPreview ? data.previewUrls : data.imageUrls;
        } else {
            console.error('No such document!');
            return null; // Document doesn't exist
        }
    } catch (error) {
        console.error('Error fetching document:', error);
        return null; // Return null in case of error
    }
};

export const listUserOrders = async (userId: string): Promise<any[]> => {
    if (!userId) throw new Error('User ID is required');

    try {
        // Reference to the user's orders collection
        const ordersCollectionRef = collection(firestoreDb, `orders/${userId}/order`);

        // Query to get all orders
        const q = query(ordersCollectionRef);

        const querySnapshot = await getDocs(q);
        const orders: any[] = [];

        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        return orders; // Return an array of user orders
    } catch (error) {
        throw new Error('Failed to fetch orders: ' + error);
    }
};

export const getUserOrderById = async (userId: string, orderId: string): Promise<any> => {
    if (!userId) throw new Error('User ID is required');
    if (!orderId) throw new Error('Order ID is required');

    try {
        // Reference to the specific order document
        const orderDocRef = doc(firestoreDb, `orders/${userId}/order/${orderId}`);

        // Fetch the document
        const orderDoc = await getDoc(orderDocRef);

        if (!orderDoc.exists()) {
            throw new Error('Order not found');
        }

        // Extract order data
        const orderData = { id: orderDoc.id, ...orderDoc.data() };

        // Check if the order status is "paid"
        // @ts-ignore
        if (orderData.status !== 'paid') {
            throw new Error('Order status is not paid');
        }

        // Return the order data if status is paid
        return orderData;
    } catch (error) {
        throw new Error('Failed to fetch order: ' + error);
    }
};


export const uploadImageToStorage = async (
    id: string,
    imageBlob: Blob,
    previewBlob: Blob,
    firestoreCollection: string,
    onProgress: (progress: number) => void // Callback to report upload progress
): Promise<{ imageUrl: string, previewUrl: string }> => {
    const storage = getStorage();
    const uid = firestoreAuth.currentUser?.uid;

    if (!uid) throw new Error('User is not authenticated');

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const imageRef = ref(storage, `${firestoreCollection}/${uid}/${id}-${timestamp}.png`);
    const previewRef = ref(storage, `${firestoreCollection}/${uid}/${id}-preview-${timestamp}.png`);

    const uploadBlob = async (blob: Blob, ref: any) => {
        return new Promise<string>((resolve, reject) => {
            const uploadTask = uploadBytesResumable(ref, blob);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    onProgress(progress); // Report the progress
                },
                (error) => {
                    reject(new Error('Upload failed: ' + error.message));
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log('downloadURL', downloadURL)
                    resolve(downloadURL);
                }
            );
        });
    };

    try {
        // Upload both image and preview blobs
        const imageUrl = await uploadBlob(imageBlob, imageRef);
        const previewUrl = await uploadBlob(previewBlob, previewRef);

        return { imageUrl, previewUrl }; // Return URLs only
    } catch (error) {
        throw new Error('Upload process failed: ' + error);
    }
};

export const writeToFirestore = async (
    id: string,
    imageUrls: string[],
    previewUrls: string[],
    size: string,
    type: string
): Promise<string> => {
    const uid = firestoreAuth.currentUser?.uid;

    if (!uid) throw new Error('User is not authenticated');

    try {
        // Reference to the orders collection
        const ordersCollectionRef = collection(firestoreDb, `orders/${uid}/order`);

        const updatedId = `${id}-${uniqueID()}`;

        // Reference the document with the provided id
        const docRef = doc(ordersCollectionRef, updatedId);

        // Create the data object
        const data = {
            imageUrls: imageUrls,
            previewUrls: previewUrls,
            size,
            type,
            id: updatedId,
            authorUid: uid,
            status: 'draft',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Set the document, replacing it every time
        await setDoc(docRef, data, { merge: false });

        return updatedId; // Always return updatedId after successful write

    } catch (error) {
        console.error('Error writing to Firestore:', error);
        return ''; // Return an empty string or a default value in case of error
    }
};


export const writeToFuneralProgram = async (
    id: string,
    imageUrls: string[],
    previewUrls: string[],
    size: string,
    type: string
): Promise<string> => {
    const uid = firestoreAuth.currentUser?.uid;

    if (!uid) throw new Error('User is not authenticated');

    try {
        // Reference to the orders collection
        const ordersCollectionRef = collection(firestoreDb, `orders/${uid}/order`);

        const updatedId = `${id}-${uniqueID()}` || '';

        // Reference the document with the provided id
        const docRef = doc(ordersCollectionRef, updatedId);

        // Create the data object
        const data = {
            imageUrls: imageUrls,
            previewUrls: previewUrls,
            size,
            type,
            id: updatedId,
            authorUid: uid,
            status: 'draft',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Set the document, replacing it every time
        await setDoc(docRef, data, { merge: false });
        return updatedId
    } catch (error) {
        return ''
        console.error('Error writing to Firestore:', error);
    }
};


export const updateDigitalProduct = async (
    id: string,
    pageType: TPageType,
    pages: TPage[]
) => {
    const uid = firestoreAuth.currentUser?.uid;
    // const {fontValues} = pages[0] || {}
    // const {text} = fontValues && fontValues[1] || {}

    if (!uid) throw new Error('User is not authenticated');

    try {
        const ordersCollectionRef = collection(firestoreDb, `${pageType}`);
        const docRef = doc(ordersCollectionRef, uid);
        
        // Fetch the existing document
       // const docSnap = await getDoc(docRef);
        
        // Prepare the base data object
        const data: any = {
            type: pageType,
            id,
            authorUid: uid,
            createdAt: serverTimestamp(),
            pages: JSON.stringify(pages),
        };
    
        // Check if the document exists and has a status of 'draft'
        /* 
        if (docSnap.exists() && docSnap.data().status !== 'generated') {
            const name = text || 'anonymous';
            data.name = `${slugify(name)}-${uniqueID()}`;
        } */
    
        // Set the document, replacing it every time
        await setDoc(docRef, data, { merge: false }); // Use merge to keep existing data
    
        console.log('Firestore write result:', data);
    } catch (error) {
        console.error('Error writing to Firestore:', error);
    }
    
    
};

export const getDigitalProduct = async (
    id: string,
    pageType: TPageType
) => {
    const uid = firestoreAuth.currentUser?.uid;

    if (!uid) throw new Error('User is not authenticated');

    try {
        const ordersCollectionRef = collection(firestoreDb, `${pageType}`);
        const docRef = doc(ordersCollectionRef, uid);

        // Get the document
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // Document data
            const data = docSnap.data();
            console.log('Retrieved Firestore data:', data);
            return data; // Return the retrieved data
        } else {
            console.error('No such document!');
            return null; // Handle the case where the document doesn't exist
        }
    } catch (error) {
        console.error('Error getting Firestore document:', error);
        throw error; // Rethrow the error for handling
    }
};


