import React from 'react';
import { Match, Team } from '../types';
import { TEAMS } from '../constants';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface MatchCardProps {
  key?: string | number;
  match: Match;
  isCaptain: boolean;
  loggedTeam?: string | null;
  onUpdate?: (match: Match) => void;
}

export default function MatchCard({ match, isCaptain, loggedTeam, onUpdate }: MatchCardProps) {
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

  const canEdit = isCaptain && loggedTeam && (team1.id === loggedTeam || team2.id === loggedTeam);

  return (
    <div className="glass-card p-4 relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Match {match.match_number}</span>
          <span className="text-[10px] font-bold text-gray-500 uppercase">Cat. {match.category}</span>
        </div>
        {match.status === 'finished' && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase">
            <CheckCircle2 size={12} />
            Finalizado
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Team 1 */}
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <p className="text-[10px] text-gray-500 font-bold uppercase">{match.team1_player1.split(' ')[0]}</p>
            <p className="text-sm font-black italic text-yellow-500 uppercase leading-none">{match.team1_player1.split(' ').slice(1).join(' ')}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">{match.team1_player2.split(' ')[0]}</p>
            <p className="text-sm font-black italic text-yellow-500 uppercase leading-none">{match.team1_player2.split(' ').slice(1).join(' ')}</p>
            <p className="text-[10px] font-bold uppercase" style={{ color: team1.color }}>{team1.name}</p>
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
          <div className="space-y-0.5">
            <p className="text-[10px] text-gray-500 font-bold uppercase">{match.team2_player1.split(' ')[0]}</p>
            <p className="text-sm font-black italic text-yellow-500 uppercase leading-none">{match.team2_player1.split(' ').slice(1).join(' ')}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase">{match.team2_player2.split(' ')[0]}</p>
            <p className="text-sm font-black italic text-yellow-500 uppercase leading-none">{match.team2_player2.split(' ').slice(1).join(' ')}</p>
            <p className="text-[10px] font-bold uppercase" style={{ color: team2.color }}>{team2.name}</p>
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

      {canEdit && match.status !== 'finished' && (
        <button 
          className="mt-4 w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
          onClick={() => onUpdate?.(match)}
        >
          Inserir Placar
        </button>
      )}
    </div>
  );
}
