import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Users, Plus, Trash2, Check, X, QrCode, ClipboardList, Shield, RefreshCw, ChevronRight, Phone, User, ShoppingBag, Eye, EyeOff, LogIn, Award, Flame, Download, Edit2 } from 'lucide-react';
import { supabase } from './supabase';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'arista2026';

export default function App() {
  const [view, setView] = useState('register');
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [teamsRes, referralsRes] = await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: true }),
        supabase.from('referrals').select('*').order('created_at', { ascending: false })
      ]);
      if (teamsRes.error) throw teamsRes.error;
      if (referralsRes.error) throw referralsRes.error;
      setTeams(teamsRes.data || []);
      setReferrals(referralsRes.data || []);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('copa-arista-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-600 font-medium">Cargando Copa Arista...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="font-bold text-stone-900 mb-2">Error de conexión</h2>
          <p className="text-sm text-stone-600 mb-3">{error}</p>
          <p className="text-xs text-stone-500">Revisa la configuración de Supabase en Vercel (variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav view={view} setView={setView} />
      <main className="pb-20">
        {view === 'register' && <RegisterView teams={teams} onSaved={loadData} />}
        {view === 'ranking' && <RankingView teams={teams} referrals={referrals} onRefresh={loadData} />}
        {view === 'admin' && <AdminView teams={teams} referrals={referrals} onChange={loadData} />}
      </main>
    </div>
  );
}

function TopNav({ view, setView }) {
  const tabs = [
    { id: 'register', label: 'Registrar referido', icon: ClipboardList },
    { id: 'ranking', label: 'Tabla en vivo', icon: Trophy },
    { id: 'admin', label: 'Admin', icon: Shield }
  ];
  return (
    <header className="bg-stone-900 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between py-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-stone-900" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Copa Arista</h1>
              <p className="text-xs text-stone-400 leading-tight">El poder de tu red · 2026</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-stone-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            En vivo
          </div>
        </div>
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function RegisterView({ teams, onSaved }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    sale_reference: '', referrer_name: '', team_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Requerido';
    if (!form.last_name.trim()) e.last_name = 'Requerido';
    if (!form.phone.trim()) e.phone = 'Requerido';
    else if (!/^[\d\s\-+()]{8,}$/.test(form.phone)) e.phone = 'Teléfono inválido';
    if (!form.sale_reference.trim()) e.sale_reference = 'Requerido';
    if (!form.referrer_name.trim()) e.referrer_name = 'Requerido';
    if (!form.team_id) e.team_id = 'Selecciona un equipo';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await supabase.from('referrals').insert([{
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      sale_reference: form.sale_reference.trim(),
      referrer_name: form.referrer_name.trim(),
      team_id: form.team_id,
      status: 'pending',
      sale_amount: 0
    }]);
    setSubmitting(false);
    if (error) {
      alert('Error al registrar: ' + error.message);
      return;
    }
    setSuccess(true);
    onSaved();
    setTimeout(() => {
      setSuccess(false);
      setForm({ first_name: '', last_name: '', phone: '', sale_reference: '', referrer_name: '', team_id: '' });
    }, 5000);
  };

  if (success) {
    const team = teams.find(t => t.id === form.team_id);
    return (
      <div className="max-w-md mx-auto px-4 pt-12">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">¡Listo!</h2>
          <p className="text-stone-600 mb-1">Tu visita fue registrada con el equipo</p>
          <p className="text-xl font-bold text-amber-600 mb-6">{team?.name || ''}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-stone-700">
            <p className="font-medium mb-1">Bienvenido a Óptica Arista 👓</p>
            <p>Disfruta tu 30% de descuento exclusivo y participa en la rifa del Gran Premio Sorpresa.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full -mr-12 -mt-12 opacity-20" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <Flame className="w-3 h-3" /> COMPETENCIA ACTIVA
          </div>
          <h2 className="text-2xl font-bold mb-2 leading-tight">Registra tu visita</h2>
          <p className="text-stone-300 text-sm">
            Completa estos datos para que tu compra cuente al equipo que te invitó.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <Field label="Nombre" icon={User} value={form.first_name} onChange={v => setForm({ ...form, first_name: v })} error={errors.first_name} placeholder="Tu nombre" />
        <Field label="Apellido" icon={User} value={form.last_name} onChange={v => setForm({ ...form, last_name: v })} error={errors.last_name} placeholder="Tu apellido" />
        <Field label="Teléfono" icon={Phone} type="tel" value={form.phone} onChange={v => setForm({ ...form, phone: v })} error={errors.phone} placeholder="10 dígitos" />
        <Field label="Referencia de venta" icon={ShoppingBag} value={form.sale_reference} onChange={v => setForm({ ...form, sale_reference: v })} error={errors.sale_reference} placeholder="Ej. anteojos completos, solares..." />
        <Field label="Nombre de quien te refirió" icon={User} value={form.referrer_name} onChange={v => setForm({ ...form, referrer_name: v })} error={errors.referrer_name} placeholder="Nombre del colaborador" />

        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-2">Equipo que te refirió</label>
          {teams.length === 0 ? (
            <div className="text-sm text-stone-500 bg-stone-50 rounded-lg p-3 border border-stone-200">
              Aún no hay equipos registrados. Pide al administrador que los agregue.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {teams.map(team => (
                <button key={team.id} type="button" onClick={() => setForm({ ...form, team_id: team.id })}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    form.team_id === team.id ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-900">{team.name}</span>
                    {form.team_id === team.id && <Check className="w-5 h-5 text-amber-600" strokeWidth={3} />}
                  </div>
                  {team.members && <p className="text-xs text-stone-500 mt-0.5">{team.members}</p>}
                </button>
              ))}
            </div>
          )}
          {errors.team_id && <p className="text-xs text-red-600 mt-1">{errors.team_id}</p>}
        </div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-900 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
          {submitting ? (<><RefreshCw className="w-5 h-5 animate-spin" /> Enviando...</>) : (<>Registrar mi visita <ChevronRight className="w-5 h-5" /></>)}
        </button>
        <p className="text-xs text-stone-500 text-center">Al registrarte aceptas las bases de la Copa Interna Óptica Arista.</p>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, error, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full pl-10 pr-3 py-2.5 rounded-lg border ${error ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'} text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100`} />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function RankingView({ teams, referrals, onRefresh }) {
  const stats = computeStats(teams, referrals);
  const topThree = stats.slice(0, 3);
  const totalReferrals = referrals.length;
  const totalConfirmed = referrals.filter(r => r.status === 'confirmed').length;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <Trophy className="w-48 h-48 -mr-8 -mt-8" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-2 bg-white/20 text-xs font-semibold px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" /> EN VIVO
            </div>
            <button onClick={onRefresh} className="text-white/80 hover:text-white" aria-label="Actualizar">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-3xl font-bold mb-1 tracking-tight">Tabla de posiciones</h2>
          <p className="text-amber-50 text-sm">Actualización automática · 25 mayo – 25 junio 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Equipos" value={teams.length} icon={Users} />
        <StatCard label="Referidos" value={totalReferrals} icon={ClipboardList} />
        <StatCard label="Ventas confirmadas" value={totalConfirmed} icon={Award} />
      </div>

      {teams.length === 0 ? (
        <EmptyState icon={Users} title="Aún no hay equipos registrados" message="El administrador debe agregar los equipos para que aparezcan en la tabla." />
      ) : (
        <>
          {topThree.length > 0 && totalReferrals > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3 px-2">Podio</h3>
              <div className="grid grid-cols-3 gap-3 items-end">
                <PodiumCard team={topThree[1]} place={2} height="h-32" color="bg-stone-200 border-stone-300" textColor="text-stone-700" />
                <PodiumCard team={topThree[0]} place={1} height="h-40" color="bg-amber-400 border-amber-500" textColor="text-amber-900" big />
                <PodiumCard team={topThree[2]} place={3} height="h-28" color="bg-orange-200 border-orange-300" textColor="text-orange-800" />
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-stone-200 bg-stone-50">
              <h3 className="text-sm font-bold text-stone-700">Tabla completa</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {stats.map((team, i) => <TeamRow key={team.id} team={team} place={i + 1} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</p>
        <Icon className="w-4 h-4 text-stone-400" />
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}

function PodiumCard({ team, place, height, color, textColor, big }) {
  if (!team) return <div className={`${height} bg-stone-100 rounded-t-xl border-t-2 border-x-2 border-dashed border-stone-200 flex items-center justify-center text-stone-400 text-xs`}>—</div>;
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
  return (
    <div className="text-center">
      <div className={`${big ? 'text-base' : 'text-sm'} font-bold text-stone-900 mb-1 truncate px-1`} title={team.name}>{team.name}</div>
      <div className="text-xs text-stone-500 mb-2">{team.totalReferrals} referidos</div>
      <div className={`${height} ${color} border-t-2 border-x-2 rounded-t-xl flex flex-col items-center justify-center`}>
        <div className={big ? 'text-4xl mb-1' : 'text-2xl mb-1'}>{medal}</div>
        <div className={`${textColor} text-xs font-bold uppercase tracking-wider`}>{place}º</div>
      </div>
    </div>
  );
}

function TeamRow({ team, place }) {
  const isTop3 = place <= 3;
  return (
    <div className={`px-5 py-4 flex items-center gap-4 ${isTop3 ? 'bg-amber-50/30' : ''}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
        place === 1 ? 'bg-amber-400 text-amber-900' :
        place === 2 ? 'bg-stone-200 text-stone-700' :
        place === 3 ? 'bg-orange-200 text-orange-800' :
        'bg-stone-100 text-stone-500'
      }`}>{place}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-stone-900 truncate">{team.name}</h4>
        {team.members && <p className="text-xs text-stone-500 truncate">{team.members}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xl font-bold text-stone-900 leading-none">{team.totalReferrals}</div>
        <div className="text-xs text-stone-500 mt-0.5">
          <span className="text-green-600 font-medium">{team.confirmed}</span> confirmadas
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
      <Icon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
      <h3 className="font-bold text-stone-900 mb-1">{title}</h3>
      <p className="text-sm text-stone-500">{message}</p>
    </div>
  );
}

function computeStats(teams, referrals) {
  const byTeam = {};
  for (const team of teams) {
    byTeam[team.id] = { ...team, totalReferrals: 0, confirmed: 0, pending: 0, cancelled: 0, totalAmount: 0 };
  }
  for (const r of referrals) {
    const t = byTeam[r.team_id];
    if (!t) continue;
    if (r.status === 'cancelled') { t.cancelled++; continue; }
    t.totalReferrals++;
    if (r.status === 'confirmed') {
      t.confirmed++;
      t.totalAmount += parseFloat(r.sale_amount) || 0;
    } else { t.pending++; }
  }
  return Object.values(byTeam).sort((a, b) => {
    if (b.totalReferrals !== a.totalReferrals) return b.totalReferrals - a.totalReferrals;
    return b.totalAmount - a.totalAmount;
  });
}

function AdminView({ teams, referrals, onChange }) {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState('teams');

  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <div className="w-14 h-14 bg-stone-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 text-center mb-1">Panel administrador</h2>
          <p className="text-sm text-stone-500 text-center mb-6">Ingresa la contraseña para continuar</p>
          <div className="relative mb-3">
            <input type={showPwd ? 'text' : 'password'} value={pwd}
              onChange={e => { setPwd(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && (pwd === ADMIN_PASSWORD ? setAuthed(true) : setError('Contraseña incorrecta'))}
              placeholder="Contraseña"
              className="w-full px-4 py-3 pr-12 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button onClick={() => pwd === ADMIN_PASSWORD ? setAuthed(true) : setError('Contraseña incorrecta')}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Entrar
          </button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'teams', label: 'Equipos', icon: Users },
    { id: 'referrals', label: 'Referidos', icon: ClipboardList },
    { id: 'qr', label: 'Código QR', icon: QrCode },
    { id: 'export', label: 'Exportar', icon: Download }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900 mb-1">Panel administrador</h2>
        <p className="text-sm text-stone-500">Gestiona equipos, valida ventas y monitorea la competencia.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {sections.map(s => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                active ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
              }`}>
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {section === 'teams' && <TeamsAdmin teams={teams} referrals={referrals} onChange={onChange} />}
      {section === 'referrals' && <ReferralsAdmin teams={teams} referrals={referrals} onChange={onChange} />}
      {section === 'qr' && <QRSection />}
      {section === 'export' && <ExportSection teams={teams} referrals={referrals} />}
    </div>
  );
}

function TeamsAdmin({ teams, referrals, onChange }) {
  const [newTeam, setNewTeam] = useState({ name: '', members: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', members: '' });

  const addTeam = async () => {
    if (!newTeam.name.trim()) return;
    const { error } = await supabase.from('teams').insert([{ name: newTeam.name.trim(), members: newTeam.members.trim() }]);
    if (error) { alert('Error: ' + error.message); return; }
    setNewTeam({ name: '', members: '' });
    onChange();
  };

  const deleteTeam = async (id) => {
    const count = referrals.filter(r => r.team_id === id).length;
    const msg = count > 0 ? `Este equipo tiene ${count} referido(s). ¿Eliminar de todas formas?` : '¿Eliminar este equipo?';
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    onChange();
  };

  const startEdit = (team) => { setEditingId(team.id); setEditForm({ name: team.name, members: team.members || '' }); };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return;
    const { error } = await supabase.from('teams').update({ name: editForm.name.trim(), members: editForm.members.trim() }).eq('id', editingId);
    if (error) { alert('Error: ' + error.message); return; }
    setEditingId(null);
    onChange();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-600" /> Agregar nuevo equipo
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
            placeholder="Nombre del equipo (original e inédito)"
            className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
          <input value={newTeam.members} onChange={e => setNewTeam({ ...newTeam, members: e.target.value })}
            placeholder="Integrantes (2 a 5), separados por coma"
            className="px-3 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
        </div>
        <button onClick={addTeam} disabled={!newTeam.name.trim()}
          className="mt-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-900 font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agregar equipo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-stone-200 bg-stone-50">
          <h3 className="font-bold text-stone-700 text-sm">Equipos registrados ({teams.length})</h3>
        </div>
        {teams.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">Aún no hay equipos. Agrega el primero arriba.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {teams.map(team => {
              const count = referrals.filter(r => r.team_id === team.id).length;
              const isEditing = editingId === team.id;
              return (
                <div key={team.id} className="p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" />
                      <input value={editForm.members} onChange={e => setEditForm({ ...editForm, members: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm" placeholder="Integrantes" />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg">Guardar</button>
                        <button onClick={() => setEditingId(null)} className="bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm font-medium px-3 py-1.5 rounded-lg">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-stone-900">{team.name}</h4>
                        {team.members && <p className="text-xs text-stone-500 mt-0.5 truncate">{team.members}</p>}
                        <p className="text-xs text-amber-600 font-medium mt-1">{count} referido{count !== 1 && 's'}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEdit(team)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteTeam(team.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ReferralsAdmin({ teams, referrals, onChange }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = referrals.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const team = teams.find(t => t.id === r.team_id);
      if (
        !r.first_name.toLowerCase().includes(q) &&
        !r.last_name.toLowerCase().includes(q) &&
        !r.phone.includes(q) &&
        !r.referrer_name.toLowerCase().includes(q) &&
        !(team?.name.toLowerCase().includes(q))
      ) return false;
    }
    return true;
  });

  const updateStatus = async (id, status, amount = null) => {
    const update = { status };
    if (amount !== null) update.sale_amount = amount;
    const { error } = await supabase.from('referrals').update(update).eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    onChange();
  };

  const promptConfirm = (id) => {
    const amount = window.prompt('Monto total de la venta (MXN):', '0');
    if (amount === null) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) { window.alert('Monto inválido'); return; }
    updateStatus(id, 'confirmed', num);
  };

  const counts = {
    all: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    confirmed: referrals.filter(r => r.status === 'confirmed').length,
    cancelled: referrals.filter(r => r.status === 'cancelled').length
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'confirmed', label: 'Confirmadas' },
            { id: 'cancelled', label: 'Canceladas' }
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === f.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}>
              {f.label} <span className="opacity-60">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
          className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sin referidos" message="Cuando alguien escanee el QR y se registre, aparecerá aquí." />
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const team = teams.find(t => t.id === r.team_id);
            return (
              <div key={r.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold text-stone-900">{r.first_name} {r.last_name}</h4>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-sm text-stone-600"><Phone className="inline w-3 h-3 mr-1" />{r.phone}</p>
                  </div>
                  <span className="text-xs text-stone-400 flex-shrink-0">
                    {new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 mb-3 bg-stone-50 rounded-lg p-2">
                  <div><span className="text-stone-500">Venta:</span> {r.sale_reference}</div>
                  <div><span className="text-stone-500">Referido por:</span> {r.referrer_name}</div>
                  <div className="col-span-2"><span className="text-stone-500">Equipo:</span> <span className="font-medium text-amber-700">{team?.name || '—'}</span></div>
                  {r.status === 'confirmed' && parseFloat(r.sale_amount) > 0 && (
                    <div className="col-span-2"><span className="text-stone-500">Monto:</span> <span className="font-bold text-green-700">${parseFloat(r.sale_amount).toLocaleString('es-MX')} MXN</span></div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status !== 'confirmed' && (
                    <button onClick={() => promptConfirm(r.id)} className="text-xs font-medium bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <Check className="w-3 h-3" /> Confirmar venta
                    </button>
                  )}
                  {r.status !== 'cancelled' && (
                    <button onClick={() => updateStatus(r.id, 'cancelled')} className="text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <X className="w-3 h-3" /> Cancelar
                    </button>
                  )}
                  {r.status !== 'pending' && (
                    <button onClick={() => updateStatus(r.id, 'pending')} className="text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Marcar pendiente
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
    confirmed: { label: 'Confirmada', cls: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-800' }
  };
  const s = map[status] || map.pending;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

function QRSection() {
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(window.location.origin); }, []);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&margin=20`;
  const copy = () => { navigator.clipboard.writeText(url); window.alert('Enlace copiado'); };
  const downloadQr = () => {
    const link = document.createElement('a');
    link.href = qrSrc;
    link.download = 'copa-arista-qr.png';
    link.target = '_blank';
    link.click();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <h3 className="font-bold text-stone-900 mb-1 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-amber-600" /> Código QR para sucursales
      </h3>
      <p className="text-sm text-stone-500 mb-5">Imprime este código y colócalo a la vista en cada sucursal.</p>
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="bg-stone-50 rounded-xl p-6 flex items-center justify-center">
          <img src={qrSrc} alt="QR" className="w-full max-w-xs rounded-lg" />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Enlace</label>
            <div className="flex gap-2">
              <input readOnly value={url} className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs" />
              <button onClick={copy} className="bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium px-3 py-2 rounded-lg">Copiar</button>
            </div>
          </div>
          <button onClick={downloadQr} className="w-full bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Descargar QR
          </button>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
            <p className="font-semibold mb-1">💡 Recomendación</p>
            <p>Imprime el QR en tamaño grande (mínimo 10 × 10 cm) y colócalo cerca de la caja registradora.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportSection({ teams, referrals }) {
  const exportCsv = () => {
    const rows = [['Fecha', 'Nombre', 'Apellido', 'Teléfono', 'Referencia venta', 'Referido por', 'Equipo', 'Estado', 'Monto MXN']];
    for (const r of referrals) {
      const team = teams.find(t => t.id === r.team_id);
      rows.push([
        new Date(r.created_at).toLocaleString('es-MX'),
        r.first_name, r.last_name, r.phone, r.sale_reference, r.referrer_name,
        team?.name || '', r.status, r.sale_amount || 0
      ]);
    }
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `copa-arista-referidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h3 className="font-bold text-stone-900 mb-1">Exportar datos</h3>
        <p className="text-sm text-stone-500 mb-5">Descarga la información en CSV (abre con Excel).</p>
        <button onClick={exportCsv} disabled={referrals.length === 0}
          className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-semibold p-4 rounded-xl flex items-center gap-3">
          <Download className="w-5 h-5" />
          <span>Descargar todos los referidos ({referrals.length})</span>
        </button>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-amber-900 mb-1">Resumen rápido</p>
        <ul className="text-amber-800 space-y-0.5 text-xs">
          <li>• {teams.length} equipos · {referrals.length} referidos</li>
          <li>• {referrals.filter(r => r.status === 'confirmed').length} ventas confirmadas</li>
          <li>• ${referrals.filter(r => r.status === 'confirmed').reduce((s, r) => s + (parseFloat(r.sale_amount) || 0), 0).toLocaleString('es-MX')} MXN total</li>
        </ul>
      </div>
    </div>
  );
}
