import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Pencil, Trash2, Check, X } from 'lucide-react';
import { Message } from '../types';
import clsx from 'clsx';

const EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '👏', '💯'];
const QUICK_REACTIONS = ['❤️', '😂', '🔥', '🎉', '👏'];

interface ChatPanelProps {
  messages: Message[];
  currentUserId: string | null;
  isAdmin?: boolean;
  onSendMessage: (text: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-purple-600 to-pink-600',
  'from-blue-600 to-cyan-600',
  'from-green-600 to-emerald-600',
  'from-orange-600 to-red-600',
  'from-yellow-600 to-orange-600',
];

function getGradient(username: string): string {
  return AVATAR_GRADIENTS[username.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

export function ChatPanel({
  messages, currentUserId, isAdmin,
  onSendMessage, onReaction, onEditMessage, onDeleteMessage,
}: ChatPanelProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = () => {
    if (editingId && editText.trim() && onEditMessage) {
      onEditMessage(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white/80 text-sm">Chat</h3>
          <p className="text-white/30 text-xs">{messages.length} messages</p>
        </div>
        {isAdmin && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-red-300 bg-red-500/15 border border-red-500/30 rounded-full px-1.5 py-0.5">
            Admin
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-white/20 text-sm">No messages yet. Say hi!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.userId === currentUserId;
          const prevMsg = messages[i - 1];
          const showAvatar = !prevMsg || prevMsg.userId !== msg.userId;
          const isEditing = editingId === msg.id;

          return (
            <div
              key={msg.id}
              className={clsx('group animate-fade-in', showAvatar ? 'mt-3' : 'mt-0.5')}
              onMouseEnter={() => setHoveredMessage(msg.id)}
              onMouseLeave={() => setHoveredMessage(null)}
              onClick={() => setHoveredMessage(prev => prev === msg.id ? null : msg.id)}
            >
              <div className={clsx('flex gap-2.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
                {showAvatar ? (
                  <div className={clsx(
                    'w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold bg-gradient-to-br',
                    getGradient(msg.username),
                  )}>
                    {getInitials(msg.username)}
                  </div>
                ) : (
                  <div className="w-7 flex-shrink-0" />
                )}

                <div className={clsx('flex flex-col max-w-[75%]', isMe ? 'items-end' : 'items-start')}>
                  {showAvatar && (
                    <div className={clsx('flex items-baseline gap-2 mb-1', isMe ? 'flex-row-reverse' : '')}>
                      <span className="text-xs font-medium text-white/70">{isMe ? 'You' : msg.username}</span>
                      <span className="text-xs text-white/25">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                        }}
                        autoFocus
                        className="input-field py-1 px-2 text-sm"
                      />
                      <button onClick={saveEdit} className="p-1.5 bg-green-600/30 hover:bg-green-600/50 text-green-400 rounded-lg transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditingId(null); setEditText(''); }} className="p-1.5 bg-white/5 hover:bg-white/10 text-white/40 rounded-lg transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className={clsx(
                      'px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
                      isMe
                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-sm'
                        : 'bg-white/8 text-white/90 rounded-tl-sm',
                    )}>
                      {msg.text}
                    </div>
                  )}

                  {msg.reactions.length > 0 && !isEditing && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {msg.reactions.map(r => (
                        <button
                          key={r.emoji}
                          onClick={() => onReaction(msg.id, r.emoji)}
                          className="flex items-center gap-1 bg-white/8 hover:bg-white/15 border border-white/10 rounded-full px-2 py-0.5 text-xs transition-colors"
                        >
                          <span>{r.emoji}</span>
                          <span className="text-white/60">{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {hoveredMessage === msg.id && !isEditing && (
                  <div className={clsx(
                    'self-center flex gap-0.5',
                    isMe ? 'mr-1' : 'ml-1',
                  )}>
                    {QUICK_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => onReaction(msg.id, emoji)}
                        className="p-1 hover:bg-white/10 rounded-lg text-sm transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => startEdit(msg)}
                          className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/80 transition-colors"
                          title="Nachricht bearbeiten"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMessage?.(msg.id)}
                          className="p-1 hover:bg-red-500/15 rounded-lg text-red-400/60 hover:text-red-400 transition-colors"
                          title="Nachricht löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-white/5">
        {showEmoji && (
          <div className="mb-2 p-2 bg-[#1a1a28] border border-white/10 rounded-xl grid grid-cols-8 gap-1">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { setText(t => t + emoji); setShowEmoji(false); }}
                className="text-xl p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowEmoji(v => !v)}
            className={clsx(
              'p-2 rounded-xl transition-colors flex-shrink-0',
              showEmoji ? 'bg-purple-600/30 text-purple-300' : 'text-white/40 hover:text-white/70 hover:bg-white/8',
            )}
          >
            <Smile className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            maxLength={500}
            className="input-field py-2 text-sm"
          />

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={clsx(
              'p-2 rounded-xl transition-all flex-shrink-0',
              text.trim()
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                : 'bg-white/5 text-white/20 cursor-not-allowed',
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
