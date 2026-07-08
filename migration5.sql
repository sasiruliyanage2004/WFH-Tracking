-- migration5.sql
-- Add productivity keywords configuration to companies table

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS productive_apps JSONB DEFAULT '["code", "idea64", "cmd", "powershell", "wt", "terminal", "iterm", "iterm2", "gnome-terminal", "konsole", "xfce4-terminal", "slack", "teams", "zoom", "discord", "git", "github", "sourcetree", "postman", "mongodbcompass", "dbeaver", "pgadmin4", "node", "npm", "antigravity", "visual studio code", "vs code", "stack overflow", "supabase", "pull request", "jira", "trello", "figma", "bitbucket", "localhost", "document", "sheet", "slide", "excel", "word", "powerpoint", "wfh-tracking"]'::jsonb;

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS unproductive_apps JSONB DEFAULT '["spotify", "steam", "epicgames", "netflix", "league of legends", "valheim", "minecraft", "game", "youtube", "facebook", "instagram", "twitter", "reddit", "twitch", "tiktok", "pinterest", "roblox"]'::jsonb;

-- Ensure existing rows get the defaults
UPDATE public.companies 
SET productive_apps = '["code", "idea64", "cmd", "powershell", "wt", "terminal", "iterm", "iterm2", "gnome-terminal", "konsole", "xfce4-terminal", "slack", "teams", "zoom", "discord", "git", "github", "sourcetree", "postman", "mongodbcompass", "dbeaver", "pgadmin4", "node", "npm", "antigravity", "visual studio code", "vs code", "stack overflow", "supabase", "pull request", "jira", "trello", "figma", "bitbucket", "localhost", "document", "sheet", "slide", "excel", "word", "powerpoint", "wfh-tracking"]'::jsonb
WHERE productive_apps IS NULL;

UPDATE public.companies 
SET unproductive_apps = '["spotify", "steam", "epicgames", "netflix", "league of legends", "valheim", "minecraft", "game", "youtube", "facebook", "instagram", "twitter", "reddit", "twitch", "tiktok", "pinterest", "roblox"]'::jsonb
WHERE unproductive_apps IS NULL;
