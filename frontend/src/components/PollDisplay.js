import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function PollDisplay({ pollData }) {
  const { user, token, API } = useAuth();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    // Initial fetch using the ID from the message content
    if (pollData?._id) {
      fetchPoll(pollData._id);
    } else {
      // Fallback for immediate display from optimistic update
      setPoll(pollData);
      setLoading(false);
    }
  }, [pollData]);

  const fetchPoll = async (id) => {
    try {
      const res = await axios.get(`${API}/polls/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPoll(res.data);
    } catch (e) {
      console.error("Poll fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (index) => {
    if (!poll || !poll._id) return;

    // Check if already voted
    const hasVoted = poll.options[index].votes.includes(user.user_id);
    if (hasVoted) return;

    setVoting(true);
    try {
      await axios.post(
        `${API}/polls/${poll._id}/vote?option_index=${index}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchPoll(poll._id);
      toast.success("Vote recorded");
    } catch (e) {
      toast.error("Failed to vote");
    } finally {
      setVoting(false);
    }
  };

  if (loading)
    return <div className="text-xs text-muted-foreground">Loading poll...</div>;
  if (!poll)
    return <div className="text-xs text-destructive">Poll unavailable</div>;

  const totalVotes = poll.options.reduce(
    (acc, opt) => acc + opt.votes.length,
    0
  );

  return (
    <div className="w-64 space-y-3 p-1">
      <h3 className="font-semibold text-sm mb-2">{poll.question}</h3>
      <div className="space-y-2">
        {poll.options.map((opt, i) => {
          const voteCount = opt.votes.length;
          const percentage =
            totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
          const isSelected = opt.votes.includes(user.user_id);

          return (
            <div key={i} className="space-y-1">
              <button
                onClick={() => handleVote(i)}
                disabled={voting || isSelected}
                className={`w-full text-left text-xs p-2 rounded border transition-colors flex justify-between items-center ${
                  isSelected
                    ? "bg-primary/20 border-primary"
                    : "bg-background/50 border-border hover:bg-accent"
                }`}
              >
                <span>{opt.text}</span>
                {isSelected && (
                  <CheckCircle2 size={14} className="text-primary" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <Progress value={percentage} className="h-1.5" />
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-muted-foreground text-right mt-1">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
