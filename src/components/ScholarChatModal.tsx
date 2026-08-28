import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, BookOpen } from 'lucide-react';

interface ScholarChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContext?: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ScholarChatModal: React.FC<ScholarChatModalProps> = ({
  isOpen,
  onClose,
  currentContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Namaste! I am the Mudra Lens Cultural & Shastric Scholar. Ask me anything about Indian classical dance traditions, Natya Shastra shlokas, Mudra Viniyogas, Tala polyrhythms, regional folk heritage, or mythology.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: currentContext,
        }),
      });

      const data = await response.json();
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.message || 'Unable to connect with AI Scholar service.' },
        ]);
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Network request error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'What is the difference between Asamyuta and Samyuta Hastas in Abhinaya Darpana?',
    'Explain the 9 Rasas (Navarasa) and their presiding deities.',
    'What is the spiritual significance of the Aramandi stance in Bharatanatyam?',
    'Tell me about the UNESCO Intangible Heritage status of Kalbelia and Garba.',
  ];

  return (
    <div
      id="scholar-chat-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="scholar-chat-card"
        className="bg-stone-900 border border-stone-700/80 rounded-2xl max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-950 border border-amber-800/60 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Mudra Lens Cultural Scholar</h3>
              <p className="text-xs text-stone-400">
                Grounded in Natya Shastra, Abhinaya Darpana & Regional Archives
              </p>
            </div>
          </div>
          <button
            id="btn-close-scholar-chat"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-full bg-stone-800 hover:bg-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${
                m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user'
                    ? 'bg-amber-600 text-white'
                    : 'bg-purple-950 border border-purple-800 text-purple-300'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-3 text-xs md:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-amber-600 text-white rounded-tr-none'
                    : 'bg-stone-950/80 border border-stone-800 text-stone-200 rounded-tl-none'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-xs text-amber-400 p-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Consulting classical dance treatises...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sample Prompt Chips (Only if 1-2 messages) */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {sampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-800/80 text-stone-300 hover:bg-stone-700 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-stone-800 bg-stone-950/80 flex items-center space-x-2">
          <input
            id="input-scholar-chat"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about a mudra, shloka, rasa, or dance tradition..."
            className="flex-1 px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
          />
          <button
            id="btn-send-scholar-chat"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
