// app/hooks/useSecretCommand.ts
"use client";
import { useState, useEffect } from 'react';

export function useSecretCommand(secretCode: string) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let inputSequence = '';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      inputSequence += e.key.toLowerCase();
      
      if (inputSequence.length > secretCode.length) {
        inputSequence = inputSequence.slice(-secretCode.length);
      }

      if (inputSequence === secretCode.toLowerCase()) {
        setIsActive(prev => !prev); 
        inputSequence = ''; 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [secretCode]);

  return isActive;
}