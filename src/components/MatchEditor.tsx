import React, { useState, useEffect } from 'react';
import { Match, Team } from '../types';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TEAMS } from '../constants';

interface MatchEditorProps {
  match: Match;
  onClose: () => void;
  onSave: (updatedMatch: Match) => void;
}

export default function MatchEditor({ match, onClose, onSave }: MatchEditorProps) {
  const [formData, setFormData] = useState<Match>({ ...match });
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

  const handleSave = () => {
    const team1Sets = (formData.team1_set1 > formData.team2_set1 ? 1 : 0) + 
                      (formData.team1_set2 > formData.team2_set2 ? 1 : 0) + 
                      (formData.team1_set3 > formData.team2_set3 ? 1 : 0);
    const team2Sets = (formData.team2_set1 > formData.team1_set1 ? 1 : 0) + 
                      (formData.team2_set2 > formData.team1_set2 ? 1 : 0) + 
                      (formData.team2_set3 > formData.team1_set3 ? 1 : 0);
    
    const winnerId = team1Sets > team2Sets ? team1?.id : (team2Sets > team1Sets ? team2?.id : null);
    
    onSave({
      ...formData,
      winner_team_id: winnerId || null,
      status: 'finished'
    });
  };

  if (!team1 || !team2) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase italic">Editar Placar - Jogo {match.match_number}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
        </div>

        <div className="space-y-6">
          {/* Team 1 Scores */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase" style={{ color: team1.color }}>Equipe {team1.name}</p>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(set => (
                <div key={set} className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Set {set}</label>
                  <input 
                    type="number" 
                    value={formData[`team1_set${set}` as keyof Match] as number}
                    onChange={(e) => setFormData({ ...formData, [`team1_set${set}`]: parseInt(e.target.value) || 0 })}
                    className="input-field w-full text-center text-xl font-black"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5"></div>

          {/* Team 2 Scores */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase" style={{ color: team2.color }}>Equipe {team2.name}</p>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(set => (
                <div key={set} className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Set {set}</label>
                  <input 
                    type="number" 
                    value={formData[`team2_set${set}` as keyof Match] as number}
                    onChange={(e) => setFormData({ ...formData, [`team2_set${set}`]: parseInt(e.target.value) || 0 })}
                    className="input-field w-full text-center text-xl font-black"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 py-3 glass-card font-bold uppercase text-xs tracking-widest">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20">Salvar Placar</button>
        </div>
      </div>
    </div>
  );
}
