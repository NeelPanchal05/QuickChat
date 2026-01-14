import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function PollCreator({ open, onOpenChange, onCreatePoll }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    } else {
      toast.error("Maximum 10 options allowed");
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleCreatePoll = () => {
    if (!question.trim()) {
      toast.error("Poll question is required");
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      toast.error("At least 2 options are required");
      return;
    }

    onCreatePoll({
      question: question.trim(),
      options: validOptions,
      allowMultiple,
      createdAt: new Date(),
      votes: validOptions.map(() => []),
    });

    // Reset form
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    onOpenChange(false);
    toast.success("Poll created!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <BarChart3 size={20} />
            Create a Poll
          </DialogTitle>
          <DialogDescription className="text-[#A1A1AA]">
            Ask a question and create options for voting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question Input */}
          <div>
            <label className="text-sm font-semibold text-[#A1A1AA] mb-2 block">
              Question
            </label>
            <Input
              placeholder="What's your question?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="bg-black/40 border-white/10 text-white focus:border-[#7000FF]"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-sm font-semibold text-[#A1A1AA] mb-2 block">
              Options
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#7000FF]/20 text-[#7000FF] text-sm font-semibold flex-shrink-0">
                    {index + 1}
                  </span>
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1 bg-black/40 border-white/10 text-white focus:border-[#7000FF]"
                  />
                  {options.length > 2 && (
                    <Button
                      onClick={() => removeOption(index)}
                      size="icon"
                      variant="ghost"
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      <X size={18} />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <Button
                onClick={addOption}
                variant="outline"
                size="sm"
                className="mt-3 w-full border-white/10 text-[#7000FF] hover:bg-[#7000FF]/10"
              >
                <Plus size={16} className="mr-2" />
                Add Option
              </Button>
            )}
          </div>

          {/* Settings */}
          <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded-lg">
            <input
              type="checkbox"
              id="multiple"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-[#7000FF]"
            />
            <label
              htmlFor="multiple"
              className="text-sm text-[#A1A1AA] cursor-pointer"
            >
              Allow multiple selections
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 border-white/10 text-[#A1A1AA] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePoll}
              className="flex-1 bg-[#7000FF] hover:bg-[#5B00D1] text-white"
            >
              Create Poll
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
