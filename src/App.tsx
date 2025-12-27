import { useState } from 'react';
import KanaQuiz from '~/components/KanaQuiz';
import KanaSelection from '~/components/KanaSelection';

import type { Session } from "~/types/progress";

function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);

  const handleStart = (kanaIds: string[]) => {
    const newSession: Session = {
      uuid: generateUUID(),
      selectedKanaIds: kanaIds,
      enemiesDefeated: 0,
      totalCorrect: 0,
      totalAttempts: 0,
    };
    setSession(newSession);
  };

  const handleBack = () => {
    setSession(null);
  };

  return (
    <main>
      {session ? (
        <KanaQuiz session={session} onBack={handleBack} />
      ) : (
        <KanaSelection onStart={handleStart} />
      )}
    </main>
  );
}

export default App;
