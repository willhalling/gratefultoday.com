import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { firestoreDb } from '@/firebase/firebase-config';

export interface SavedChip {
  id?: string;
  type: string;
  chipId: string;
  chipNumber: number;
  chipText: string;
  chipColor: string;
  chipNumberX: number;
  chipNumberY: number;
  chipTextX: number;
  chipTextY: number;
  recipientName: string;
  customText: string;
  personalMessage: string;
  createdAt: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateChipId(recipientName: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);

  if (recipientName && recipientName.trim()) {
    const slugifiedName = slugify(recipientName);
    return `${slugifiedName}-${timestamp}-${random}`;
  }

  return `${timestamp}-${random}`;
}

export async function saveChip(
  chipData: Omit<SavedChip, 'id' | 'createdAt' | 'type'>
): Promise<string> {
  try {
    const chipId = generateChipId(chipData.recipientName);
    const docRef = doc(firestoreDb, 'sobrietyChips', chipId);

    await setDoc(docRef, {
      ...chipData,
      type: 'chip',
      createdAt: Date.now(),
    });

    return chipId;
  } catch (error) {
    console.error('Error saving chip:', error);
    throw error;
  }
}

export async function getChip(id: string): Promise<SavedChip | null> {
  try {
    const docRef = doc(firestoreDb, 'sobrietyChips', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as SavedChip;
    }
    return null;
  } catch (error) {
    console.error('Error getting chip:', error);
    return null;
  }
}
