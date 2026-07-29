-- 将用户设置为管理员
-- 在 Supabase SQL Editor 中执行此脚本
-- 将 'qiyuyi' 替换为你的用户名（注册时使用的用户名）

UPDATE users
SET role = 'ADMIN'
WHERE username = 'qiyuyi';

-- 查看所有用户角色
SELECT username, role, createdAt FROM users;
