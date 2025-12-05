// src/app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import AppHeader from '@/components/layout/AppHeader';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: '안녕하세요! 🛒 Groover 쇼핑 챗봇입니다.\n\n오늘은 어떤 쇼핑을 도와드릴까요?\n\n예시:\n• "5만원대 캠핑 장바구니 추천해줘"\n• "육아용품 리뷰 보여줘"\n• "다이슨 vs 샤오미 비교해줘"',
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Mock AI 응답
    setTimeout(() => {
      const aiResponse: Message = {
        role: 'assistant',
        text: `"${input}"에 대해 검색 중입니다...\n\n관련 장바구니와 리뷰를 찾았어요! 블로그 탭에서 자세한 리뷰를 확인해보세요. 🛍️`,
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
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
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-bar">
          <textarea
            rows={2}
            placeholder="예: 5만원대 캠핑 장바구니 추천해줘"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button onClick={sendMessage}>전송</button>
        </div>
      </div>
    </>
  );
}
