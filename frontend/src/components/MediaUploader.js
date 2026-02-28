import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, File, Music } from "lucide-react";
import { toast } from "sonner";

export default function MediaUploader({ onUpload, disabled = false }) {
  const fileInputRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = {
    image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
    document: ["application/pdf", "application/msword", "text/plain"],
  };

  const getFileType = (file) => {
    if (ALLOWED_TYPES.image.includes(file.type)) return "image";
    if (ALLOWED_TYPES.audio.includes(file.type)) return "audio";
    if (ALLOWED_TYPES.document.includes(file.type)) return "document";
    return "unknown";
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "image":
        return <ImageIcon size={20} />;
      case "audio":
        return <Music size={20} />;
      case "document":
        return <File size={20} />;
      default:
        return <File size={20} />;
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} is too large (max 50MB)`);
        continue;
      }

      const fileType = getFileType(file);
      if (fileType === "unknown") {
        toast.error(`File type ${file.type} is not supported`);
        continue;
      }

      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const fileObj = {
            id: Math.random(),
            name: file.name,
            type: fileType,
            size: file.size,
            data: reader.result,
            mimeType: file.type,
          };

          setUploadedFiles((prev) => [...prev, fileObj]);
          onUpload(fileObj);
        };
        reader.readAsDataURL(file);
      } finally {
        setUploading(false);
      }
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        size="sm"
        variant="outline"
        className="border-[#7000FF] text-[#7000FF] hover:bg-[#7000FF]/10 w-full"
      >
        <Upload size={18} className="mr-2" />
        {uploading ? "Uploading..." : "Attach Media"}
      </Button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="bg-black/40 border border-white/10 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-[#A1A1AA]">
            Attached Files ({uploadedFiles.length})
          </p>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-black/60 border border-white/5 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="text-[#7000FF] flex-shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{file.name}</p>
                    <p className="text-xs text-[#A1A1AA]">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => removeFile(file.id)}
                  size="icon"
                  variant="ghost"
                  className="text-red-400 hover:bg-red-500/20"
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
