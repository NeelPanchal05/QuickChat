import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Image as ImageIcon, X, Sparkles, Loader2, RefreshCw } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function NovaChatWindow() {
  const { user, token, API } = useAuth();
  
  const [messages, setMessages] = useState([
    {
      id: "init",
      role: "assistant",
      content: `Hello ${user?.real_name?.split(' ')[0] || 'there'}! I am Nova, your intelligent assistant. How can I help you today?`
    }
  ]);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage({
        name: file.name,
        data: event.target.result // base64 URI
      });
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset input
  };

  const clearChat = () => {
    setMessages([
      {
        id: "cleared",
        role: "assistant",
        content: `Chat cleared. What else can we discuss, ${user?.real_name?.split(' ')[0] || 'friend'}?`
      }
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() && !attachedImage) return;

    const currentInput = input;
    const currentImage = attachedImage;
    
    setInput("");
    setAttachedImage(null);

    // Construct the correct content layout
    let userContent = currentInput;
    if (currentImage) {
      userContent = [
        { type: "text", text: currentInput || "Describe this image." },
        { type: "image_url", image_url: { url: currentImage.data } }
      ];
    }

    const newMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      displayText: currentInput, // simple text for rendering
      displayImage: currentImage?.data // simple image for rendering
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      // Build history for API (strip out our UI-only initially-seeded assistant messages)
      const history = [...messages, newMessage]
        .filter(m => m.id !== "init" && m.id !== "cleared")
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // In case the initial system message was not there, AI router will prepend it
      const response = await axios.post(
        `${API}/ai/chat`,
        { messages: history, model: "google/gemma-3n-e4b-it" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data.content
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      toast.error("Failed to connect to Nova.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="p-3 md:p-4 flex justify-between items-center z-10 flex-shrink-0 bg-card/80 border-b border-border backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="rounded-full p-[2px]" style={{background: 'linear-gradient(135deg, #0cebeb, #20e3b2, #29ffc6)'}}>
              <Avatar className="h-9 w-9 border-2 border-background">
                <AvatarFallback className="bg-background text-primary items-center justify-center font-bold">
                  <Sparkles size={18} style={{ color: '#20e3b2' }} />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 online-badge" style={{background:'#20e3b2', borderColor:'hsl(var(--card))'}} />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              Nova AI
            </h3>
            <span className="text-xs text-muted-foreground" style={{color: '#20e3b2'}}>Ready to assist</span>
          </div>
        </div>
        <div>
          <Button variant="ghost" size="icon" onClick={clearChat} className="text-muted-foreground hover:bg-muted/80 rounded-full" title="Clear Context">
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-message-in`}>
              <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* AI Avatar for assistant messages */}
                {!isUser && (
                   <div className="flex items-end gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-card/50 shadow-sm border border-border mt-0.5">
                        <Sparkles size={10} style={{ color: '#20e3b2' }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold font-mono">Nova</span>
                   </div>
                )}
                <div 
                  className={`px-4 py-3 rounded-2xl relative z-10 w-fit text-sm leading-relaxed ${
                    isUser 
                      ? "text-white rounded-tr-sm shadow-md" 
                      : "text-foreground rounded-tl-sm glass-card border-l-[3px]"
                  }`}
                  style={{
                    background: isUser ? 'linear-gradient(135deg, #0cebeb, #20e3b2)' : undefined,
                    borderColor: isUser ? 'transparent' : '#20e3b2',
                  }}
                >
                  {/* User image if provided */}
                  {isUser && m.displayImage && (
                    <div className="mb-2 max-w-sm rounded-lg overflow-hidden border border-white/20">
                      <img src={m.displayImage} alt="Uploaded" className="object-contain max-h-[300px] w-auto" />
                    </div>
                  )}

                  {/* Message textual content */}
                  {isUser ? (
                    <span className="break-words">{m.displayText}</span>
                  ) : (
                    <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {typeof m.content === 'string' ? m.content : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start animate-fade-up pl-7 mt-2">
            <div className="px-4 py-3 rounded-2xl glass-card border-l-[3px] flex items-center gap-2 text-muted-foreground text-sm"
                 style={{ borderColor: '#20e3b2' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: '#20e3b2' }} />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card/80 backdrop-blur-xl border-t border-border z-10 flex flex-col gap-2 relative">
        {/* Attachment preview */}
        {attachedImage && (
          <div className="absolute bottom-[100%] left-4 mb-2 p-1.5 bg-popover rounded-xl border border-border shadow-xl w-32 h-32 flex flex-col animate-fade-up">
            <div className="relative flex-1 rounded-lg overflow-hidden flex items-center justify-center bg-black/10">
              <img src={attachedImage.data} alt="Preview" className="object-cover w-full h-full" />
              <button 
                onClick={() => setAttachedImage(null)}
                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 text-white transition-colors"
                title="Remove image"
              >
                <X size={12} />
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground truncate px-1 mt-1 text-center font-medium">
              {attachedImage.name}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 w-full max-w-5xl mx-auto">
          <label className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer shrink-0">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <ImageIcon size={20} />
          </label>
          
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nova anything..."
            className="flex-1 rounded-full text-foreground text-sm h-12 px-5 bg-muted/60 border-border focus-visible:ring-0 focus-visible:border-transparent transition-all input-glow"
            style={{ '--tw-ring-color': 'rgba(32, 227, 178, 0.4)', '--glow-color': 'rgba(32, 227, 178, 0.15)' }}
            disabled={isLoading}
          />
          
          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && !attachedImage)}
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #0cebeb, #20e3b2)', 
              boxShadow: '0 4px 16px rgba(32, 227, 178, 0.3)'
            }}
          >
            <Send size={18} className="text-white ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
