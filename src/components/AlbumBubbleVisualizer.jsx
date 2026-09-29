import { useEffect, useRef } from "react";

const BUBBLE_LABEL_HEIGHT = 92;

function formatListeningTime(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getBubbleSize(durationMs, maximumDurationMs) {
  const smallestBubble = 88;
  const largestBubble = 244;

  if (!maximumDurationMs) {
    return smallestBubble;
  }

  const relativeArea = durationMs / maximumDurationMs;

  return Math.round(
    smallestBubble + (largestBubble - smallestBubble) * Math.sqrt(relativeArea)
  );
}

function getAlbumInitials(name) {
  return name
    .replace(/^minecraft[:\s-]*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function useBubbleMotion(bubbleKey) {
  const fieldRef = useRef(null);
  const bubbleRefs = useRef(new Map());

  useEffect(() => {
    const field = fieldRef.current;

    if (!field || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let frameId;
    let startTime;
    let particles = [];
    let resizeObserver;

    function setBubbleRef(id, node) {
      if (node) {
        bubbleRefs.current.set(id, node);
      } else {
        bubbleRefs.current.delete(id);
      }
    }

    function resetParticles() {
      const fieldWidth = field.clientWidth;
      const fieldHeight = field.clientHeight;

      particles = [...bubbleRefs.current.entries()].map(([id, node], index) => {
        const width = node.offsetWidth;
        const height = node.offsetHeight;
        const usableWidth = Math.max(0, fieldWidth - width);
        const startingX = usableWidth
          ? (index * 97 + width * 0.5) % usableWidth
          : 0;

        return {
          id,
          node,
          width,
          height,
          x: startingX,
          y: -height - index * 88,
          velocityX: (index % 2 ? 1 : -1) * (0.38 + (index % 3) * 0.08),
          velocityY: 0,
          delay: index * 150,
        };
      });
    }

    function animate(timestamp) {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const fieldWidth = field.clientWidth;
      const fieldHeight = field.clientHeight;

      for (const particle of particles) {
        if (elapsed < particle.delay) {
          particle.node.style.opacity = "0";
          continue;
        }

        const maxX = Math.max(0, fieldWidth - particle.width);
        const maxY = Math.max(0, fieldHeight - particle.height);

        particle.velocityY += 0.22;
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;

        if (particle.x <= 0 || particle.x >= maxX) {
          particle.x = Math.min(Math.max(particle.x, 0), maxX);
          particle.velocityX *= -1;
        }

        if (particle.y >= maxY) {
          particle.y = maxY;
          particle.velocityY *= -0.56;
          particle.velocityX *= 0.995;

          if (Math.abs(particle.velocityY) < 1.3) {
            particle.velocityY = -3.6;
          }
        }

        particle.node.style.opacity = String(
          Math.min(1, (elapsed - particle.delay) / 420)
        );
        particle.node.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0)`;
      }

      frameId = window.requestAnimationFrame(animate);
    }

    resetParticles();
    resizeObserver = new ResizeObserver(resetParticles);
    resizeObserver.observe(field);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [bubbleKey]);

  return { fieldRef, bubbleRefs };
}

function AlbumBubble({ album, size, bubbleRefs }) {
  return (
    <article
      ref={(node) => {
        if (node) {
          bubbleRefs.current.set(album.id, node);
        } else {
          bubbleRefs.current.delete(album.id);
        }
      }}
      className="album-bubble"
      style={{
        "--bubble-size": `${size}px`,
        "--bubble-label-height": `${BUBBLE_LABEL_HEIGHT}px`,
      }}
    >
      <div className="album-bubble__art">
        {album.imageUrl ? (
          <img src={album.imageUrl} alt="" />
        ) : (
          <span className="album-bubble__fallback" aria-hidden="true">
            {getAlbumInitials(album.name)}
          </span>
        )}
      </div>

      <div className="album-bubble__details">
        <strong>{album.name}</strong>
        <span>{formatListeningTime(Math.round(album.durationMs / 60000))}</span>
      </div>
    </article>
  );
}

function AlbumBubbleVisualizer({
  albumTotals,
  minutes,
  tracksCount,
  isLoading,
  error,
}) {
  const maximumDurationMs = albumTotals[0]?.durationMs || 0;
  const bubbleKey = albumTotals
    .map((album) => `${album.id}:${album.durationMs}`)
    .join("|");
  const { fieldRef, bubbleRefs } = useBubbleMotion(bubbleKey);

  return (
    <section className="album-bubbles" aria-labelledby="soundtrack-heading">
      <header className="album-bubbles__header">
        <div>
          <h2 id="soundtrack-heading">Minecraft soundtrack</h2>
          <p>
            {albumTotals.length
              ? `${formatListeningTime(minutes)} across ${tracksCount} play${tracksCount === 1 ? "" : "s"}`
              : "No official Minecraft tracks in this Spotify window."}
          </p>
        </div>
        <p className="album-bubbles__legend">Bubble area = listening time</p>
      </header>

      {error ? <p className="album-bubbles__error">{error}</p> : null}

      {isLoading && !albumTotals.length ? (
        <p className="album-bubbles__status">Loading your Spotify snapshot…</p>
      ) : albumTotals.length ? (
        <div
          ref={fieldRef}
          className="bubble-field"
          aria-label="Minecraft soundtrack albums moving by listening time"
        >
          {albumTotals.map((album) => (
            <AlbumBubble
              key={album.id}
              album={album}
              size={getBubbleSize(album.durationMs, maximumDurationMs)}
              bubbleRefs={bubbleRefs}
            />
          ))}
        </div>
      ) : (
        <p className="album-bubbles__status">
          Play a Minecraft soundtrack track, then refresh.
        </p>
      )}
    </section>
  );
}

export default AlbumBubbleVisualizer;
