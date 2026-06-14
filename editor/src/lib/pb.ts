import PocketBase from 'pocketbase';
import { getConfig } from './config';

const url = getConfig('POCKETBASE_URL', 'http://localhost:8092');

export const pb = new PocketBase(url);

// Persist auth in localStorage (default behavior, explicit for clarity)
pb.authStore.onChange(() => {
  /* triggers Zustand store refresh elsewhere */
});

export function pbFileUrl(record: { id: string; collectionId?: string; collectionName?: string }, fileName: string, queryParams?: Record<string, string>) {
  if (!fileName) return '';
  return pb.files.getUrl(record as any, fileName, queryParams);
}
