import { useState, type KeyboardEvent, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { Send, Smile, Image, X } from 'lucide-react';
import { cn } from '@/components/ui';
import { EmojiPicker } from './EmojiPicker';
import axios from 'axios';

export const MessageInput = () => {
  const [content, setContent] = useState('');
  const { sendMessage, currentStream, currentTopic } = useChatStore();
  const token = useAuthStore(state => state.accessToken);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for quote events from MessageList
  useEffect(() => {
    const handleAddQuote = (e: CustomEvent) => {
      const quote = e.detail as string;
      setContent(prev => {
        // Add newline before quote if there's existing content
        if (prev.trim()) {
          return prev + '\n\n' + quote;
        }
        return quote;
      });
      inputRef.current?.focus();
    };

    window.addEventListener('addQuote', handleAddQuote as EventListener);
    return () => window.removeEventListener('addQuote', handleAddQuote as EventListener);
  }, []);


  const handleSend = async () => {
    if (!content.trim() || !currentStream || !currentTopic) return;

    setIsSending(true);
    try {
      await sendMessage(content);
      setContent('');
      setImagePreview(null);
    } catch (error) {
       toast.error('Mesaj gönderilemedi');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPos = inputRef.current?.selectionStart || content.length;
    const newContent = content.slice(0, cursorPos) + emoji + content.slice(cursorPos);
    setContent(newContent);
    
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
    }, 0);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yüklenebilir');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Resim boyutu 10MB\'dan küçük olmalı');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5070/api';
      const response = await axios.post(`${apiBase}/upload/image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const { uri } = response.data;
      
      // Convert relative URI to full Zulip URL
      const zulipBase = import.meta.env.VITE_ZULIP_BASE_URL || 'https://bilgisayarkavramlari.zulipchat.com';
      const fullImageUrl = uri.startsWith('http') ? uri : `${zulipBase}${uri}`;
      
      // Add markdown image syntax to message
      const imageMarkdown = `\n![${file.name}](${fullImageUrl})\n`;
      setContent(prev => prev + imageMarkdown);
      
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success('Resim yüklendi!');
    } catch (error: any) {
      console.error('Image upload error:', error);
      
      // Extract detailed error message
      let errorMessage = 'Resim yüklenemedi';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.title) {
        errorMessage = error.response.data.title;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 bg-[#0f1216] border-t border-gray-800/30">
      <div className="max-w-4xl mx-auto px-2">
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-32 rounded-lg border border-gray-700"
            />
            <button
              onClick={() => {
                setImagePreview(null);
                setContent(prev => prev.replace(/!\[.*?\]\(.*?\)/g, '').trim());
              }}
              className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}

        <div className="relative flex items-end gap-3 p-2.5 bg-[#232932] border border-gray-700 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all shadow-2xl overflow-visible">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-indigo-400"
              title="Emoji ekle"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-green-400 disabled:opacity-50"
              title="Resim yükle"
            >
              {uploadingImage ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-green-400 rounded-full animate-spin" />
              ) : (
                <Image className="w-5 h-5" />
              )}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentTopic ? `@${currentTopic} başlığına güvenle yaz...` : 'Bir başlık seçin...'}
              disabled={!currentTopic || isSending}
              className="flex-1 bg-transparent px-4 py-2 text-[14px] focus:outline-none text-gray-200 placeholder:text-gray-600 min-h-[48px]"
            />
            
            <button 
                onClick={handleSend} 
                disabled={!content.trim() || !currentTopic || isSending}
                className={cn(
                    "p-3 rounded-xl transition-all duration-300 shadow-lg active:scale-90",
                    isSending || !content.trim()
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20"
                )}
            >
            {isSending ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
                <Send className="w-5 h-5" />
            )}
            </button>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3">
            <div className="text-[10px] text-gray-600 font-medium tracking-tight">
                <span className="text-gray-500">SHIFT + ENTER</span> satır atlar
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-800"></div>
            <div className="text-[10px] text-gray-600 font-medium tracking-tight uppercase">
                Markdown Aktif
            </div>
        </div>
      </div>
    </div>
  );
};
