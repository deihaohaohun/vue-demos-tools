-- ========================================================
-- 全局修复 RLS 权限问题 (针对所有表)
-- ========================================================
-- 此脚本将重置所有业务表的 RLS 策略，允许匿名用户(anon)进行所有操作。

-- 定义需要修复的表列表
-- 1. todos
-- 2. todo_templates
-- 3. todo_day_stats
-- 4. todo_history
-- 5. todo_archived_history
-- 6. todo_abandoned_goals
-- 7. todo_punch_records
-- 8. todo_goal_history_records
-- 9. app_configs

-- ========================================================
-- 1. todos
-- ========================================================
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON todos;
DROP POLICY IF EXISTS "todo_public_policy" ON todos;
CREATE POLICY "todo_public_policy" ON todos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE todos TO anon, authenticated, service_role;

-- ========================================================
-- 2. todo_templates
-- ========================================================
ALTER TABLE todo_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON todo_templates;
DROP POLICY IF EXISTS "template_public_policy" ON todo_templates;
CREATE POLICY "template_public_policy" ON todo_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE todo_templates TO anon, authenticated, service_role;

-- ========================================================
-- 3. todo_day_stats (本次报错的表)
-- ========================================================
ALTER TABLE todo_day_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON todo_day_stats;
DROP POLICY IF EXISTS "day_stats_public_policy" ON todo_day_stats;
CREATE POLICY "day_stats_public_policy" ON todo_day_stats FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE todo_day_stats TO anon, authenticated, service_role;

-- ========================================================
-- 4. todo_history
-- ========================================================
ALTER TABLE todo_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON todo_history;
DROP POLICY IF EXISTS "history_public_policy" ON todo_history;
CREATE POLICY "history_public_policy" ON todo_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE todo_history TO anon, authenticated, service_role;

-- ========================================================
-- 5. todo_archived_history
-- ========================================================
ALTER TABLE todo_archived_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON todo_archived_history;
DROP POLICY IF EXISTS "archived_history_public_policy" ON todo_archived_history;
CREATE POLICY "archived_history_public_policy" ON todo_archived_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE todo_archived_history TO anon, authenticated, service_role;

-- ========================================================
-- 6. todo_abandoned_goals
-- ========================================================
ALTER TABLE todo_abandoned_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON todo_abandoned_goals;
DROP POLICY IF EXISTS "abandoned_goals_public_policy" ON todo_abandoned_goals;
CREATE POLICY "abandoned_goals_public_policy" ON todo_abandoned_goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE todo_abandoned_goals TO anon, authenticated, service_role;

-- ========================================================
-- 7. todo_punch_records
-- ========================================================
ALTER TABLE todo_punch_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON todo_punch_records;
DROP POLICY IF EXISTS "punch_records_public_policy" ON todo_punch_records;
CREATE POLICY "punch_records_public_policy" ON todo_punch_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE todo_punch_records TO anon, authenticated, service_role;

-- ========================================================
-- 8. todo_goal_history_records
-- ========================================================
ALTER TABLE todo_goal_history_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON todo_goal_history_records;
DROP POLICY IF EXISTS "goal_history_public_policy" ON todo_goal_history_records;
CREATE POLICY "goal_history_public_policy" ON todo_goal_history_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE todo_goal_history_records TO anon, authenticated, service_role;

-- ========================================================
-- 9. app_configs (再次确保)
-- ========================================================
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON app_configs;
DROP POLICY IF EXISTS "config_public_policy" ON app_configs;
CREATE POLICY "config_public_policy" ON app_configs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE app_configs TO anon, authenticated, service_role;
