// app/contexts/GothamContext.tsx
"use client";
import { createContext, useContext, useState, useEffect } from 'react';

// 1. Create the Context
const GothamContext = createContext({ isGothamMode: false });

// 2. Create the Provider Component
export function GothamProvider({ children }: { children: React.ReactNode }) {
  const [isGothamMode, setIsGothamMode] = useState(false);

  useEffect(() => {
    let inputSequence = '';
    const secretCode = 'gotham';

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore typing in input fields (like login or contact forms)
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      inputSequence += e.key.toLowerCase();
      
      if (inputSequence.length > secretCode.length) {
        inputSequence = inputSequence.slice(-secretCode.length);
      }

      if (inputSequence === secretCode) {
        setIsGothamMode(prev => !prev);
        inputSequence = ''; // Reset
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <GothamContext.Provider value={{ isGothamMode }}>
      {children}
    </GothamContext.Provider>
  );
}

// 3. Create a Custom Hook for easy access
export const useGotham = () => useContext(GothamContext);