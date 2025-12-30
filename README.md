# Kana Dojo

An interactive, RPG-style application for learning Japanese Hiragana and Katakana characters using spaced repetition and engaging visual feedback.

## Overview

Kana Learning Game combines effective spaced repetition algorithms (FSRS) with an engaging battle-style interface. Players practice recognizing kana characters by typing their romaji equivalents, with progress tracked through an adaptive learning system.

## Features

### 🎮 Game Mechanics

- **Battle-style Interface**: Player character on the left, enemy on the right
- **Enemy-Based Combat System**:
  - Each enemy has unique stats: Health (5-20 HP), Attack frequency, and Defense prompt length
  - Defeat enemies to progress - attack prompt length increases with each enemy defeated
  - Player has 3 lives - lose a life when failing defense prompts
- **Attack & Defense Prompts**:
  - **Attack prompts**: Default mode - correct answers deal damage to enemies
  - **Defense prompts**: Triggered after X attack attempts - longer prompts that protect player lives
  - Attack prompt length starts at 1 character and increases by 1 per enemy defeated
  - Defense prompt length is determined by enemy's defense stat
- **Animated Characters**:
  - Player with idle, attack, and hit animations (displays lives above sprite)
  - Enemy with idle, attack, hit, and die animations (displays health bar above sprite)
  - Projectile animations that fire from player to enemy on correct answers
- **Visual Feedback**: Color-coded header bar (green for correct, red for incorrect) showing previous answers

### 📚 Learning Features

- **Spaced Repetition**: Uses FSRS (Free Spaced Repetition Scheduler) algorithm for optimal review timing
- **Adaptive Difficulty**: System prioritizes characters you struggle with
- **Progress Tracking**:
  - Per-character accuracy tracking
  - Visual indicators showing mastery level (gray/red/yellow/green)
  - Persistent progress saved to localStorage
- **Kana Selection**: Choose which kana groups to practice (Hiragana/Katakana, vowels, consonants, combinations)

### 🎨 User Interface

- **Clean, Modern Design**: Built with Tailwind CSS and shadcn/ui components
- **Responsive Layout**: Works on various screen sizes
- **Real-time Feedback**: Immediate visual and animation feedback for answers
- **Progress Visualization**: Progress bars and accuracy statistics

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Framer Motion** - Animation library for projectile effects
- **ts-fsrs** - Spaced repetition algorithm implementation
- **shadcn/ui** - UI component library

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd kana-dojo
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Enemy.tsx          # Enemy character component with animations and health management
│   ├── GameOver.tsx       # Game over screen component
│   ├── KanaQuiz.tsx        # Main quiz/game component with combat logic
│   ├── KanaSelection.tsx   # Kana group selection screen
│   ├── Player.tsx          # Player character component with animations and lives display
│   ├── Projectile.tsx      # Projectile animation component
│   └── ui/                 # Reusable UI components (shadcn/ui)
├── data/
│   └── kana.ts             # Kana character data (Hiragana & Katakana)
├── assets/
│   ├── player/             # Player sprite animations (idle, attack, hit)
│   ├── enemy/              # Enemy sprite animations (idle, attack, hit, die)
│   └── projectile/         # Projectile sprite animations
├── utils/
│   ├── fsrs.ts             # FSRS spaced repetition logic
│   └── storage.ts          # localStorage persistence utilities
└── types/
    └── progress.ts          # TypeScript types for progress tracking
```

## How It Works

1. **Selection Phase**: Choose which kana groups you want to practice
2. **Combat Phase**:
   - **Attack Mode**: Kana characters are displayed (length increases with enemies defeated)
   - Type the romaji equivalent
   - Correct answers deal 1 damage to the enemy and trigger attack animations
   - Incorrect answers don't deal damage but still count toward enemy's attack counter
   - After X attack attempts (determined by enemy's attack stat), switch to defense mode
3. **Defense Mode**:
   - Longer prompts appear (length = enemies defeated + enemy's defense stat)
   - Correct answers block the attack - no damage taken
   - Incorrect answers cause player to lose 1 life
   - After defense prompt, return to attack mode
4. **Enemy Defeat**:
   - When enemy health reaches 0, enemy is defeated
   - New enemy spawns with random stats
   - Attack prompt length increases by 1
   - Attack attempt counter resets
5. **Game Over**:
   - When player lives reach 0, game over screen appears
   - Can restart to return to kana selection
6. **Progress Tracking**:
   - Each character's performance is tracked using FSRS
   - Characters you struggle with appear more frequently
   - Progress persists between sessions
   - Enemies defeated counter tracks progression

## Animation Details

- **Player Attack**: 0.2s wind-up delay before projectile fires
- **Projectile**: Animates from player wand position to enemy over 0.6s
- **Enemy Hit**: Delayed by 0.4s to sync with projectile impact
- **Character Animations**: Sprite-based animations with configurable FPS

## Development

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run build
```

## License

Private project - All rights reserved
