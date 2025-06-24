-- D1 Database Schema for Cusdis Comment System
-- Converted from Prisma schema to SQL

-- Users table (simplified auth - email/password)
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT,
    display_name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    email_verified INTEGER DEFAULT 0,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    enable_new_comment_notification INTEGER DEFAULT 1,
    notification_email TEXT
);

-- Projects table
CREATE TABLE projects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    owner_id TEXT NOT NULL,
    token TEXT,
    fetch_latest_comments_at DATETIME,
    enable_notification INTEGER DEFAULT 1,
    webhook TEXT,
    enable_webhook INTEGER DEFAULT 0,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Pages table
CREATE TABLE pages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    slug TEXT NOT NULL,
    url TEXT,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    project_id TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Comments table
CREATE TABLE comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    page_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    moderator_id TEXT,
    by_email TEXT,
    by_nickname TEXT NOT NULL,
    content TEXT NOT NULL,
    approved INTEGER DEFAULT 0,
    parent_id TEXT,
    FOREIGN KEY (page_id) REFERENCES pages(id),
    FOREIGN KEY (moderator_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id)
);

-- Subscriptions table (simplified)
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'free',
    ends_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Usage tracking table
CREATE TABLE usage (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    label TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, label),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_deleted ON projects(deleted_at);
CREATE INDEX idx_pages_project ON pages(project_id);
CREATE INDEX idx_comments_page ON comments(page_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_approved ON comments(approved);
CREATE INDEX idx_comments_deleted ON comments(deleted_at);
CREATE INDEX idx_comments_created ON comments(created_at);