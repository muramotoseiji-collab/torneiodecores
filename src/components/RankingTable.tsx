import React, { useState, useEffect } from 'react';
import { Ranking, Match, Confrontation } from '../types';
import { TEAMS } from '../constants';
import { Trophy, Info, Loader2, Flag } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function RankingTable() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateRankings = async () => {
    setLoading(true);
    try {
      // Fetch all matches and confrontations to calculate ranking
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'finished');
      
      const { data: confrontations, error: confError } = await supabase
        .from('confrontations')
        .select('*');

      if (matchError || confError) throw matchError || confError;

      const newRankings: Ranking[] = TEAMS.map(team => {
        const teamRank: Ranking = {
          team_id: team.id,
          team_name: team.name,
          points: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          match_wins: 0,
          match_losses: 0,
          sets_won: 0,
          cat_f_wins: 0,
          cat_e_wins: 0,
          cat_d_wins: 0,
          cat_c_wins: 0,
          cat_b_wins: 0,
          cat_a_wins: 0,
        };

        // Calculate confrontation points and sets
        confrontations?.forEach(conf => {
          const isTeam1 = conf.team1_id === team.id;
          const isTeam2 = conf.team2_id === team.id;
          if (!isTeam1 && !isTeam2) return;

          // Count match wins and sets for this confrontation
          const confMatches = matches?.filter(m => m.confrontation_id === conf.id);
          const teamWins = confMatches?.filter(m => m.winner_team_id === team.id).length || 0;
          const opponentWins = confMatches?.filter(m => m.winner_team_id && m.winner_team_id !== team.id).length || 0;

          teamRank.match_wins += teamWins;
          teamRank.match_losses += opponentWins;

          // Calculate sets won
          confMatches?.forEach(m => {
            if (isTeam1) {
              teamRank.sets_won += (m.team1_set1 > m.team2_set1 ? 1 : 0);
              teamRank.sets_won += (m.team1_set2 > m.team2_set2 ? 1 : 0);
              teamRank.sets_won += (m.team1_set3 > m.team2_set3 ? 1 : 0);
            } else if (isTeam2) {
              teamRank.sets_won += (m.team2_set1 > m.team1_set1 ? 1 : 0);
              teamRank.sets_won += (m.team2_set2 > m.team1_set2 ? 1 : 0);
              teamRank.sets_won += (m.team2_set3 > m.team1_set3 ? 1 : 0);
            }
          });

          // Only count if confrontation has matches or is marked finished
          if (confMatches && confMatches.length > 0) {
            if (teamWins > opponentWins) {
              teamRank.points += 3;
              teamRank.wins += 1;
            } else if (teamWins === opponentWins && teamWins > 0) {
              teamRank.points += 2;
              teamRank.draws += 1;
            } else if (opponentWins > teamWins) {
              teamRank.points += 1;
              teamRank.losses += 1;
            }
          }
        });

        // Calculate category wins from all finished matches
        const teamMatches = matches?.filter(m => m.winner_team_id === team.id) || [];
        teamRank.cat_f_wins = teamMatches.filter(m => m.category === 'F').length;
        teamRank.cat_e_wins = teamMatches.filter(m => m.category === 'E').length;
        teamRank.cat_d_wins = teamMatches.filter(m => m.category === 'D').length;
        teamRank.cat_c_wins = teamMatches.filter(m => m.category === 'C').length;
        teamRank.cat_b_wins = teamMatches.filter(m => m.category === 'B').length;
        teamRank.cat_a_wins = teamMatches.filter(m => m.category === 'A').length;

        return teamRank;
      });

      // Sort by points, then total match wins, then category wins (F, E, D, C, B, A)
      newRankings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.match_wins !== a.match_wins) return b.match_wins - a.match_wins;
        if (b.cat_f_wins !== a.cat_f_wins) return b.cat_f_wins - a.cat_f_wins;
        if (b.cat_e_wins !== a.cat_e_wins) return b.cat_e_wins - a.cat_e_wins;
        if (b.cat_d_wins !== a.cat_d_wins) return b.cat_d_wins - a.cat_d_wins;
        if (b.cat_c_wins !== a.cat_c_wins) return b.cat_c_wins - a.cat_c_wins;
        if (b.cat_b_wins !== a.cat_b_wins) return b.cat_b_wins - a.cat_b_wins;
        return b.cat_a_wins - a.cat_a_wins;
      });

      setRankings(newRankings);
    } catch (err) {
      console.error('Error calculating rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateRankings();

    const subscription = supabase
      .channel('ranking_changes')
      .on(
        'postgres_changes' as any,
        { event: '*', table: 'matches', schema: 'public' },
        () => {
          calculateRankings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando Ranking...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 overflow-x-auto">
        <div className="flex items-center gap-2 mb-6 text-blue-400">
          <Trophy size={24} />
          <h2 className="text-xl font-bold italic uppercase tracking-wider">Classificação Geral</h2>
        </div>

        <table className="w-full text-left border-separate border-spacing-0 min-w-[800px]">
          <thead>
            <tr className="text-[9px] uppercase text-gray-500 font-bold leading-tight">
              <th className="pb-4 px-2 sticky left-0 bg-[#0f172a] z-10 border-b border-white/5 w-10" title="Posição">POS</th>
              <th className="pb-4 px-2 sticky left-[40px] bg-[#0f172a] z-10 border-b border-white/5 w-32" title="Equipe">EQUIPE</th>
              <th className="pb-4 px-2 text-blue-400 border-b border-white/5 w-16" title="Pontos">PONTOS</th>
              <th className="pb-4 px-2 border-b border-white/5 w-20" title="Vitorias no Confronto">VITÓRIAS<br/>CONFRONTO</th>
              <th className="pb-4 px-2 border-b border-white/5 w-20" title="Empate no Confronto">EMPATE<br/>CONFRONTO</th>
              <th className="pb-4 px-2 border-b border-white/5 w-20" title="Derrotas no Confronto">DERROTAS<br/>CONFRONTO</th>
              <th className="pb-4 px-2 text-yellow-400 border-b border-white/5 w-16" title="Vitorias">VITÓRIAS<br/>TOTAIS</th>
              <th className="pb-4 px-2 text-red-400 border-b border-white/5 w-16" title="Derrotas">DERROTAS<br/>TOTAIS</th>
              <th className="pb-4 px-2 border-b border-white/5 w-8" title="Vitorias Categoria F">F</th>
              <th className="pb-4 px-2 border-b border-white/5 w-8" title="Vitorias Categoria E">E</th>
              <th className="pb-4 px-2 border-b border-white/5 w-8" title="Vitorias Categoria D">D</th>
              <th className="pb-4 px-2 border-b border-white/5 w-8" title="Vitorias Categoria C">C</th>
              <th className="pb-4 px-2 border-b border-white/5 w-8" title="Vitorias Categoria B">B</th>
              <th className="pb-4 px-2 border-b border-white/5 w-8" title="Vitorias Categoria A">A</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((rank, idx) => {
              const team = TEAMS.find(t => t.id === rank.team_id);
              return (
                <motion.tr 
                  key={rank.team_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="py-3 px-2 font-bold italic text-yellow-500 sticky left-0 bg-[#0f172a] z-10 border-b border-white/5 group-hover:bg-white/10 transition-colors">{idx + 1}º</td>
                  <td className="py-3 px-2 font-black italic tracking-tighter sticky left-[40px] bg-[#0f172a] z-10 border-b border-white/5 group-hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flag-wave">
                        <Flag size={14} fill={team?.color} color={team?.color === '#ffffff' ? '#000000' : team?.color} strokeWidth={3} />
                      </div>
                      <span style={{ color: team?.color }} className="truncate">{rank.team_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 font-bold text-blue-400 border-b border-white/5">{rank.points}</td>
                  <td className="py-3 px-2 text-gray-300 border-b border-white/5 text-center">{rank.wins}</td>
                  <td className="py-3 px-2 text-gray-300 border-b border-white/5 text-center">{rank.draws}</td>
                  <td className="py-3 px-2 text-gray-300 border-b border-white/5 text-center">{rank.losses}</td>
                  <td className="py-3 px-2 text-yellow-400 font-bold border-b border-white/5 text-center">{rank.match_wins}</td>
                  <td className="py-3 px-2 text-red-400 font-bold border-b border-white/5 text-center">{rank.match_losses}</td>
                  <td className="py-3 px-2 text-gray-400 border-b border-white/5 text-center">{rank.cat_f_wins}</td>
                  <td className="py-3 px-2 text-gray-400 border-b border-white/5 text-center">{rank.cat_e_wins}</td>
                  <td className="py-3 px-2 text-gray-400 border-b border-white/5 text-center">{rank.cat_d_wins}</td>
                  <td className="py-3 px-2 text-gray-400 border-b border-white/5 text-center">{rank.cat_c_wins}</td>
                  <td className="py-3 px-2 text-gray-400 border-b border-white/5 text-center">{rank.cat_b_wins}</td>
                  <td className="py-3 px-2 text-gray-400 border-b border-white/5 text-center">{rank.cat_a_wins}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h3 className="text-blue-400 font-bold uppercase text-xs mb-4 tracking-widest">Pontuação nas Classificatórias</h3>
          <ul className="space-y-2 text-xs font-medium text-gray-400">
            <li className="flex justify-between"><span>VITÓRIA:</span> <span className="text-white">3 PONTOS</span></li>
            <li className="flex justify-between"><span>EMPATE:</span> <span className="text-white">2 PONTOS</span></li>
            <li className="flex justify-between"><span>DERROTA:</span> <span className="text-white">1 PONTO</span></li>
          </ul>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-purple-400 font-bold uppercase text-xs mb-4 tracking-widest">Critérios de Desempate</h3>
          <ol className="space-y-2 text-xs font-medium text-gray-400 list-decimal list-inside">
            <li>PONTOS</li>
            <li>VITÓRIAS TOTAIS</li>
            <li>VITORIAS CATEGORIA F</li>
            <li>VITORIAS CATEGORIA E</li>
            <li>VITORIAS CATEGORIA D</li>
            <li>VITORIAS CATEGORIA C</li>
            <li>VITORIAS CATEGORIA B</li>
            <li>VITORIAS CATEGORIA A</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
