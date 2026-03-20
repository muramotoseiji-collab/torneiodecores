import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TEAMS = [
  { id: 'azul', name: 'AZUL', color: '#3b82f6', text_color: '#3b82f6' },
  { id: 'roxo', name: 'ROXO', color: '#a855f7', text_color: '#a855f7' },
  { id: 'branco', name: 'BRANCO', color: '#ffffff', text_color: '#ffffff' },
  { id: 'vermelho', name: 'VERMELHO', color: '#ef4444', text_color: '#ef4444' },
  { id: 'verde', name: 'VERDE', color: '#22c55e', text_color: '#22c55e' },
  { id: 'amarelo', name: 'AMARELO', color: '#eab308', text_color: '#eab308' },
];

export const DATES = ['21/03', '22/03', '28/03', '29/03'];
export const CATEGORIES: ('A' | 'B' | 'C' | 'D' | 'E' | 'F')[] = ['F', 'E', 'D', 'C', 'B', 'A'];
