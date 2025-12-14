// src/types/index.ts

export interface User {
  id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
}

export interface PostMetadata {
  purchaseStatus?: string;
  priceRange?: string;
  storeName?: string;
  summary?: string;
}

export interface Post {
  id: string;
  title: string;
  desc: string;
  content?: string;
  slug?: string;
  excerpt?: string;
  previewImage?: string;
  date: string;
  author: string;
  tags: string[];
  imageUrl: string;
  likes: number;
  views: number;
  metadata?: PostMetadata;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'me' | 'other';
  text: string;
  time?: string;
}

export interface Thread {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
}

export interface Transaction {
  id: string;
  type: 'earning' | 'withdraw';
  desc: string;
  amount: number;
  date: string;
}