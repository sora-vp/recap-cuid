-- name: InsertNewParticipant :exec
INSERT INTO participants (cuid, name, subpart) VALUES (?, ?, ?);

-- name: GetSpecificParticipant :one
SELECT name, subpart FROM participants
WHERE cuid = ?;