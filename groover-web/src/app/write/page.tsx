// src/app/write/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';
import imageCompression from 'browser-image-compression';
import { X, Image, Eye, Tag } from 'lucide-react';

interface TagSuggestion {
  id: string;
  name: string;
  useCount: number;
}

function WriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [cursorPosition, setCursorPosition] = useState(0);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ===================== 수정: draft 불러오기 ===================== */
  useEffect(() => {
    if (!editId) return;

    (async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/blog/posts/${editId}`);
        const post = res.data.data;
        setTitle(post.title || '');
        setContent(post.content || '');
        setTags(post.tags || []);
        setPreviewImage(post.previewImage || null);
      } catch {
        alert('글을 불러오지 못했습니다.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [editId, router]);

  /* ===================== 수정: 자동저장 조건 강화 ===================== */
  useEffect(() => {
    const timer = setInterval(() => {
      if (title.trim() && content.trim()) {
        handleSaveDraft(true);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [title, content, tags, previewImage]);

  const handleSaveDraft = async (auto = false) => {
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    try {
      const payload = { title, content, tags, previewImage };

      if (editId) {
        await api.put(`/blog/posts/${editId}`, payload);
      } else {
        const res = await api.post('/blog/posts', payload);
        if (!auto) {
          router.replace(`/write?edit=${res.data.data.id}`);
        }
      }
      if (!auto) alert('임시저장되었습니다.');
    } catch {
      if (!auto) alert('저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  /* ===================== 핵심 수정: publish 흐름 ===================== */
  const handlePublish = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      let postId: string;
      let slug: string | undefined;

      const payload = { title, content, tags, previewImage };

      if (editId) {
        await api.put(`/blog/posts/${editId}`, payload);
        postId = editId;
      } else {
        const res = await api.post('/blog/posts', payload);
        postId = res.data.data.id;
        slug = res.data.data.slug;
      }

      await api.post(`/blog/posts/${postId}/publish`);

      alert('글이 발행되었습니다!');
      router.replace(slug ? `/blog/${slug}` : '/blog');
    } catch {
      alert('발행에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ===================== 이미지 업로드 ===================== */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
      });

      const form = new FormData();
      form.append('image', compressed);

      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/images/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
      );

      const data = await res.json();
      const url = data.data?.url;

      const md = `\n![이미지](${url})\n`;
      const newContent =
        content.slice(0, cursorPosition) + md + content.slice(cursorPosition);

      setContent(newContent);
      if (!previewImage) setPreviewImage(url);
    } catch {
      alert('이미지 업로드 실패');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading && editId) {
    return <div style={{ padding: 40 }}>불러오는 중…</div>;
  }

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        {/* 헤더 */}
        <header style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => router.back()}><X /></button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleSaveDraft(false)} disabled={isSaving}>
              임시저장
            </button>
            <button onClick={handlePublish} disabled={isLoading}>
              {editId ? '수정완료' : '발행'}
            </button>
          </div>
        </header>

        {/* 본문 */}
        <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            style={{ fontSize: 24, fontWeight: 700, width: '100%', border: 'none' }}
          />

          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setCursorPosition(e.target.selectionStart);
            }}
            placeholder="내용을 입력하세요"
            style={{ width: '100%', minHeight: 400, border: 'none', marginTop: 20 }}
          />
        </div>

        {/* 하단 */}
        <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageUpload}
          />
          <button onClick={() => fileInputRef.current?.click()}>
            <Image />
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <WriteContent />
    </Suspense>
  );
}
