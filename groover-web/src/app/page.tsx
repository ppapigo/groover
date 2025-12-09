// src/app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import api from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: '안녕하세요! 🛒 Groover 쇼핑 챗봇입니다.\n\n오늘은 어떤 쇼핑을 도와드릴까요?\n\n예시:\n• "5만원대 캠핑 의자 추천해줘"\n• "육아용품 리뷰 보여줘"\n• "다이슨 vs 샤오미 비교해줘"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 대화 히스토리 준비 (최근 10개만)
      const history = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.text,
      }));

      const response = await api.post('/recommendations/chat', {
        message: input,
        history,
      });

      const aiText = response.data?.data?.message || response.data?.message || '응답을 받지 못했습니다.';
      
      const aiResponse: Message = {
        role: 'assistant',
        text: aiText,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error: any) {
      console.error('챗봇 에러:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        text: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 🙏',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <AppHeader />
      <div className="chat-page">
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.role}`}>
              {msg.text.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < msg.text.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          ))}
          {isLoading && (
            <div className="chat-bubble assistant">
              <span className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-bar">
          <textarea
            rows={2}
            placeholder="예: 5만원대 캠핑 의자 추천해줘"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            {isLoading ? '...' : '전송'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #999;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
