import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { GlobalNav } from '../../components/GlobalNav/GlobalNav';
import { askChat } from '../../api/chat';
import styles from './ChatPage.module.css';

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, isSending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const question = input.trim();
    if (!question || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setIsSending(true);
    try {
      const reply = await askChat(question);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: 'AI 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.' },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <GlobalNav />
      <div className={styles.content}>
        <Link className={styles.backLink} to="/">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          홈으로
        </Link>
        <h1 className={styles.title}>AI 상담</h1>
        <p className={styles.subtitle}>건강 관련 질문을 자유롭게 물어보세요.</p>

        <div className={styles.messages} ref={listRef}>
          {messages.length === 0 && !isSending && (
            <p className={styles.emptyState}>아직 대화가 없습니다. 궁금한 점을 입력해보세요.</p>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`${styles.bubbleRow} ${
                message.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowAssistant
              }`}
            >
              <div
                className={`${styles.bubble} ${
                  message.role === 'user'
                    ? styles.bubbleUser
                    : message.role === 'error'
                      ? styles.bubbleError
                      : styles.bubbleAssistant
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isSending && (
            <div className={`${styles.bubbleRow} ${styles.bubbleRowAssistant}`}>
              <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>답변을 준비하고 있어요…</div>
            </div>
          )}
        </div>

        <form className={styles.composer} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            placeholder="질문을 입력하세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
          />
          <button className={styles.sendButton} type="submit" disabled={isSending || !input.trim()}>
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
