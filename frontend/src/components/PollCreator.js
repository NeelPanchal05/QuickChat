import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function PollCreator({ onClose, onCreatePoll }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 5) setOptions([...options, ""]);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    if (!question.trim()) return toast.error("Question is required");
    if (options.some((o) => !o.trim()))
      return toast.error("All options must be filled");

    onCreatePoll({ question, options, allow_multiple: allowMultiple });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-primary" size={24} />
        <h2 className="text-xl font-bold text-foreground">Create Poll</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block text-muted-foreground">
            Question
          </label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something..."
            className="bg-muted border-border"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium mb-1 block text-muted-foreground">
            Options
          </label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="bg-muted border-border"
              />
              {options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X size={18} />
                </Button>
              )}
            </div>
          ))}
          {options.length < 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addOption}
              className="w-full mt-2 border-dashed"
            >
              <Plus size={16} className="mr-2" /> Add Option
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="multiple"
            checked={allowMultiple}
            onCheckedChange={setAllowMultiple}
          />
          <label
            htmlFor="multiple"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Allow multiple answers
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          className="bg-primary text-primary-foreground"
        >
          Create Poll
        </Button>
      </div>
    </div>
  );
}
