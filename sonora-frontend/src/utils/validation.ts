/**
 * Client-Side Validation for Natural Language Listening Moods & Edge Cases.
 * Detects numbers, gibberish, symbols, and non-musical requests.
 */

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  reason?: string;
}

// Curated list of music genres, mood descriptors, acoustic terms, and listening contexts
export const MUSIC_AND_MOOD_KEYWORDS = new Set([
  // Moods & Emotional states
  'calm', 'chill', 'relax', 'relaxing', 'relaxed', 'peaceful', 'quiet', 'soft',
  'gentle', 'serene', 'soothing', 'mellow', 'ambient', 'meditative', 'zen',
  'happy', 'cheerful', 'uplifting', 'feel good', 'joy', 'joyful', 'warm', 'bright',
  'sunny', 'euphoric', 'ecstatic', 'bliss', 'blissful', 'smile', 'positive',
  'sad', 'melancholy', 'melancholic', 'sorrow', 'tear', 'crying', 'cry', 'wistful',
  'gloomy', 'dark', 'moody', 'lonely', 'alone', 'nostalgic', 'nostalgia', 'heartbreak',
  'energetic', 'upbeat', 'fast', 'hype', 'intense', 'aggressive', 'heavy', 'powerful',
  'dynamic', 'motivating', 'motivational', 'explosive', 'angry', 'rage',
  'dreamy', 'ethereal', 'atmospheric', 'spacey', 'trippy', 'psychedelic', 'cosmic',
  'romantic', 'love', 'sensual', 'sexy', 'intimate', 'sweet', 'passionate',
  'spooky', 'eerie', 'mysterious', 'dramatic', 'epic', 'cinematic', 'haunting',
  'funky', 'groovy', 'playful', 'bouncy', 'vibrant', 'quirky',

  // Listening Contexts & Activities
  'study', 'studying', 'focus', 'deep focus', 'concentrate', 'concentration',
  'work', 'working', 'office', 'coding', 'programming', 'reading', 'writing',
  'sleep', 'sleeping', 'sleepy', 'bedtime', 'insomnia', 'nap', 'drowsy',
  'night', 'late night', '3 am', '3am', 'midnight', 'nocturnal', 'dawn', 'dusk',
  'morning', 'breakfast', 'coffee', 'tea', 'wake up', 'sunrise', 'sunset', 'evening',
  'workout', 'gym', 'gymming', 'run', 'running', 'jogging', 'cardio', 'lifting',
  'weights', 'fitness', 'training', 'exercise', 'crossfit', 'yoga', 'stretch',
  'walk', 'walking', 'hiking', 'commute', 'driving', 'drive', 'road trip', 'highway',
  'party', 'club', 'clubbing', 'dance', 'dancing', 'rave', 'festival',
  'rain', 'rainy', 'storm', 'thunder', 'cloudy', 'autumn', 'winter', 'summer', 'spring',
  'beach', 'ocean', 'sea', 'bonfire', 'campfire', 'cozy', 'fireplace', 'lounge', 'cafe',
  'gaming', 'gamer', 'chillout', 'meditation', 'chores', 'cleaning',

  // Genres & Styles
  'pop', 'rock', 'indie', 'electronic', 'electronica', 'synthwave', 'retrowave', 'vaporwave',
  'lo-fi', 'lofi', 'chillhop', 'trip hop', 'downtempo', 'ambient', 'drone',
  'hip hop', 'hip-hop', 'hiphop', 'rap', 'trap', 'r&b', 'rnb', 'soul', 'neo-soul', 'funk',
  'jazz', 'blues', 'classical', 'neo-classical', 'piano', 'acoustic', 'folk', 'country',
  'metal', 'heavy metal', 'death metal', 'punk', 'hardcore', 'post-rock', 'grunge',
  'house', 'deep house', 'tech house', 'techno', 'edm', 'trance', 'dubstep', 'dnb',
  'drum and bass', 'garage', 'disco', 'reggae', 'dub', 'afrobeat', 'latin', 'salsa',
  'bossa nova', 'k-pop', 'kpop', 'j-pop', 'jpop', 'shoegaze', 'emo', 'soundtrack',
  'score', 'orchestral', 'choral', 'opera', 'ska', 'gospel',

  // Acoustic Features
  'piano', 'guitar', 'strings', 'violin', 'cello', 'bass', 'synth', 'synths',
  'rhodes', 'keyboard', 'drums', 'beat', 'beats', '808', 'brass', 'sax', 'saxophone',
  'vocal', 'vocals', 'voice', 'singing', 'instrumental', 'tempo', 'bpm', 'rhythm',
  'melody', 'melodic', 'harmony', 'vibe', 'vibes', 'tune', 'tunes', 'music', 'song', 'songs'
]);

// Short recognized abbreviations (valid even with length <= 3)
export const SHORT_VALID_TOKENS = new Set([
  'pop', 'rap', 'r&b', 'rnb', 'edm', 'gym', 'sad', 'joy', 'run', 'dnb', 'dub',
  'sax', 'lofi', '80s', '90s', '70s', '60s', 'hip', 'hop', 'cry', 'tea', 'nap'
]);

const KEYBOARD_MASH_PATTERNS = [
  'asdfg', 'sdfgh', 'dfghj', 'fghjk', 'ghjkl',
  'qwert', 'werty', 'ertyu', 'rtyui', 'tyuio', 'yuiop',
  'zxcvb', 'xcvbn', 'cvbnm',
  '12345', '23456', '34567', '45678', '56789', '67890',
  'lkjhg', 'poiuy', 'mnbvc'
];

const OFF_TOPIC_STARTERS = [
  /^what\s+(is|are|was|were)\s+(the|a|an)\b/i,
  /^who\s+(is|are|was|were)\b/i,
  /^where\s+(is|are|was|were)\b/i,
  /^how\s+(to|do|does|did|can|could|is|are)\b/i,
  /^why\s+(is|are|do|does|did)\b/i,
  /^when\s+(did|was|will|is)\b/i,
  /^explain\s+(how|what|why|the)\b/i,
  /^tell\s+me\s+about\b/i,
  /^write\s+(code|python|java|javascript|c\+\+|sql|an\s+essay|a\s+poem|script)\b/i,
  /^buy\s+(a|an|the|some)\b/i,
  /^cook\s+(a|an|the|some)\b/i
];

export function validateMoodPrompt(query: string): ValidationResult {
  if (!query || !query.trim()) {
    return {
      isValid: false,
      errorMessage: 'Please describe your listening mood first.',
      reason: 'empty_query'
    };
  }

  const raw = query.trim();
  const lowered = raw.toLowerCase();

  // 1. Length check
  if (raw.length > 500) {
    return {
      isValid: false,
      errorMessage: 'Your prompt is too long (max 500 characters). Please enter a concise mood.',
      reason: 'excessive_length'
    };
  }

  // 2. Pure numbers or numeric predominance (e.g., "23458792345345")
  const digitsCount = (raw.match(/\d/g) || []).length;
  const lettersCount = (raw.match(/[a-zA-Z]/g) || []).length;

  if (lettersCount === 0 && digitsCount > 0) {
    return {
      isValid: false,
      errorMessage: "Numbers alone don't describe a mood. Please describe a feeling, tempo, activity, or genre (e.g., 'Late Night Study', 'Heavy Workout').",
      reason: 'numeric_only'
    };
  }

  if (digitsCount > 0 && lettersCount > 0 && digitsCount / raw.length > 0.5) {
    const hasKw = Array.from(MUSIC_AND_MOOD_KEYWORDS).some(k => lowered.includes(k));
    if (!hasKw) {
      return {
        isValid: false,
        errorMessage: 'Please enter a valid listening mood. Numbers or random codes cannot be translated into music recommendations.',
        reason: 'numeric_dominated'
      };
    }
  }

  // 3. Pure symbols / punctuation
  if (lettersCount === 0 && digitsCount === 0) {
    return {
      isValid: false,
      errorMessage: "Symbols and punctuation don't indicate a musical mood. Please enter words describing your vibe or listening context.",
      reason: 'symbols_only'
    };
  }

  // 4. Short length check (< 3 characters)
  const cleanedAlpha = lowered.replace(/[^a-z0-9]/g, '');
  if (cleanedAlpha.length < 3) {
    if (!SHORT_VALID_TOKENS.has(cleanedAlpha)) {
      return {
        isValid: false,
        errorMessage: 'Your prompt is too short. Please describe your listening mood with a few descriptive words or a recognized genre.',
        reason: 'too_short'
      };
    }
  }

  // 5. Repetitive characters (e.g. "aaaaa", "zzzzzz")
  if (/(.)\1{4,}/.test(lowered)) {
    const hasKw = Array.from(MUSIC_AND_MOOD_KEYWORDS).some(k => lowered.includes(k));
    if (!hasKw) {
      return {
        isValid: false,
        errorMessage: "That doesn't look like a mood or vibe. Please enter a valid mood (e.g., 'deep focus', 'mellow acoustic', 'synthwave night drive').",
        reason: 'repetitive_characters'
      };
    }
  }

  // 6. Keyboard mash patterns (e.g. "asdfghjkl", "qwertyuiop")
  for (const pattern of KEYBOARD_MASH_PATTERNS) {
    if (lowered.includes(pattern)) {
      const hasKw = Array.from(MUSIC_AND_MOOD_KEYWORDS).some(k => lowered.includes(k));
      if (!hasKw) {
        return {
          isValid: false,
          errorMessage: "We couldn't recognize a valid mood or vibe. Please enter a valid listening mood (e.g., 'Late Night 3 AM', 'Deep focus').",
          reason: 'keyboard_mash'
        };
      }
    }
  }

  // 7. Consonant clusters with no vowels
  const words = lowered.match(/[a-z]+/g) || [];
  if (words.length > 0) {
    const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
    const hasRecognized = words.some(w => SHORT_VALID_TOKENS.has(w) || Array.from(MUSIC_AND_MOOD_KEYWORDS).some(k => w.includes(k)));
    if (!hasRecognized) {
      const mashWords = words.filter(w => w.length >= 4 && !Array.from(w).some(c => vowels.has(c)));
      if (mashWords.length > 0 && mashWords.length === words.length) {
        return {
          isValid: false,
          errorMessage: "We couldn't recognize a valid mood from those words. Please enter a mood, genre, or activity.",
          reason: 'consonant_mash'
        };
      }
    }
  }

  // 8. Off-topic questions or tasks (e.g. "what is the capital of France", "write python code")
  for (const starter of OFF_TOPIC_STARTERS) {
    if (starter.test(lowered)) {
      const hasKw = Array.from(MUSIC_AND_MOOD_KEYWORDS).some(k => lowered.includes(k));
      if (!hasKw) {
        return {
          isValid: false,
          errorMessage: "This query doesn't seem related to music or mood. Sonora is designed for music discovery. Try describing how you feel or what you're doing.",
          reason: 'off_topic_query'
        };
      }
    }
  }

  // 9. Specific non-musical tasks
  const offTopicKeywords = [
    'python code', 'write code', 'javascript', 'docker container',
    'sql query', 'react component', 'binary search', 'leetcode',
    'capital of', 'weather today', 'crypto price', 'bitcoin price',
    'system prompt', 'ignore previous instructions', 'order pizza',
    'buy groceries', 'how to cook'
  ];
  for (const otk of offTopicKeywords) {
    if (lowered.includes(otk)) {
      const hasKw = Array.from(MUSIC_AND_MOOD_KEYWORDS).some(k => lowered.includes(k));
      if (!hasKw) {
        return {
          isValid: false,
          errorMessage: 'This query appears off-topic. Please describe a music vibe, genre, or mood.',
          reason: 'off_topic_keyword'
        };
      }
    }
  }

  return { isValid: true };
}
