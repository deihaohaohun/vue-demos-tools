-- ========================================================
-- 清空所有测试数据 (危险操作)
-- ========================================================
-- 警告：这将删除以下表中的所有数据！且不可恢复！

TRUNCATE TABLE
  todos,
  todo_templates,
  todo_day_stats,
  todo_history,
  todo_archived_history,
  todo_abandoned_goals,
  todo_punch_records,
  todo_goal_history_records,
  app_configs
RESTART IDENTITY CASCADE;

-- 说明：
-- RESTART IDENTITY: 重置 ID 自增序列
-- CASCADE: 级联删除依赖数据
