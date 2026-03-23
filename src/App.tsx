import React, { useState, useEffect } from 'react';
import { RankingTable, MatchCard, MatchEditor } from './components';
import { TEAMS, DATES, CATEGORIES } from './constants';
import { LayoutDashboard, Swords, LogOut, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Match } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ranking' | 'matches'>('ranking');
  const [selectedDate, setSelectedDate] = useState(DATES[0]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedConfrontationId, setSelectedConfrontationId] = useState<string | null>(null);
  const [confrontations, setConfrontations] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'viewer' | 'admin'>('viewer');
  const [adminUsername, setAdminUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [confrontation, setConfrontation] = useState<any>(null);
  const [team1, setTeam1] = useState<any>(null);
  const [team2, setTeam2] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    // Auto-select next date based on today
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Find the first date in DATES that is today or in the future
    const nextDate = DATES.find(d => {
      const [day, month] = d.split('/').map(Number);
      const dateObj = new Date(currentYear, month - 1, day);
      return dateObj >= today;
    });

    if (nextDate) {
      setSelectedDate(nextDate);
    } else {
      // If all dates are in the past, select the last one
      setSelectedDate(DATES[DATES.length - 1]);
    }
  }, []);

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

  const handleLogin = async (role: 'viewer' | 'admin') => {
    if (role === 'viewer') {
      setIsLoggedIn(true);
      setUserRole('viewer');
      return;
    }

    // Admin Login Logic
    try {
      if (!adminUsername) {
        setError('Digite o usuário.');
        return;
      }

      const { data, error } = await supabase
        .from('admins')
        .select('username')
        .eq('username', adminUsername)
        .eq('password', password)
        .single();

      if (error || !data) {
        setError('Usuário ou senha incorretos.');
        return;
      }

      setIsLoggedIn(true);
      setUserRole('admin');
      setError('');
    } catch (err) {
      setError('Erro ao conectar com o banco de dados.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('viewer');
    setAdminUsername('');
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

  // Search logic
  const allPlayers: string[] = Array.from(new Set(matches.flatMap(m => [
    m.team1_player1, m.team1_player2, m.team2_player1, m.team2_player2
  ]).filter((p): p is string => typeof p === 'string')));

  const suggestions = searchTerm.length >= 2 
    ? allPlayers.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)
    : [];

  const filteredMatches = matches.filter(m => {
    const searchMatch = !searchTerm || [m.team1_player1, m.team1_player2, m.team2_player1, m.team2_player2]
        .some(p => typeof p === 'string' && p.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const conf = confrontations.find(c => c.id === m.confrontation_id);
    const teamMatch = !selectedTeamId || (conf && (conf.team1_id === selectedTeamId || conf.team2_id === selectedTeamId));
    
    const categoryMatch = !selectedCategory || m.category === selectedCategory;
    
    return searchMatch && teamMatch && categoryMatch;
  });

  const filteredConfrontations = confrontations.filter(conf => 
    !selectedTeamId || conf.team1_id === selectedTeamId || conf.team2_id === selectedTeamId
  );

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
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-red-600 hover:from-blue-500 hover:via-purple-500 hover:to-red-500 rounded-xl font-bold uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-purple-600/20"
            >
              Entrar como Tenista
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-brand-card px-2 text-gray-500 font-bold">Acesso Administrativo</span></div>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Usuário" 
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="input-field w-full text-center" 
              />
              <input 
                type="password" 
                placeholder="Senha" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full text-center" 
              />
              {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase">{error}</p>}
              <button 
                onClick={() => handleLogin('admin')}
                className="w-full py-4 bg-gray-200 text-gray-900 hover:bg-white rounded-xl font-bold uppercase tracking-widest text-sm transition-all active:scale-95"
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
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block border-2 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 p-[2px] rounded-2xl shadow-2xl"
        >
          <div className="bg-brand-bg px-8 py-4 rounded-[14px]">
            <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase">
              Torneio de <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 bg-clip-text text-transparent animate-gradient-x">Cores</span> 2026
            </h1>
          </div>
        </motion.div>

        <div className="relative p-1 bg-white/5 backdrop-blur-xl border border-white/10 max-w-sm mx-auto rounded-[22px] shadow-2xl overflow-hidden">
          <div className="flex relative z-10">
            {[
              { id: 'ranking', label: 'Pontos | Classificatória', shortLabel: 'Pontos', icon: LayoutDashboard },
              { id: 'matches', label: 'Jogos', shortLabel: 'Jogos', icon: Swords }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'ranking' | 'matches')}
                className={`relative flex-1 flex items-center justify-center py-4 px-4 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500 rounded-2xl ${
                  activeTab === tab.id 
                    ? 'text-white' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] z-0"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                    style={{ borderRadius: '16px' }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2 drop-shadow-sm">
                  <tab.icon size={18} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </span>
              </button>
            ))}
          </div>
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
                {userRole === 'admin' && (
                  <div className="px-6 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    VOCÊ ESTÁ LOGADO COMO <span className="text-white">ADMINISTRADOR</span>
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
              {/* Date & Category Selectors */}
              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] px-2">Selecione o Dia</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {DATES.map(date => (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedConfrontationId(null);
                          setSearchTerm('');
                        }}
                        className={`flex-shrink-0 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 border ${
                          selectedDate === date 
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-400 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] scale-105' 
                            : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] px-2">Filtrar por Categoria</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedConfrontationId(null);
                      }}
                      className={`flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border ${
                        selectedCategory === null 
                          ? 'bg-white text-brand-bg border-white shadow-lg scale-105' 
                          : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                      }`}
                    >
                      TODAS
                    </button>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedConfrontationId(null);
                          setSearchTerm('');
                        }}
                        className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 border ${
                          selectedCategory === cat 
                            ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-110' 
                            : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] px-2">Filtrar por Equipe</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => {
                        setSelectedTeamId(null);
                        setSelectedConfrontationId(null);
                      }}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border ${
                        selectedTeamId === null 
                          ? 'bg-white text-brand-bg border-white shadow-lg' 
                          : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                      }`}
                    >
                      TODAS
                    </button>
                    {TEAMS.map(team => (
                      <button
                        key={team.id}
                        onClick={() => {
                          setSelectedTeamId(team.id);
                          setSelectedConfrontationId(null);
                          setSearchTerm('');
                        }}
                        className={`flex-shrink-0 p-2 rounded-xl transition-all duration-500 border flex items-center justify-center ${
                          selectedTeamId === team.id 
                            ? 'bg-white/10 border-white/20 shadow-lg scale-110' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                        title={team.name}
                      >
                        <Flag 
                          size={20} 
                          fill={team.color} 
                          color={team.color === '#ffffff' ? '#333' : team.color} 
                          className={selectedTeamId === team.id ? 'animate-pulse' : ''}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <div className="glass-card flex items-center px-4 py-3 gap-3 border border-white/5 focus-within:border-blue-500/50 transition-all rounded-2xl">
                    <Swords size={18} className="text-gray-500" />
                    <input 
                      type="text"
                      placeholder="Procurar Tenista..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="bg-transparent border-none outline-none flex-1 text-sm font-bold uppercase tracking-widest placeholder:text-gray-600"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="p-1 hover:bg-white/10 rounded-full text-gray-500"
                      >
                        <ChevronLeft size={16} className="rotate-90" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 left-0 right-0 mt-2 glass-card border border-white/10 shadow-2xl overflow-hidden rounded-2xl"
                      >
                        {suggestions.map((player, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchTerm(player);
                              setShowSuggestions(false);
                            }}
                            className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
                          >
                            {player}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Search Results, Category View or Normal View */}
              <AnimatePresence mode="wait">
                {searchTerm ? (
                  <motion.div
                    key="search-results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 py-4"
                  >
                    <div className="flex items-center justify-between px-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">
                        Resultados para: <span className="text-blue-400">{searchTerm}</span>
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {filteredMatches.length} {filteredMatches.length === 1 ? 'Jogo' : 'Jogos'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredMatches.map(match => {
                        const conf = confrontations.find(c => c.id === match.confrontation_id);
                        return (
                          <div key={match.id} className="space-y-2">
                            {conf && (
                              <div className="flex items-center justify-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/5 w-fit mx-auto">
                                <span className="text-[8px] font-black italic uppercase" style={{ color: conf.team1.color }}>{conf.team1.name}</span>
                                <span className="text-[8px] font-black italic text-gray-700">VS</span>
                                <span className="text-[8px] font-black italic uppercase" style={{ color: conf.team2.color }}>{conf.team2.name}</span>
                              </div>
                            )}
                            <MatchCard 
                              match={match} 
                              isAdmin={userRole === 'admin'} 
                              onUpdate={(m) => setEditingMatch(m)}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {filteredMatches.length === 0 && (
                      <div className="py-20 text-center glass-card rounded-3xl">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhum jogo encontrado para este tenista.</p>
                      </div>
                    )}
                  </motion.div>
                ) : selectedCategory ? (
                  <motion.div
                    key="category-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 py-4"
                  >
                    <div className="flex items-center justify-between px-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">
                        Categoria: <span className="text-blue-400">{selectedCategory}</span>
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {filteredMatches.length} Jogos
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredMatches.map(match => {
                        const conf = confrontations.find(c => c.id === match.confrontation_id);
                        return (
                          <div key={match.id} className="space-y-2">
                            {conf && (
                              <div className="flex items-center justify-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/5 w-fit mx-auto">
                                <span className="text-[8px] font-black italic uppercase" style={{ color: conf.team1.color }}>{conf.team1.name}</span>
                                <span className="text-[8px] font-black italic text-gray-700">VS</span>
                                <span className="text-[8px] font-black italic uppercase" style={{ color: conf.team2.color }}>{conf.team2.name}</span>
                              </div>
                            )}
                            <MatchCard 
                              match={match} 
                              isAdmin={userRole === 'admin'} 
                              onUpdate={(m) => setEditingMatch(m)}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {filteredMatches.length === 0 && (
                      <div className="py-20 text-center glass-card rounded-3xl">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhum jogo encontrado com estes filtros.</p>
                      </div>
                    )}
                  </motion.div>
                ) : !selectedConfrontationId ? (
                  <motion.div
                    key="selector"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8 py-10"
                  >
                    <div className="text-center space-y-4">
                      <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${selectedDate === '29/03' ? 'text-purple-400' : 'text-yellow-500'}`}>
                        {selectedDate === '29/03' ? 'FINAIS DO TORNEIO' : 'Confrontos do Dia'}
                      </p>
                      <div className="grid grid-cols-1 gap-4">
                        {filteredConfrontations.map(conf => (
                          <button
                            key={conf.id}
                            onClick={() => setSelectedConfrontationId(conf.id)}
                            className={`w-full p-6 rounded-2xl glass-card border-2 transition-all group active:scale-[0.98] ${
                              selectedDate === '29/03' 
                                ? 'border-purple-500/30 hover:border-purple-500/50 shadow-lg shadow-purple-500/10' 
                                : 'border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 text-right">
                                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter" style={{ color: conf.team1.color }}>
                                  {conf.team1.name}
                                </h3>
                              </div>
                              <div className={`px-4 py-1 rounded-full text-[10px] font-black italic ${selectedDate === '29/03' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500'}`}>VS</div>
                              <div className="flex-1 text-left">
                                <h3 className="text-xl md:text-3xl font-black italic tracking-tighter" style={{ color: conf.team2.color }}>
                                  {conf.team2.name}
                                </h3>
                              </div>
                            </div>
                            <div className={`mt-4 pt-4 border-t flex justify-center ${selectedDate === '29/03' ? 'border-purple-500/20' : 'border-white/5'}`}>
                              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${selectedDate === '29/03' ? 'text-purple-400 group-hover:text-purple-300' : 'text-gray-500 group-hover:text-white'}`}>
                                Ver Detalhes da Final
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {filteredConfrontations.length === 0 && !loading && (
                      <div className="py-20 text-center glass-card rounded-3xl">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                          {selectedTeamId 
                            ? 'Nenhum confronto desta equipe nesta data.' 
                            : 'Nenhum confronto agendado para esta data.'}
                        </p>
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
                            <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${conf.date === '29/03' ? 'text-purple-400' : 'text-yellow-500'}`}>
                              {conf.date === '29/03' ? 'PLACAR DA FINAL' : 'Placar do Confronto'}
                            </p>
                            <div className="flex items-center justify-center gap-4 md:gap-8">
                              <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter" style={{ color: conf.team1.color }}>{conf.team1.name.toUpperCase()}</h2>
                              <span className="text-xl md:text-3xl font-black italic text-gray-700">VS</span>
                              <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter" style={{ color: conf.team2.color }}>{conf.team2.name.toUpperCase()}</h2>
                            </div>
                          </div>

                          {/* Stats Summary */}
                          <div className="glass-card p-4 md:p-6 space-y-4 rounded-3xl">
                            <div className="grid grid-cols-3 items-center text-center">
                              <div className="text-3xl md:text-5xl font-black italic text-green-500">{team1Wins}</div>
                              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Vitórias</div>
                              <div className="text-3xl md:text-5xl font-black italic text-green-500">{team2Wins}</div>
                            </div>
                            <div className="grid grid-cols-3 items-center text-center">
                              <div className="text-3xl md:text-5xl font-black italic text-blue-500">{team1Sets}</div>
                              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sets Vencidos</div>
                              <div className="text-3xl md:text-5xl font-black italic text-blue-500">{team2Sets}</div>
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
                                isAdmin={userRole === 'admin'} 
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
                {userRole === 'admin' && (
                  <div className="px-6 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    VOCÊ ESTÁ LOGADO COMO <span className="text-white">ADMINISTRADOR</span>
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

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md md:hidden z-50">
        <div className="bg-white/5 backdrop-blur-2xl p-1.5 flex gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 rounded-[24px]">
          <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 py-4 rounded-[18px] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
              activeTab === 'ranking' 
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                : 'text-gray-500'
            }`}
          >
            <LayoutDashboard size={18} className={activeTab === 'ranking' ? 'animate-pulse' : ''} /> Pontos
          </button>
          <button 
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-4 rounded-[18px] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
              activeTab === 'matches' 
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                : 'text-gray-500'
            }`}
          >
            <Swords size={18} className={activeTab === 'matches' ? 'animate-pulse' : ''} /> Jogos
          </button>
        </div>
      </div>
    </div>
  );
}
