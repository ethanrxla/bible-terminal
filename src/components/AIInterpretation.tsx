import React, { useEffect, useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { generateInterpretation } from '../services/openai';

interface AIInterpretationProps {
  text: {
    text: string;
    reference: string;
    type?: 'verse' | 'passage' | 'story';
  };
  type: 'verse' | 'passage' | 'story';
}

const AIInterpretation: React.FC<AIInterpretationProps> = ({ text, type }) => {
  const [interpretation, setInterpretation] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    // Reset state when text changes
    setIsFetching(true);
    setIsVisible(false);
    setError(false);
    
    // Generate AI interpretation
    const fetchInterpretation = async () => {
      try {
        const result = await generateInterpretation({
          text: text.text,
          reference: text.reference,
          type: type
        });
        
        setInterpretation(result);
        setIsFetching(false);
        
        // Show interpretation with animation after generation completes
        setTimeout(() => setIsVisible(true), 300);
      } catch (err) {
        console.error('Failed to generate interpretation:', err);
        setError(true);
        setIsFetching(false);
        
        // Show error state
        setTimeout(() => setIsVisible(true), 300);
      }
    };

    // Add a realistic delay to simulate processing
    const timer = setTimeout(fetchInterpretation, 1500);
    
    return () => clearTimeout(timer);
  }, [text, type]);

  const getTypeLabel = () => {
    switch (type) {
      case 'story': return 'AI STORY INTERPRETATION';
      case 'passage': return 'AI PASSAGE INTERPRETATION';
      default: return 'AI VERSE INTERPRETATION';
    }
  };

  return (
    <div className={`
      transition-all duration-1000
      transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
    `}>
      <div className="flex items-center gap-2 mb-3">
        {error ? (
          <AlertCircle className="h-4 w-4 text-red-400" />
        ) : (
          <Sparkles className="h-4 w-4 text-purple-400" />
        )}
        <h3 className={`font-terminal text-sm ${error ? 'text-red-400' : 'text-purple-400 dark:text-purple-300'}`}>
          {getTypeLabel()}
        </h3>
      </div>
      
      <div className={`
        p-5 rounded-md
        ${error 
          ? 'dark:bg-red-900/20 dark:border-red-700/30 bg-red-50 border border-red-200'
          : 'dark:bg-purple-900/20 dark:border-purple-700/30 bg-purple-50 border border-purple-200'
        }
      `}>
        {isFetching ? (
          <div className="flex items-center justify-center py-4">
            <div className="font-terminal text-sm text-purple-400 animate-pulse">
              {type === 'story' ? 'Interpreting biblical story...' : 
               type === 'passage' ? 'Analyzing scripture passage...' : 
               'Interpreting verse...'}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="font-terminal text-sm text-red-600 dark:text-red-400 mb-2">
              Unable to generate AI interpretation
            </p>
            <p className="font-verse text-sm text-red-500 dark:text-red-300">
              Scripture speaks to us across time, offering wisdom and guidance for our daily lives.
            </p>
          </div>
        ) : (
          <p className="font-verse text-base md:text-lg leading-relaxed text-purple-800 dark:text-purple-200">
            {interpretation}
          </p>
        )}
      </div>
    </div>
  );
};

export default AIInterpretation;