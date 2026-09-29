const MINECRAFT_SOUNDTRACK_ALBUMS = new Set([
  "minecraft - volume alpha",
  "minecraft - volume beta",
  "minecraft: nether update: original game soundtrack",
  "minecraft: caves & cliffs (original game soundtrack)",
  "minecraft: the wild update (original game soundtrack)",
  "minecraft: trails & tales: original game soundtrack",
  "minecraft: tricky trials (original game soundtrack)",
]);

const MINECRAFT_COMPOSERS = new Set([
  "C418",
  "Lena Raine",
  "Kumi Tanioka",
  "Samuel Åberg",
  "Aaron Cherof",
]);

export function isMinecraftSoundtrackTrack(track) {
  const albumName = track?.album?.name?.toLowerCase();
  const hasMinecraftComposer = track?.artists?.some((artist) =>
    MINECRAFT_COMPOSERS.has(artist.name)
  );

  return Boolean(
    MINECRAFT_SOUNDTRACK_ALBUMS.has(albumName) && hasMinecraftComposer
  );
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
