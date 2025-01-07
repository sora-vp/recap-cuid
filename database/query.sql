-- name: InsertNewParticipant :exec
INSERT INTO participants (cuid, name, subpart) VALUES (?, ?, ?);

-- name: GetSpecificParticipant :one
SELECT name, subpart FROM participants
WHERE cuid = ?;

-- name: ListAllParticipants :many
SELECT name, subpart, cuid, created_at FROM participants;

-- name: DeleteSpecificParticipant :exec
DELETE FROM participants WHERE cuid = ?;