export type Role = 'student' | 'teacher';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  color: string;
  stars: number;
}

export type GameEngineType = 'fillblank' | 'matchword' | 'multiplechoice' | 'reorder';

export interface GameDef {
  id: string;
  title: string;
  description: string;
  type: GameEngineType | string; // loosen up since we don't strictly use type for engine anymore
  icon: string;
  theme: 'blue' | 'orange' | 'green' | 'purple' | 'pink' | 'red';
  isActive?: boolean;
  videoUrl?: string | null;
}

export interface ChallengeDef {
  id: string;
  lessonId: string;
  title: string;
}

