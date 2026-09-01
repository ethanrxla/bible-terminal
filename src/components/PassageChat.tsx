import React, { useEffect, useRef, useState } from 'react';
import { MessageCircleQuestion, Send, Loader2, Clock, Trash2 } from 'lucide-react';
import { askAboutPassage } from '../services/ai';
import { RateLimitedError, type RateLimitInfo } from '../services/rateLimit';
import type { ModelProfile } from '../services/models';
import ScriptureText from './ScriptureText';
import type { CanonSection } from '../types/canon';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  /** Which model produced an assistant turn. */
  model?: ModelProfile;
}

interface PassageChatProps {
  passage?: { text: string; reference: string; canon?: CanonSection };
  /** Opens a cited reference in the canon browser. */
  onNavigate?: (bookId: string, chapter: number) => void;
}

const SUGGESTIONS = [
  'What does this passage mean in context?',
  'Where else does scripture say something similar?',
  'Why is this book in the Ethiopian canon?',
];

const PassageChat: React.FC<PassageChatProps> = ({ passage, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [model, setModel] = useState<ModelProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // A question is about a specific passage; carrying the thread across a new
  // hourly verse would attach answers to the wrong text.
  useEffect(() => {
    setTurns([]);
    setStreaming('');
    setError(null);
  }, [passage?.reference]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isAsking) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const history = turns;
    setTurns([...history, { role: 'user', content: trimmed }]);
    setQuestion('');
    setStreaming('');
    setError(null);
    setIsAsking(true);

    try {
      const answer = await askAboutPassage(
        {
          question: trimmed,
          passage,
          history: history.map(({ role, content }) => ({ role, content })),
        },
        (delta) => {
          if (controller.signal.aborted) return;
          setRateLimit(null);
          setStreaming((prev) => prev + delta);
        },
        {
          signal: controller.signal,
          onRateLimit: (info) => !controller.signal.aborted && setRateLimit(info),
          onModel: (chosen) => !controller.signal.aborted && setModel(chosen),
        }
      );

      if (controller.signal.aborted) return;
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', content: answer.text, model: answer.model },
      ]);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof RateLimitedError
          ? 'The AI provider is rate limiting requests. Try again in a moment.'
          : 'Could not reach the model. Try again.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsAsking(false);
        setStreaming('');
        setRateLimit(null);
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg font-terminal text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
      >
        <MessageCircleQuestion className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        Ask about this passage
      </button>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/40">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h3 className="font-terminal text-sm">Ask about this passage</h3>
        </div>
        <div className="flex items-center gap-1">
          {turns.length > 0 && (
            <button
              onClick={() => { setTurns([]); setError(null); }}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5 opacity-60" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="font-terminal text-xs opacity-60 hover:opacity-100 px-2"
          >
            close
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[28rem] overflow-y-auto">
        {turns.length === 0 && !isAsking && (
          <div className="space-y-2">
            <p className="text-xs opacity-60 font-terminal">
              Answers cite scripture as the primary source. Citations are clickable.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => ask(suggestion)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, index) =>
          turn.role === 'user' ? (
            <p key={index} className="font-terminal text-sm text-amber-700 dark:text-amber-400">
              &gt; {turn.content}
            </p>
          ) : (
            <div key={index} className="space-y-1">
              <p className="font-verse text-base leading-relaxed whitespace-pre-wrap">
                <ScriptureText text={turn.content} onNavigate={onNavigate} />
              </p>
              {turn.model && (
                <p className="text-[0.65rem] font-terminal opacity-50">
                  answered by {turn.model.label}
                </p>
              )}
            </div>
          )
        )}

        {isAsking && (
          streaming ? (
            <p className="font-verse text-base leading-relaxed whitespace-pre-wrap">
              <ScriptureText text={streaming} onNavigate={onNavigate} />
              <span className="inline-block w-2 h-4 ml-0.5 bg-amber-400 animate-cursor-blink align-text-bottom" />
            </p>
          ) : (
            <p className="flex items-center gap-2 font-terminal text-sm opacity-70">
              {rateLimit ? (
                <>
                  <Clock className="h-4 w-4 text-amber-500" />
                  Rate limited — retrying in {Math.ceil(rateLimit.waitMs / 1000)}s
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching the scriptures{model ? ` with ${model.label}` : ''}…
                </>
              )}
            </p>
          )
        )}

        {error && (
          <p className="font-terminal text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <form
        onSubmit={(event) => { event.preventDefault(); ask(question); }}
        className="flex gap-2 p-3 border-t border-slate-200 dark:border-slate-700"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this passage…"
          disabled={isAsking}
          className="flex-1 px-3 py-2 rounded-md bg-transparent border border-slate-200 dark:border-slate-700 font-terminal text-sm focus:outline-none focus:border-amber-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className="px-3 py-2 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 disabled:opacity-40 transition-colors"
          aria-label="Send question"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default PassageChat;
