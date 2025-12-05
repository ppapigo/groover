// src/types/index.ts

export interface User {
  id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
}

export interface Post {
  id: string;
  title: string;
  desc: string;
  content?: string;
  date: string;
  author: string;
  tags: string[];
  imageUrl: string;
  likes: number;
  views: number;
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
