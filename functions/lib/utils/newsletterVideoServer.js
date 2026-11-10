"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNewsletterGifUrl = findNewsletterGifUrl;
const newsletterVideo_1 = require("./newsletterVideo");
async function findNewsletterGifUrl(date) {
    const url = (0, newsletterVideo_1.getNewsletterGifUrl)(date);
    try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok ? url : null;
    }
    catch {
        return null;
    }
}
