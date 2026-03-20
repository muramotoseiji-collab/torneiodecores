import React from 'react';
import { Match, Team } from '../types';
import { TEAMS } from '../constants';
import { CheckCircle2, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface MatchCardProps {
  key?: string | number;
  match: Match;
  isAdmin: boolean;
  onUpdate?: (match: Match) => void;
}

export default function MatchCard({ match, isAdmin, onUpdate }: MatchCardProps) {
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      const { data: conf } = await supabase
        .from('confrontations')
        .select('team1_id, team2_id')
        .eq('id', match.confrontation_id)
        .single();
      
      if (conf) {
        setTeam1(TEAMS.find(t => t.id === conf.team1_id) || null);
        setTeam2(TEAMS.find(t => t.id === conf.team2_id) || null);
      }
    };
    fetchTeams();
  }, [match.confrontation_id]);

  if (!team1 || !team2) return <div className="glass-card h-40 animate-pulse bg-white/5"></div>;

  const canEdit = isAdmin;

  return (
    <div className="glass-card p-4 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <span className="text-base font-black text-blue-400 uppercase tracking-[0.25em]">MATCH {match.match_number}</span>
          <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">CAT. {match.category}</span>
        </div>
        {match.status === 'finished' && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase">
            <CheckCircle2 size={12} />
            Finalizado
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Team 1 */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
              <span className="text-xs font-medium text-white">{match.team1_player1.split(' ')[0]}</span>
              <span className="text-base font-black italic text-yellow-500 uppercase">{match.team1_player1.split(' ').slice(1).join(' ')}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
              <span className="text-xs font-medium text-white">{match.team1_player2.split(' ')[0]}</span>
              <span className="text-base font-black italic text-yellow-500 uppercase">{match.team1_player2.split(' ').slice(1).join(' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flag-wave">
                <Flag size={14} fill={team1.color} color={team1.color === '#ffffff' ? '#000000' : team1.color} strokeWidth={3} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: team1.color }}>{team1.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[match.team1_set1, match.team1_set2, match.team1_set3].map((set, i) => (
              <div key={i} className="w-10 h-10 glass-card flex items-center justify-center font-black text-xl text-yellow-500">
                {set}
              </div>
            ))}
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
              <span className="text-xs font-medium text-white">{match.team2_player1.split(' ')[0]}</span>
              <span className="text-base font-black italic text-yellow-500 uppercase">{match.team2_player1.split(' ').slice(1).join(' ')}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
              <span className="text-xs font-medium text-white">{match.team2_player2.split(' ')[0]}</span>
              <span className="text-base font-black italic text-yellow-500 uppercase">{match.team2_player2.split(' ').slice(1).join(' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flag-wave">
                <Flag size={14} fill={team2.color} color={team2.color === '#ffffff' ? '#000000' : team2.color} strokeWidth={3} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: team2.color }}>{team2.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[match.team2_set1, match.team2_set2, match.team2_set3].map((set, i) => (
              <div key={i} className="w-10 h-10 glass-card flex items-center justify-center font-black text-xl text-gray-400">
                {set}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <button 
          className={`mt-4 w-full py-2 border rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
            match.status === 'finished' 
              ? 'bg-yellow-600/20 hover:bg-yellow-600/40 border-yellow-500/30 text-yellow-500' 
              : 'bg-blue-600/20 hover:bg-blue-600/40 border-blue-500/30 text-blue-400'
          }`}
          onClick={() => onUpdate?.(match)}
        >
          {match.status === 'finished' ? 'Editar Placar' : 'Inserir Placar'}
        </button>
      )}
    </div>
  );
}
