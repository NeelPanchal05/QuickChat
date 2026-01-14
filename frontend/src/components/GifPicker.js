import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

const GIPHY_API_KEY = "demo"; // Replace with actual GIPHY API key

export default function GifPicker({ open, onOpenChange, onSelectGif }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trendingGifs, setTrendingGifs] = useState([]);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (open) {
      fetchTrendingGifs();
    }
  }, [open]);

  const fetchTrendingGifs = async () => {
    setLoading(true);
    try {
      // Using a simpler approach - these are placeholder GIF URLs
      // In production, integrate with Giphy API or similar
      const trendingGifUrls = [
        "https://media.giphy.com/media/3o6Zt6KHxJTbXCTAyQ/giphy.gif",
        "https://media.giphy.com/media/l0HlNaQ9NsRTe1PFS/giphy.gif",
        "https://media.giphy.com/media/3o85xIO33l7RlmLR4I/giphy.gif",
        "https://media.giphy.com/media/3ohzdKdb7NcmZgEA2c/giphy.gif",
        "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
        "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
      ];
      setTrendingGifs(trendingGifUrls);
      setGifs(trendingGifUrls);
    } catch (error) {
      toast.error("Failed to load GIFs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setGifs(trendingGifs);
      return;
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // In production, make actual API call to Giphy
        // For now, filter from trending or show placeholder
        const filtered = trendingGifs.filter((gif) =>
          gif.includes(query.toLowerCase())
        );
        setGifs(filtered.length > 0 ? filtered : trendingGifs);
      } catch (error) {
        toast.error("Search failed");
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Find GIFs</DialogTitle>
          <DialogDescription className="text-[#A1A1AA]">
            Search and select a GIF to share
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
              size={18}
            />
            <Input
              placeholder="Search GIFs..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-black/40 border-white/10 text-white focus:border-[#7000FF]"
            />
          </div>

          {/* GIF Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-[#7000FF]" size={32} />
              </div>
            ) : gifs.length > 0 ? (
              gifs.map((gif, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelectGif(gif);
                    onOpenChange(false);
                  }}
                  className="group relative rounded-lg overflow-hidden aspect-video bg-black/60 hover:opacity-90 transition-opacity"
                >
                  <img
                    src={gif}
                    alt="GIF"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100">
                      Select
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-[#A1A1AA]">
                <p>No GIFs found</p>
                <button
                  onClick={() => handleSearch("")}
                  className="text-[#7000FF] hover:underline text-sm mt-2"
                >
                  View trending
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
