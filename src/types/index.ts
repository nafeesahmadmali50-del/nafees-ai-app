export type AppMode = 'normal' | 'study' | 'business' | 'voice';

export type ModelMode = 'fast' | 'balanced' | 'advanced';

export type AttachmentCategory = 'pdf' | 'image' | 'text' | 'document' | 'csv' | 'code';

export interface ChatAttachment {
  data: string; // base64 encoded string or raw content
  mimeType: string;
  name?: string;
  size?: number;
  previewUrl?: string;
  category?: AttachmentCategory;
  extractedText?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachment?: ChatAttachment;
  timestamp: number;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: AppMode;
  messages: Message[];
  activeAttachment?: ChatAttachment;
}

export interface AppSettings {
  modelMode: ModelMode;
  model: string;
  uiLanguage: 'hi' | 'en';
  speechLang: 'hi-IN' | 'en-IN' | 'en-US';
  voiceRate: number;
  autoSpeak: boolean;
  theme: 'neon-navy' | 'oled-black' | 'midnight-blue';
}

export interface StudyTool {
  id: string;
  titleHi: string;
  titleEn: string;
  descHi: string;
  descEn: string;
  icon: string;
  placeholderHi: string;
  placeholderEn: string;
  buildPrompt: (input: string) => string;
}

export interface BusinessTool {
  id: string;
  titleHi: string;
  titleEn: string;
  descHi: string;
  descEn: string;
  icon: string;
  placeholderHi: string;
  placeholderEn: string;
  buildPrompt: (input: string) => string;
}

export type ImageStyleChoice =
  | 'Realistic'
  | '3D Cartoon'
  | 'Cinematic'
  | 'Product Photo'
  | 'Illustration'
  | 'Anime';

export type ImageAspectRatio = '1:1' | '9:16' | '16:9';

export interface GeneratedImageItem {
  id: string;
  prompt: string;
  style: ImageStyleChoice;
  aspectRatio: ImageAspectRatio;
  imageUrl: string;
  createdAt: number;
}

export type VideoStyleChoice =
  | 'Realistic'
  | '3D Cartoon'
  | 'Cinematic'
  | 'Product Ad'
  | 'Islamic'
  | 'Animation';

export type VideoAspectRatio = '9:16' | '16:9';

export type VideoDuration = 4 | 6 | 8;

export interface GeneratedVideoItem {
  id: string;
  prompt: string;
  style: VideoStyleChoice;
  aspectRatio: VideoAspectRatio;
  duration: VideoDuration;
  videoUrl: string;
  isVeoVideo?: boolean;
  thumbnailUrl?: string;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  identifier: string; // Mobile number or Email
  avatarUrl?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface StoredUserAccount extends UserProfile {
  passwordHash: string;
  salt: string;
}



