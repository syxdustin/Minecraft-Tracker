// Skips look-alike characters (0/O, 1/I/L) so codes are easy to read aloud.
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;

// PeerJS IDs are global on the public broker, so namespace them to this app.
const PEER_ID_PREFIX = "spotify-sync-room-";

function makeRoomCode() {
  const values = window.crypto.getRandomValues(new Uint32Array(ROOM_CODE_LENGTH));

  return Array.from(
    values,
    (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]
  ).join("");
}

function normalizeRoomCode(input) {
  return (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isValidRoomCode(code) {
  return (
    code.length === ROOM_CODE_LENGTH &&
    [...code].every((character) => ROOM_CODE_ALPHABET.includes(character))
  );
}

function peerIdForRoom(code) {
  return `${PEER_ID_PREFIX}${code}`;
}

export {
  ROOM_CODE_LENGTH,
  isValidRoomCode,
  makeRoomCode,
  normalizeRoomCode,
  peerIdForRoom,
};
