const MINECRAFT_SOUNDTRACK_ALBUM_PREFIXES = [
  "minecraftvolumealpha",
  "minecraftvolumebeta",
  "minecraftnetherupdate",
  "minecraftcavescliffs",
  "minecraftthewildupdate",
  "minecrafttrailstales",
  "minecrafttrickytrials",
];

const MINECRAFT_COMPOSERS = new Set([
  "C418",
  "Lena Raine",
  "Kumi Tanioka",
  "Samuel Åberg",
  "Aaron Cherof",
]);

function normalizeAlbumName(name = "") {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isMinecraftSoundtrackTrack(track) {
  const albumName = normalizeAlbumName(track?.album?.name);
  const hasMinecraftAlbum = MINECRAFT_SOUNDTRACK_ALBUM_PREFIXES.some((prefix) =>
    albumName.includes(prefix)
  );
  const hasMinecraftComposer = track?.artists?.some((artist) =>
    MINECRAFT_COMPOSERS.has(artist.name)
  );

  return Boolean(hasMinecraftAlbum && hasMinecraftComposer);
}

export function getAlbumTotals(items) {
  const albums = new Map();

  for (const item of items) {
    const track = item.track;
    const album = track?.album;

    if (!album?.id) {
      continue;
    }

    const currentAlbum = albums.get(album.id) || {
      id: album.id,
      name: album.name,
      imageUrl: album.images?.[1]?.url || album.images?.[0]?.url,
      durationMs: 0,
      trackCount: 0,
    };

    currentAlbum.durationMs += track.duration_ms || 0;
    currentAlbum.trackCount += 1;
    albums.set(album.id, currentAlbum);
  }

  return [...albums.values()].sort((a, b) => b.durationMs - a.durationMs);
}
