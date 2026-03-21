import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

const DialogContext = createContext();

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
};

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: "confirm", // 'confirm' or 'prompt'
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    resolve: null,
  });

  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: "confirm",
        title: options.title || "Are you sure?",
        description: options.description || "",
        confirmText: options.confirmText || "Yes",
        cancelText: options.cancelText || "Cancel",
        resolve,
      });
    });
  }, []);

  const prompt = useCallback((options) => {
    return new Promise((resolve) => {
      setInputValue(options.defaultValue || "");
      setDialogState({
        isOpen: true,
        type: "prompt",
        title: options.title || "Enter value",
        description: options.description || "",
        confirmText: options.confirmText || "Submit",
        cancelText: options.cancelText || "Cancel",
        resolve,
      });
    });
  }, []);

  // Autofocus input on prompt open
  useEffect(() => {
    if (dialogState.isOpen && dialogState.type === "prompt" && inputRef.current) {
        // Small delay to ensure modal animation completes before focusing
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    }
  }, [dialogState.isOpen, dialogState.type]);

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) {
      if (dialogState.type === "prompt") {
        dialogState.resolve(inputValue);
      } else {
        dialogState.resolve(true);
      }
    }
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) {
      if (dialogState.type === "prompt") {
        dialogState.resolve(null);
      } else {
        dialogState.resolve(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <AlertDialog
        open={dialogState.isOpen}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <AlertDialogContent className="bg-card border border-border scale-95 md:scale-100 flex flex-col items-center text-center max-w-sm rounded-2xl shadow-2xl p-6">
          <AlertDialogHeader className="flex flex-col items-center w-full">
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              {dialogState.title}
            </AlertDialogTitle>
            {dialogState.description && (
              <AlertDialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {dialogState.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          
          {dialogState.type === "prompt" && (
            <div className="w-full mt-5">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-muted border-border focus-visible:ring-primary rounded-xl px-4 py-2"
              />
            </div>
          )}
          
          <AlertDialogFooter className="w-full flex justify-center flex-row gap-3 mt-8 sm:justify-center">
            <AlertDialogCancel asChild>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted/50 hover:bg-muted text-foreground font-medium transition-all"
              >
                {dialogState.cancelText}
              </button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md transition-all animate-pop-in"
              >
                {dialogState.confirmText}
              </button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContext.Provider>
  );
};
