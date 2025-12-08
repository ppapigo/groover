// src/app/write/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';

interface PostData {
  title: string;
  content: string;
  tags: string[];
  previewImage: string | null;
}

function WriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editId) {
      fetchPost(editId);
    }
  }, [editId]);

  useEffect(() => {
    const autoSave = setInterval(() => {
      if (title || content) {
        handleSaveDraft(true);
      }
    }, 30000);
    return () => clearInterval(autoSave);
  }, [title, content, tags]);

  const fetchPost = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/blog/posts/${id}`);
      const post = res.data.data;
      setTitle(post.title);
      setContent(post.content);
      setTags(post.tags || []);
      setPreviewImage(post.previewImage);
    } catch (err) {
      alert('글을 불러오는데 실패했습니다.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      if (contentRef.current) {
        const start = contentRef.current.selectionStart;
        const end = contentRef.current.selectionEnd;
        const newContent = content.substring(0, start) + `\n![이미지](${imageUrl})\n` + content.substring(end);
        setContent(newContent);
      }
      if (!previewImage) {
        setPreviewImage(imageUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().replace('#', '');
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSaveDraft = async (isAuto = false) => {
    if (!title && !content) return;
    setIsSaving(true);
    try {
      const data = { title: title || '제목 없음', content, tags, previewImage, publish: false };
      if (editId) {
        await api.put(`/blog/posts/${editId}`, data);
      } else {
        const res = await api.post('/blog/posts', data);
        if (!isAuto) {
          router.replace(`/write?edit=${res.data.data.id}`);
        }
      }
      setLastSaved(new Date());
      if (!isAuto) alert('임시저장되었습니다.');
    } catch (err) {
      if (!isAuto) alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) { alert('제목을 입력해주세요.'); return; }
    if (!content.trim()) { alert('내용을 입력해주세요.'); return; }
    setIsLoading(true);
    try {
      const data = { title, content, tags, previewImage, publish: true };
      if (editId) {
        await api.put(`/blog/posts/${editId}`, data);
        await api.post(`/blog/posts/${editId}/publish`, { publish: true });
      } else {
        await api.post('/blog/posts', data);
      }
      alert('글이 발행되었습니다!');
      router.push('/my-posts');
    } catch (err) {
      alert('발행에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (title || content) {
      if (confirm('작성 중인 내용이 있습니다. 나가시겠습니까?')) router.back();
    } else {
      router.back();
    }
  };

  if (isLoading && editId) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>불러오는 중...</p></div>;
  }

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fff', zIndex: 100 }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px' }}>×</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {lastSaved && <span style={{ fontSize: '12px', color: '#999' }}>{lastSaved.toLocaleTimeString()} 저장됨</span>}
            <button onClick={() => handleSaveDraft(false)} disabled={isSaving} style={{ padding: '8px 16px', background: '#f5f5f5', border: 'none', borderRadius: '20px', fontSize: '14px', cursor: 'pointer' }}>{isSaving ? '저장 중...' : '임시저장'}</button>
            <button onClick={handlePublish} disabled={isLoading} style={{ padding: '8px 20px', background: '#0f62fe', color: '#fff', border: 'none', borderRadius: '20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{editId ? '수정완료' : '발행'}</button>
          </div>
        </header>
        <div style={{ flex: 1, padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" style={{ width: '100%', padding: '12px 0', border: 'none', fontSize: '24px', fontWeight: '700', outline: 'none', marginBottom: '16px' }} />
          <div style={{ height: '1px', background: '#eee', marginBottom: '16px' }} />
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {tags.map(tag => (
                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', background: '#e8f4ff', color: '#0f62fe', borderRadius: '20px', fontSize: '14px' }}>
                  #{tag}
                  <button onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#0f62fe', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} onBlur={handleAddTag} placeholder="태그 입력 (Enter로 추가)" style={{ padding: '8px 0', border: 'none', fontSize: '14px', outline: 'none', color: '#666', width: '200px' }} />
          </div>
          <textarea ref={contentRef} value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용을 입력하세요..." style={{ width: '100%', minHeight: '400px', padding: '0', border: 'none', fontSize: '16px', lineHeight: 1.8, outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', display: 'flex', gap: '16px', position: 'sticky', bottom: 0, background: '#fff' }}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px' }} title="이미지 추가">🖼️</button>
          <button onClick={() => setShowPreview(!showPreview)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px' }} title="미리보기">👁️</button>
        </div>
        {showPreview && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, overflow: 'auto' }}>
            <div style={{ background: '#fff', margin: '20px', borderRadius: '12px', minHeight: 'calc(100vh - 40px)' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600' }}>미리보기</span>
                <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '24px' }}>
                {previewImage && <img src={previewImage} alt="대표 이미지" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }} />}
                <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>{title || '제목 없음'}</h1>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>{tags.map(tag => <span key={tag} style={{ color: '#0f62fe', fontSize: '14px' }}>#{tag}</span>)}</div>
                <div style={{ fontSize: '16px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{content || '내용 없음'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>로딩 중...</p></div>}>
      <WriteContent />
    </Suspense>
  );
}