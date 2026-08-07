/**
 * Shared between the client overlay and the inline boot script rendered by the
 * server page, which must agree on the flag or the video would replay on every
 * visit. Kept out of the 'use client' module so the server can import the plain
 * string rather than a client reference.
 */
export const FUSION_SEEN_KEY = 'fusione-vista-v1';
