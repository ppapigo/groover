// src/app/write/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';
import imageCompression from 'browser-image-compression';

interface PostData {
  title: string;
  content: string;
  tags: string[];
  previewImage: string | null;
}

// 마크다운 이미지를 HTML로 변환하는 함수
const renderMarkdownImages = (text: string) => {
  if (!text) return null;
  
  // ![alt](url) 패턴을 찾아서 분리
  const parts = text.split(/(!\\[.*?\\]\\(.*?\\))/g);
  
  return parts.map((part, index) => {
    const imageMatch = part.match(/!\\[(.*?)\\]\\((.*?)\\)/);
    if (imageMatch) {
      const [, alt, url] = imageMatch;
      return (
        <img
          key={index}
          src={url}
          alt={alt || '이미지'}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px',
            margin: '16px 0',
            display: 'block',
          }}
        />
      );
    }
    // 일반 텍스트는 줄바꿈 처리
    return (
      <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
        {part}
      </span>
    );
  });
};

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
  const [isUploading, setIsUploading] = useState(false);
  
  // 커서 위치 저장용
  const [cursorPosition, setCursorPosition] = useState(0);
  
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

  // textarea에서 커서 위치가 바뀔 때마다 저장
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleContentSelect = () => {
    if (contentRef.current) {
      setCursorPosition(contentRef.current.selectionStart);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 현재 커서 위치 저장 (파일 선택 전에 이미 저장되어 있음)
    const insertPosition = cursorPosition;

    setIsUploading(true);

    try {
      // 이미지 압축
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      console.log('원본 크기:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('압축 후:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');

      // S3에 업로드
      const formData = new FormData();
      formData.append('image', compressedFile);

      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/blog/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('이미지 업로드 실패');
      }

      const data = await res.json();
      const imageUrl = data.data?.url || data.url;

      // 저장된 커서 위치에 이미지 삽입
      const imageMarkdown = `\n![이미지](${imageUrl})\n`;
      const newContent = 
        content.substring(0, insertPosition) + 
        imageMarkdown + 
        content.substring(insertPosition);
      
      setContent(newContent);
      
      // 새 커서 위치 설정 (이미지 다음)
      const newCursorPosition = insertPosition + imageMarkdown.length;
      setCursorPosition(newCursorPosition);
      
      // textarea에 포커스 주고 커서 위치 설정
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.focus();
          contentRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 100);

      // 대표 이미지가 없으면 첫 이미지를 대표로
      if (!previewImage) {
        setPreviewImage(imageUrl);
      }

    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      // 파일 입력 초기화 (같은 파일 다시 선택 가능하도록)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      router.push('/blog');
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>불러오는 중...</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <header style={{ 
          padding: '12px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #eee', 
          position: 'sticky', 
          top: 0, 
          background: '#fff', 
          zIndex: 100 
        }}>
          <button 
            onClick={handleBack} 
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px' }}
          >
            ×
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {lastSaved && (
              <span style={{ fontSize: '12px', color: '#999' }}>
                {lastSaved.toLocaleTimeString()} 저장됨
              </span>
            )}
            <button 
              onClick={() => handleSaveDraft(false)} 
              disabled={isSaving} 
              style={{ 
                padding: '8px 16px', 
                background: '#f5f5f5', 
                border: 'none', 
                borderRadius: '20px', 
                fontSize: '14px', 
                cursor: 'pointer' 
              }}
            >
              {isSaving ? '저장 중...' : '임시저장'}
            </button>
            <button 
              onClick={handlePublish} 
              disabled={isLoading} 
              style={{ 
                padding: '8px 20px', 
                background: '#0f62fe', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '20px', 
                fontSize: '14px', 
                fontWeight: '600', 
                cursor: 'pointer' 
              }}
            >
              {editId ? '수정완료' : '발행'}
            </button>
          </div>
        </header>

        {/* 본문 */}
        <div style={{ flex: 1, padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="제목을 입력하세요" 
            style={{ 
              width: '100%', 
              padding: '12px 0', 
              border: 'none', 
              fontSize: '24px', 
              fontWeight: '700', 
              outline: 'none', 
              marginBottom: '16px' 
            }} 
          />
          
          <div style={{ height: '1px', background: '#eee', marginBottom: '16px' }} />
          
          {/* 태그 입력 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {tags.map(tag => (
                <span 
                  key={tag} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    padding: '4px 12px', 
                    background: '#e8f4ff', 
                    color: '#0f62fe', 
                    borderRadius: '20px', 
                    fontSize: '14px' 
                  }}
                >
                  #{tag}
                  <button 
                    onClick={() => handleRemoveTag(tag)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#0f62fe', 
                      cursor: 'pointer', 
                      fontSize: '16px', 
                      padding: '0', 
                      lineHeight: 1 
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input 
              type="text" 
              value={tagInput} 
              onChange={(e) => setTagInput(e.target.value)} 
              onKeyDown={handleTagKeyDown} 
              onBlur={handleAddTag} 
              placeholder="태그 입력 (Enter로 추가)" 
              style={{ 
                padding: '8px 0', 
                border: 'none', 
                fontSize: '14px', 
                outline: 'none', 
                color: '#666', 
                width: '200px' 
              }} 
            />
          </div>
          
          {/* 내용 입력 */}
          <textarea 
            ref={contentRef} 
            value={content} 
            onChange={handleContentChange}
            onSelect={handleContentSelect}
            onClick={handleContentSelect}
            onKeyUp={handleContentSelect}
            placeholder="내용을 입력하세요...&#10;&#10;💡 팁: 원하는 위치에 커서를 두고 이미지 버튼을 클릭하면 해당 위치에 이미지가 삽입됩니다." 
            style={{ 
              width: '100%', 
              minHeight: '400px', 
              padding: '0', 
              border: 'none', 
              fontSize: '16px', 
              lineHeight: 1.8, 
              outline: 'none', 
              resize: 'none', 
              fontFamily: 'inherit' 
            }} 
          />
        </div>

        {/* 하단 툴바 */}
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid #eee', 
          display: 'flex', 
          gap: '16px', 
          alignItems: 'center',
          position: 'sticky', 
          bottom: 0, 
          background: '#fff' 
        }}>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            style={{ display: 'none' }} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '20px', 
              cursor: isUploading ? 'not-allowed' : 'pointer', 
              padding: '8px',
              opacity: isUploading ? 0.5 : 1,
            }} 
            title="이미지 추가 (현재 커서 위치에 삽입)"
          >
            {isUploading ? '⏳' : '🖼️'}
          </button>
          <button 
            onClick={() => setShowPreview(!showPreview)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '20px', 
              cursor: 'pointer', 
              padding: '8px' 
            }} 
            title="미리보기"
          >
            👁️
          </button>
          {isUploading && (
            <span style={{ fontSize: '14px', color: '#666' }}>
              이미지 업로드 중...
            </span>
          )}
        </div>

        {/* 미리보기 모달 */}
        {showPreview && (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.5)', 
            zIndex: 200, 
            overflow: 'auto' 
          }}>
            <div style={{ 
              background: '#fff', 
              margin: '20px', 
              borderRadius: '12px', 
              minHeight: 'calc(100vh - 40px)' 
            }}>
              <div style={{ 
                padding: '16px', 
                borderBottom: '1px solid #eee', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontWeight: '600' }}>미리보기</span>
                <button 
                  onClick={() => setShowPreview(false)} 
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '24px' }}>
                {previewImage && (
                  <img 
                    src={previewImage} 
                    alt="대표 이미지" 
                    style={{ 
                      width: '100%', 
                      maxHeight: '300px', 
                      objectFit: 'cover', 
                      borderRadius: '8px', 
                      marginBottom: '20px' 
                    }} 
                  />
                )}
                <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
                  {title || '제목 없음'}
                </h1>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  {tags.map(tag => (
                    <span key={tag} style={{ color: '#0f62fe', fontSize: '14px' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                {/* 마크다운 이미지 렌더링 */}
                <div style={{ fontSize: '16px', lineHeight: 1.8 }}>
                  {renderMarkdownImages(content) || '내용 없음'}
                </div>
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
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>로딩 중...</p>
      </div>
    }>
      <WriteContent />
    </Suspense>
  );
}