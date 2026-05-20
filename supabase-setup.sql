-- ===================================================================
-- COPA INTERNA ÓPTICA ARISTA - Esquema de base de datos
-- Pega este código completo en el SQL Editor de Supabase y ejecútalo
-- ===================================================================

-- Tabla de equipos
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  members TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de referidos
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  sale_reference TEXT NOT NULL,
  referrer_name TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  sale_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para que las consultas vayan rápido
CREATE INDEX idx_referrals_team_id ON referrals(team_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_created_at ON referrals(created_at DESC);

-- Habilitar Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública (cualquiera puede ver equipos y ranking)
CREATE POLICY "Lectura publica de equipos" ON teams FOR SELECT USING (true);
CREATE POLICY "Lectura publica de referidos" ON referrals FOR SELECT USING (true);

-- Permitir inserción pública (los clientes pueden registrarse)
CREATE POLICY "Insertar referidos publico" ON referrals FOR INSERT WITH CHECK (true);

-- Permitir todas las operaciones para gestión admin
-- (la contraseña del admin se valida en el frontend; para mayor seguridad
--  más adelante se puede mover a Supabase Auth)
CREATE POLICY "Admin puede insertar equipos" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin puede actualizar equipos" ON teams FOR UPDATE USING (true);
CREATE POLICY "Admin puede borrar equipos" ON teams FOR DELETE USING (true);
CREATE POLICY "Admin puede actualizar referidos" ON referrals FOR UPDATE USING (true);
CREATE POLICY "Admin puede borrar referidos" ON referrals FOR DELETE USING (true);

-- Activar replicación en tiempo real para que la tabla se actualice sola
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE referrals;
