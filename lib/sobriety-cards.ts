import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestoreDb } from "@/firebase/firebase-config";
import { slugify } from "@/lib/slugify";

/**
 * Shared cards are stored exactly like shared chips: one public-by-link doc
 * in the `sobrietyChips` collection (anonymous create/read is already
 * allowed by firestore.rules), distinguished by `type: 'card'`.
 */
export interface SavedCard {
  id?: string;
  type: "card";
  cardSlug: string;
  seed: number;
  toName: string;
  fromName: string;
  message: string;
  /** Neutral link previews ("Sam sent you a card"), no milestone or sobriety mention. */
  discreet: boolean;
  /** Front style; older links without it are crayon stripes. */
  style?: "photo" | "stripes";
  /** Photo front (style 'photo'). */
  photoId?: string;
  typeStyle?: string;
  kicker?: string;
  frontHeadline?: string;
  footer?: string;
  palette?: string[];
  artwork?: "stripes" | "confetti" | "sunburst";
  recipientName?: string;
  createdAt: number;
}

function generateCardId(toName: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);

  if (toName && toName.trim()) {
    return `${slugify(toName)}-${timestamp}-${random}`;
  }

  return `${timestamp}-${random}`;
}

export async function saveCard(
  cardData: Omit<SavedCard, "id" | "createdAt" | "type">,
): Promise<string> {
  try {
    const cardId = generateCardId(cardData.toName);
    const docRef = doc(firestoreDb, "sobrietyChips", cardId);

    await setDoc(docRef, {
      ...cardData,
      type: "card",
      createdAt: Date.now(),
    });

    return cardId;
  } catch (error) {
    console.error("Error saving card:", error);
    throw error;
  }
}

export async function getCard(id: string): Promise<SavedCard | null> {
  try {
    const docRef = doc(firestoreDb, "sobrietyChips", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().type === "card") {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as SavedCard;
    }
    return null;
  } catch (error) {
    console.error("Error getting card:", error);
    return null;
  }
}
