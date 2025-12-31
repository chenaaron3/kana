import { create } from "zustand";

import { loggerMiddleware } from "./middleware";
import { createGameSlice } from "./slices/gameSlice";
import { createQuizSlice } from "./slices/quizSlice";

import type { QuizSlice } from "./slices/quizSlice";

import type { GameSlice } from "./slices/gameSlice";
import type { Session } from "~/types/progress";

export type GameStore = GameSlice & QuizSlice;

export const createGameStore = (initialSession: Session) => {
  return create<GameStore>()(
    loggerMiddleware(
      (...a) => ({
        ...createGameSlice(initialSession)(...a),
        ...createQuizSlice()(...a),
      }),
      "GameStore"
    )
  );
};

export type GameStoreHook = ReturnType<typeof createGameStore>;
