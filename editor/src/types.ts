import type { RecordModel } from 'pocketbase';

export type UserRecord = RecordModel & {
  email: string;
  name?: string;
  role?: 'admin' | 'editor';
  avatar?: string;
};

export type ExperienceStatus = 'draft' | 'published' | 'archived';
export type NavigationMode = 'free' | 'sequential';

export type ExperienceRecord = RecordModel & {
  title: string;
  slug: string;
  description?: string;
  cover?: string;
  status: ExperienceStatus;
  navigationMode: NavigationMode;
  isPublic: boolean;
  publishedAt?: string;
  createdBy: string;
};

export type TargetRecord = RecordModel & {
  experience: string;
  name: string;
  description?: string;
  sourceImage: string;
  compiledTarget: string;
  physicalWidthCm?: number;
  order?: number;
  isActive: boolean;
};

export type ArContentType = 'text' | 'image' | 'model3d' | 'embed' | 'info';

export type ArContentRecord = RecordModel & {
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
};
