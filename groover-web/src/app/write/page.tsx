// src/app/write/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import api from '@/lib/api';
import imageCompression from 'browser-image-compression';
import { X, Image, Eye, Tag } from 'lucide-react';

interface PostData {
  title: string;
  content: string;
  tags: string[];
  previewImage: string | null;
}

interface TagSuggestion {
  id: string;
  name: string;
  useCount: number;
}

// 마크다운 이미지를 HTML로 변환하는 함수
const renderMarkdownImages = (text: string) => {
  if (!text) return null;
  
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  
  return parts.map((part, index) => {
    const imageMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
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
  
  // 태그 자동완성 상태
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
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

  // 태그 자동완성 검색
  useEffect(() => {
    const searchTags = async () => {
      const query = tagInput.trim().replace('#', '');
      if (query.length < 1) {
        setTagSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1'}/tags/free/search?q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await res.json();
        if (data.success && data.data) {
          // 이미 추가된 태그는 제외
          const filtered = data.data.filter(
            (tag: TagSuggestion) => !tags.includes(tag.name)
          );
          setTagSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
          setSelectedSuggestionIndex(-1);
        }
      } catch (err) {
        console.error('태그 검색 실패:', err);
      }
    };

    const debounce = setTimeout(searchTags, 200);
    return () => clearTimeout(debounce);
  }, [tagInput, tags]);

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    const insertPosition = cursorPosition;
    setIsUploading(true);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);

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

      const imageMarkdown = `\n![이미지](${imageUrl})\n`;
      const newContent = 
        content.substring(0, insertPosition) + 
        imageMarkdown + 
        content.substring(insertPosition);
      
      setContent(newContent);
      
      const newCursorPosition = insertPosition + imageMarkdown.length;
      setCursorPosition(newCursorPosition);
      
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.focus();
          contentRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 100);

      if (!previewImage) {
        setPreviewImage(imageUrl);
      }

    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddTag = (tagName?: string) => {
    const tag = (tagName || tagInput).trim().replace('#', '');
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleSelectSuggestion = (suggestion: TagSuggestion) => {
    handleAddTag(suggestion.name);
    tagInputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && tagSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < tagSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSelectSuggestion(tagSuggestions[selectedSuggestionIndex]);
        } else {
          handleAddTag();
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    } else if (e.key === 'Enter' || e.key === ',') {
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
        // 수정 모드
        await api.put(`/blog/posts/${editId}`, data);
        await api.post(`/blog/posts/${editId}/publish`, { publish: true });
      } else {
        // 새 글 작성 모드 - 먼저 저장 후 발행
        const res = await api.post('/blog/posts', data);
        const newPostId = res.data.data?.id || res.data.data?.slug;
        
        // 새 글도 publish 엔드포인트 호출
        if (newPostId) {
          await api.post(`/blog/posts/${newPostId}/publish`, { publish: true });
        }
      }
      
      alert('글이 발행되었습니다!');
      router.push('/blog');
    } catch (err: any) {
      console.error('발행 실패:', err);
      const errorMessage = err.response?.data?.message || '발행에 실패했습니다.';
      alert(errorMessage);
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={24} />
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
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Tag size={16} className="text-gray-400" />
              <span style={{ fontSize: '13px', color: '#999' }}>태그 (최대 10개)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {tags.map(tag => (
                <span 
                  key={tag} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    padding: '6px 12px', 
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
                      padding: '0', 
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            
            {/* 태그 입력 + 자동완성 */}
            <div style={{ position: 'relative' }}>
              <input 
                ref={tagInputRef}
                type="text" 
                value={tagInput} 
                onChange={(e) => setTagInput(e.target.value)} 
                onKeyDown={handleTagKeyDown} 
                onFocus={() => tagInput.trim() && tagSuggestions.length > 0 && setShowSuggestions(true)}
                placeholder="태그 입력 (Enter로 추가)" 
                style={{ 
                  padding: '10px 12px', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px', 
                  outline: 'none', 
                  width: '100%',
                  maxWidth: '300px',
                }} 
              />
              
              {/* 자동완성 드롭다운 */}
              {showSuggestions && tagSuggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    maxWidth: '300px',
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    marginTop: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  {tagSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: 'none',
                        background: selectedSuggestionIndex === index ? '#f5f5f5' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderBottom: index < tagSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                      }}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    >
                      <span style={{ fontSize: '14px', color: '#333' }}>
                        #{suggestion.name}
                      </span>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {suggestion.useCount}회 사용
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              cursor: isUploading ? 'not-allowed' : 'pointer', 
              padding: '8px',
              opacity: isUploading ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }} 
            title="이미지 추가 (현재 커서 위치에 삽입)"
          >
            {isUploading ? (
              <div style={{ 
                width: '24px', 
                height: '24px', 
                border: '2px solid #ddd',
                borderTopColor: '#0f62fe',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : (
              <Image size={24} className="text-gray-600" />
            )}
          </button>
          <button 
            onClick={() => setShowPreview(!showPreview)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }} 
            title="미리보기"
          >
            <Eye size={24} className="text-gray-600" />
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={24} />
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
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {tags.map(tag => (
                    <span key={tag} style={{ color: '#0f62fe', fontSize: '14px' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '16px', lineHeight: 1.8 }}>
                  {renderMarkdownImages(content) || '내용 없음'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 스피너 애니메이션 */}
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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