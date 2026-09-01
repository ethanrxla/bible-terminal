import { useCallback, useEffect, useState } from 'react';
import { ETHIOPIAN_EDITION_ID, getEdition } from '../data/translations';
import { setEdition as setRouterEdition } from '../services/canonRouter';

const STORAGE_KEY = 'bible-terminal:edition';

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ETHIOPIAN_EDITION_ID;
  } catch {
    return ETHIOPIAN_EDITION_ID;
  }
}

/**
 * The reader's chosen edition, defaulting to the Ethiopian Orthodox Tewahedo
 * text. Kept in sync with the canon router, which reads it when deciding which
 * translation to request for protocanonical books.
 */
export const useEdition = () => {
  const [editionId, setEditionId] = useState<string>(() => {
    const stored = readStored();
    setRouterEdition(stored);
    return stored;
  });

  // Keep the router authoritative even on the first render.
  useEffect(() => {
    setRouterEdition(editionId);
  }, [editionId]);

  const changeEdition = useCallback((id: string) => {
    setRouterEdition(id);
    setEditionId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Preference simply will not persist.
    }
  }, []);

  return { editionId, edition: getEdition(editionId), changeEdition };
};
