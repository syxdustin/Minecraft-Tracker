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
  const albumName = track.album?.name?.toLowerCase();

  return (
    MINECRAFT_SOUNDTRACK_ALBUMS.has(albumName) &&
    track.artists.some((artist) => MINECRAFT_COMPOSERS.has(artist.name))
  );
}

export function getAlbumTotals(items) {
  const totals = items.reduce((albums, item) => {
    const album = item.track.album;
    const existing = albums.get(album.id) || {
      id: album.id,
      name: album.name,
      imageUrl: album.images?.[1]?.url || album.images?.[0]?.url,
      durationMs: 0,
      trackCount: 0,
    };

    existing.durationMs += item.track.duration_ms;
    existing.trackCount += 1;
    albums.set(album.id, existing);

    return albums;
  }, new Map());

  return [...totals.values()].sort((a, b) => b.durationMs - a.durationMs);
}

export function createHeatmapEntry(item) {
  return {
    playedAt: item.played_at,
    durationMs: item.track.duration_ms,
  };
}