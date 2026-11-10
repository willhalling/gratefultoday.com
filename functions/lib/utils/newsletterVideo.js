"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewsletterGifUrl = getNewsletterGifUrl;
const BUCKET_NAME = "grateful-today-761f2.appspot.com";
function getNewsletterGifUrl(date) {
    const path = encodeURIComponent(`public/newsletter/${date}.gif`);
    const token = encodeURIComponent(`newsletter-${date}`);
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${path}?alt=media&token=${token}`;
}
