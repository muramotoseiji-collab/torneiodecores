import React, { useState, useEffect } from 'react';
import { RankingTable, MatchCard, MatchEditor } from './components';
import { TEAMS, DATES, CATEGORIES } from './constants';
import { LayoutDashboard, Swords, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Match } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ranking' | 'matches'>('ranking');
  const [selectedDate, setSelectedDate] = useState(DATES[0]);
  const [selectedConfrontationId, setSelectedConfrontationId] = useState<string | null>(null);
  const [confrontations, setConfrontations] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'viewer' | 'captain'>('viewer');
  const [loggedTeam, setLoggedTeam] = useState<string | null>(null);
  const [loginTeamId, setLoginTeamId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [confrontation, setConfrontation] = useState<any>(null);
  const [team1, setTeam1] = useState<any>(null);
  const [team2, setTeam2] = useState<any>(null);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      // 1. Fetch all confrontations for the selected date
      const { data: confsData, error: confsError } = await supabase
        .from('confrontations')
        .select(`
          *,
          team1:teams!confrontations_team1_id_fkey(*),
          team2:teams!confrontations_team2_id_fkey(*)
        `)
        .eq('date', selectedDate);

      if (confsError) {
        console.error('Error fetching confrontations:', confsError);
        setConfrontations([]);
        setMatches([]);
        return;
      }

      setConfrontations(confsData || []);

      if (confsData && confsData.length > 0) {
        // 2. Fetch all matches for all confrontations of this date
        const confIds = confsData.map(c => c.id);
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('*')
          .in('confrontation_id', confIds)
          .order('match_number', { ascending: true });

        if (matchError) {
          console.error('Error fetching matches:', matchError);
        } else {
          setMatches(matchData || []);
        }
      } else {
        setMatches([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();

    // Subscribe to changes
    const channel = supabase
      .channel('matches_changes')
      .on(
        'postgres_changes' as any,
        { event: '*', table: 'matches', schema: 'public' },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, selectedConfrontationId]);

  const handleLogin = async (role: 'viewer' | 'captain') => {
    if (role === 'viewer') {
      setIsLoggedIn(true);
      setUserRole('viewer');
      setLoggedTeam(null);
      return;
    }

    // Captain Login Logic
    try {
      if (!loginTeamId) {
        setError('Selecione um time.');
        return;
      }

      const { data, error } = await supabase
        .from('captains')
        .select('team_id')
        .eq('team_id', loginTeamId)
        .eq('password', password)
        .single();

      if (error || !data) {
        setError('Senha incorreta ou time não encontrado.');
        return;
      }

      setIsLoggedIn(true);
      setUserRole('captain');
      setLoggedTeam(data.team_id);
      setError('');
    } catch (err) {
      setError('Erro ao conectar com o banco de dados.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('viewer');
    setLoggedTeam(null);
    setPassword('');
  };

  const handleSaveMatch = async (updatedMatch: Match) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          team1_set1: updatedMatch.team1_set1,
          team1_set2: updatedMatch.team1_set2,
          team1_set3: updatedMatch.team1_set3,
          team2_set1: updatedMatch.team2_set1,
          team2_set2: updatedMatch.team2_set2,
          team2_set3: updatedMatch.team2_set3,
          winner_team_id: updatedMatch.winner_team_id,
          status: updatedMatch.status
        })
        .eq('id', updatedMatch.id);

      if (error) throw error;
      
      setEditingMatch(null);
      // fetchMatches() will be called by the realtime subscription
    } catch (err) {
      console.error('Error saving match:', err);
      alert('Erro ao salvar o placar. Tente novamente.');
    }
  };

  const finishedMatches = matches.filter(m => m.status === 'finished');
  const team1Wins = team1 ? finishedMatches.filter(m => m.winner_team_id === team1.id).length : 0;
  const team2Wins = team2 ? finishedMatches.filter(m => m.winner_team_id === team2.id).length : 0;
  
  const team1Sets = team1 ? finishedMatches.reduce((acc, m) => acc + (m.team1_set1 > m.team2_set1 ? 1 : 0) + (m.team1_set2 > m.team2_set2 ? 1 : 0) + (m.team1_set3 > m.team2_set3 ? 1 : 0), 0) : 0;
  const team2Sets = team2 ? finishedMatches.reduce((acc, m) => acc + (m.team2_set1 > m.team1_set1 ? 1 : 0) + (m.team2_set2 > m.team1_set2 ? 1 : 0) + (m.team2_set3 > m.team1_set3 ? 1 : 0), 0) : 0;

  if (!isLoggedIn) {
    // ... (Login UI remains the same)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-brand-bg to-brand-bg">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="inline-block p-3 rounded-2xl bg-blue-600/20 text-blue-400 mb-4 border border-blue-500/20">
              <Swords size={40} />
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">
              Torneio de <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 bg-clip-text text-transparent">Cores</span> 2026
            </h1>
            <p className="text-gray-500 text-sm font-medium">Bem-vindo ao portal do torneio</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => handleLogin('viewer')}
              className="w-full py-4 glass-card hover:bg-white/5 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-sm"
            >
              Entrar como Espectador
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-brand-card px-2 text-gray-500 font-bold">Ou Capitão</span></div>
            </div>
            <div className="space-y-3">
              <select 
                value={loginTeamId}
                onChange={(e) => setLoginTeamId(e.target.value)}
                className="input-field w-full text-center bg-brand-card text-white appearance-none cursor-pointer"
              >
                <option value="" className="bg-brand-bg text-white">Selecione seu Time</option>
                {TEAMS.map(team => (
                  <option key={team.id} value={team.id} className="bg-brand-bg text-white">
                    Time {team.name}
                  </option>
                ))}
              </select>
              <input 
                type="password" 
                placeholder="Senha do Capitão" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full text-center" 
              />
              {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase">{error}</p>}
              <button 
                onClick={() => handleLogin('captain')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-red-600 hover:from-blue-500 hover:via-purple-500 hover:to-red-500 rounded-xl font-bold uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-purple-600/20"
              >
                Acessar Painel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="p-6 text-center space-y-6 max-w-4xl mx-auto">
        <div className="inline-block border-2 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 p-[2px] rounded-2xl shadow-2xl">
          <div className="bg-brand-bg px-8 py-4 rounded-[14px]">
            <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase">
              Torneio de <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 bg-clip-text text-transparent">Cores</span> 2026
            </h1>
          </div>
        </div>

        <div className="flex gap-2 p-1 glass-card max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'ranking' ? 'bg-white text-brand-bg shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <LayoutDashboard size={16} />
            Pontuação Geral
          </button>
          <button 
            onClick={() => setActiveTab('matches')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'matches' ? 'bg-white text-brand-bg shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <Swords size={16} />
            Jogos
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'ranking' ? (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8 pb-12"
            >
              <RankingTable />
              
              {/* Logout & Status */}
              <div className="flex flex-col items-center gap-4 pt-8">
                {userRole === 'captain' && loggedTeam && (
                  <div className="px-6 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    VOCÊ ESTÁ LOGADO COMO TIME <span className="text-white">{TEAMS.find(t => t.id === loggedTeam)?.name.toUpperCase() || loggedTeam.toUpperCase()}</span>
                  </div>
                )}
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 glass-card hover:bg-red-500/10 hover:text-red-500 transition-colors text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"
                >
                  <LogOut size={14} /> Sair
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="matches"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Date Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {DATES.map(date => (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedConfrontationId(null);
                    }}
                    className={`flex-shrink-0 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${selectedDate === date ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'glass-card border-transparent text-gray-500'}`}
                  >
                    {date}
                  </button>
                ))}
              </div>

              {/* Confrontation Selection or Detail View */}
              <AnimatePresence mode="wait">
                {!selectedConfrontationId ? (
                  <motion.div
                    key="selector"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8 py-10"
                  >
                    <div className="text-center space-y-4">
                      <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-[0.3em]">Confrontos do Dia</p>
                      <div className="grid grid-cols-1 gap-4">
                        {confrontations.map(conf => (
                          <button
                            key={conf.id}
                            onClick={() => setSelectedConfrontationId(conf.id)}
                            className="w-full p-6 rounded-2xl glass-card border-2 border-white/5 hover:border-white/20 transition-all group active:scale-[0.98]"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 text-right">
                                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter" style={{ color: conf.team1.color }}>
                                  {conf.team1.name}
                                </h3>
                              </div>
                              <div className="px-4 py-1 rounded-full bg-white/5 text-[10px] font-black italic text-gray-500">VS</div>
                              <div className="flex-1 text-left">
                                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter" style={{ color: conf.team2.color }}>
                                  {conf.team2.name}
                                </h3>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-center">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Ver Detalhes do Confronto</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {confrontations.length === 0 && !loading && (
                      <div className="py-20 text-center glass-card rounded-3xl">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhum confronto agendado para esta data.</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-8 pb-20"
                  >
                    {/* Back Button */}
                    <button 
                      onClick={() => setSelectedConfrontationId(null)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                    >
                      <div className="p-2 rounded-lg glass-card group-hover:bg-white/10">
                        <ChevronLeft size={20} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest">Voltar para Confrontos</span>
                    </button>

                    {(() => {
                      const conf = confrontations.find(c => c.id === selectedConfrontationId);
                      if (!conf) return null;

                      const confMatches = matches.filter(m => m.confrontation_id === conf.id);
                      const finishedMatches = confMatches.filter(m => m.status === 'finished');
                      const team1Wins = finishedMatches.filter(m => m.winner_team_id === conf.team1_id).length;
                      const team2Wins = finishedMatches.filter(m => m.winner_team_id === conf.team2_id).length;
                      
                      const team1Sets = finishedMatches.reduce((acc, m) => acc + (m.team1_set1 > m.team2_set1 ? 1 : 0) + (m.team1_set2 > m.team2_set2 ? 1 : 0) + (m.team1_set3 > m.team2_set3 ? 1 : 0), 0);
                      const team2Sets = finishedMatches.reduce((acc, m) => acc + (m.team2_set1 > m.team1_set1 ? 1 : 0) + (m.team2_set2 > m.team1_set2 ? 1 : 0) + (m.team2_set3 > m.team1_set3 ? 1 : 0), 0);

                      return (
                        <div className="space-y-8">
                          {/* Confrontation Header */}
                          <div className="text-center space-y-4">
                            <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-[0.3em]">Placar do Confronto</p>
                            <div className="flex items-center justify-center gap-4 md:gap-8">
                              <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter" style={{ color: conf.team1.color }}>{conf.team1.name.toUpperCase()}</h2>
                              <span className="text-xl md:text-3xl font-black italic text-gray-700">VS</span>
                              <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter" style={{ color: conf.team2.color }}>{conf.team2.name.toUpperCase()}</h2>
                            </div>
                          </div>

                          {/* Stats Summary */}
                          <div className="glass-card p-6 md:p-8 space-y-8 rounded-3xl">
                            <div className="grid grid-cols-3 items-center text-center">
                              <div className="text-4xl md:text-6xl font-black italic text-green-500">{team1Wins}</div>
                              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vitórias</div>
                              <div className="text-4xl md:text-6xl font-black italic text-green-500">{team2Wins}</div>
                            </div>
                            <div className="grid grid-cols-3 items-center text-center">
                              <div className="text-4xl md:text-6xl font-black italic text-blue-500">{team1Sets}</div>
                              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sets Vencidos</div>
                              <div className="text-4xl md:text-6xl font-black italic text-blue-500">{team2Sets}</div>
                            </div>

                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                              {CATEGORIES.map(cat => {
                                const catMatches = finishedMatches.filter(m => m.category === cat);
                                const cat1Wins = catMatches.filter(m => m.winner_team_id === conf.team1_id).length;
                                const cat2Wins = catMatches.filter(m => m.winner_team_id === conf.team2_id).length;
                                return (
                                  <div key={cat} className="glass-card p-2 text-center space-y-1 rounded-xl">
                                    <p className="text-[8px] font-bold text-gray-500">{cat}</p>
                                    <p className="text-xs font-black italic">
                                      <span style={{ color: conf.team1.color }}>{cat1Wins}</span>
                                      <span className="text-gray-700 mx-1">|</span>
                                      <span style={{ color: conf.team2.color }}>{cat2Wins}</span>
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Match List */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {confMatches.map(match => (
                              <MatchCard 
                                key={match.id} 
                                match={match} 
                                isCaptain={userRole === 'captain'} 
                                loggedTeam={loggedTeam}
                                onUpdate={(m) => setEditingMatch(m)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Logout & Status (at the bottom) */}
              <div className="flex flex-col items-center gap-4 pt-8 pb-12">
                {userRole === 'captain' && loggedTeam && (
                  <div className="px-6 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    VOCÊ ESTÁ LOGADO COMO TIME <span className="text-white">{TEAMS.find(t => t.id === loggedTeam)?.name.toUpperCase() || loggedTeam.toUpperCase()}</span>
                  </div>
                )}
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 glass-card hover:bg-red-500/10 hover:text-red-500 transition-colors text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"
                >
                  <LogOut size={14} /> Sair
                </button>
              </div>

              {editingMatch && (
                <MatchEditor 
                  match={editingMatch} 
                  onClose={() => setEditingMatch(null)}
                  onSave={handleSaveMatch}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav (Optional, but good for UX) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md md:hidden">
        <div className="glass-card p-2 flex gap-2 shadow-2xl border-white/10">
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'ranking' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
          >
            <LayoutDashboard size={16} /> Ranking
          </button>
          <button 
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'matches' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
          >
            <Swords size={16} /> Jogos
          </button>
        </div>
      </div>
    </div>
  );
}
