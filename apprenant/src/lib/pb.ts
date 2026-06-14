import PocketBase, { type RecordModel } from 'pocketbase';
import { getConfig } from './config';

const url = getConfig('POCKETBASE_URL', '');

export const pb = new PocketBase(url || undefined);

export function pbFileUrl(record: RecordModel, fileName: string, queryParams?: Record<string, string>) {
  if (!fileName) return '';
  return pb.files.getUrl(record, fileName, queryParams);
}

export type ExperienceStatus = 'draft' | 'published' | 'archived';
export type NavigationMode = 'free' | 'sequential';

export interface ExperienceRecord extends RecordModel {
  title: string;
  slug: string;
  description?: string;
  cover?: string;
  status: ExperienceStatus;
  navigationMode: NavigationMode;
  isPublic: boolean;
  publishedAt?: string;
  compiledTargets?: string;
  createdBy: string;
}

export interface TargetRecord extends RecordModel {
  experience: string;
  name: string;
  description?: string;
  sourceImage: string;
  compiledTarget: string;
  physicalWidthCm?: number;
  order?: number;
  isActive: boolean;
}

export type ArContentType = 'text' | 'image' | 'model3d' | 'embed' | 'info';

export interface ArContentRecord extends RecordModel {
  experience: string;
  target: string;
  type: ArContentType;
  title?: string;
  body?: string;
  media?: string;
  model3d?: string;
  embedUrl?: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  actionType?: 'none' | 'open_modal' | 'open_url' | 'next_step';
  actionValue?: string;
  order?: number;
  isVisible: boolean;
}
