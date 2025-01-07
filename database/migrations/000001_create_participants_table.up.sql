CREATE TABLE participants (
    id         INTEGER PRIMARY KEY,
    cuid       VARCHAR(28) NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    subpart    VARCHAR(50) NOT NULL,
    created_at timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) 
);