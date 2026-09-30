import { useEffect, useRef } from "react";

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
    const listenerCleanups = [];

    function keepInsideField(particle) {
      const maxX = Math.max(0, field.clientWidth - particle.width);
      const maxY = Math.max(0, field.clientHeight - particle.height);

      particle.x = Math.min(Math.max(particle.x, 0), maxX);
      particle.y = Math.min(Math.max(particle.y, 0), maxY);

      return { maxX, maxY };
    }

    function drawParticle(particle) {
      particle.node.style.opacity = "1";
      particle.node.style.transform =
        `translate3d(${particle.x}px, ${particle.y}px, 0)`;
    }

    function beginDrag(event, particle) {
      event.preventDefault();

      particle.dragging = true;
      particle.settled = true;
      particle.velocityX = 0;
      particle.velocityY = 0;
      particle.pointerId = event.pointerId;
      particle.dragOffsetX = event.clientX - particle.x;
      particle.dragOffsetY = event.clientY - particle.y;
      particle.node.classList.add("album-bubble--dragging");
      particle.node.setPointerCapture(event.pointerId);
    }

    function moveDrag(event, particle) {
      if (!particle.dragging || event.pointerId !== particle.pointerId) {
        return;
      }

      particle.x = event.clientX - particle.dragOffsetX;
      particle.y = event.clientY - particle.dragOffsetY;
      keepInsideField(particle);
      drawParticle(particle);
    }

    function endDrag(event, particle) {
      if (!particle.dragging || event.pointerId !== particle.pointerId) {
        return;
      }

      particle.dragging = false;
      particle.node.classList.remove("album-bubble--dragging");

      if (particle.node.hasPointerCapture(event.pointerId)) {
        particle.node.releasePointerCapture(event.pointerId);
      }
    }

    function createParticles() {
      const fieldWidth = field.clientWidth;

      particles = [...bubbleRefs.current.entries()].map(([id, node], index) => {
        const width = node.offsetWidth;
        const height = node.offsetHeight;
        const usableWidth = Math.max(0, fieldWidth - width);
        const startingX = usableWidth
          ? (index * 131 + width * 0.35) % usableWidth
          : 0;
        const particle = {
          id,
          node,
          width,
          height,
          x: startingX,
          y: -height - index * 72,
          velocityX: (index % 2 ? 1 : -1) * (0.7 + (index % 3) * 0.15),
          velocityY: 0,
          delay: index * 170,
          dragging: false,
          settled: false,
          pointerId: null,
          dragOffsetX: 0,
          dragOffsetY: 0,
        };

        const onPointerDown = (event) => beginDrag(event, particle);
        const onPointerMove = (event) => moveDrag(event, particle);
        const onPointerUp = (event) => endDrag(event, particle);

        node.addEventListener("pointerdown", onPointerDown);
        node.addEventListener("pointermove", onPointerMove);
        node.addEventListener("pointerup", onPointerUp);
        node.addEventListener("pointercancel", onPointerUp);

        listenerCleanups.push(() => {
          node.removeEventListener("pointerdown", onPointerDown);
          node.removeEventListener("pointermove", onPointerMove);
          node.removeEventListener("pointerup", onPointerUp);
          node.removeEventListener("pointercancel", onPointerUp);
        });

        return particle;
      });
    }

    function animate(timestamp) {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      let needsAnotherFrame = false;

      for (const particle of particles) {
        if (elapsed < particle.delay) {
          particle.node.style.opacity = "0";
          needsAnotherFrame = true;
          continue;
        }

        if (particle.dragging || particle.settled) {
          continue;
        }

        needsAnotherFrame = true;

        const { maxX, maxY } = keepInsideField(particle);
        const motionTime = elapsed - particle.delay;

        particle.velocityY += 0.24;
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;

        if (particle.x <= 0 || particle.x >= maxX) {
          particle.x = Math.min(Math.max(particle.x, 0), maxX);
          particle.velocityX *= -0.72;
        }

        if (particle.y >= maxY) {
          particle.y = maxY;
          particle.velocityY *= -0.42;
          particle.velocityX *= 0.78;

          if (Math.abs(particle.velocityY) < 0.8) {
            particle.velocityY = 0;
          }
        }

        if (
          motionTime > 5200 ||
          (particle.y === maxY &&
            particle.velocityY === 0 &&
            Math.abs(particle.velocityX) < 0.12)
        ) {
          particle.y = maxY;
          particle.velocityX = 0;
          particle.velocityY = 0;
          particle.settled = true;
        }

        particle.node.style.opacity = String(Math.min(1, motionTime / 420));
        particle.node.style.transform =
          `translate3d(${particle.x}px, ${particle.y}px, 0)`;
      }

      if (needsAnotherFrame) {
        frameId = window.requestAnimationFrame(animate);
      }
    }

    createParticles();

    resizeObserver = new ResizeObserver(() => {
      for (const particle of particles) {
        particle.width = particle.node.offsetWidth;
        particle.height = particle.node.offsetHeight;

        if (particle.settled || particle.dragging) {
          keepInsideField(particle);
          drawParticle(particle);
        }
      }
    });

    resizeObserver.observe(field);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      listenerCleanups.forEach((cleanup) => cleanup());
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
      style={{ "--bubble-size": `${size}px` }}
    >
      <div className="album-bubble__art">
        {album.imageUrl ? (
          <img src={album.imageUrl} alt="" draggable="false" />
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
        <p className="album-bubbles__legend">
          Bubble area = listening time · Drag to move
        </p>
      </header>

      {error ? <p className="album-bubbles__error">{error}</p> : null}

      {isLoading && !albumTotals.length ? (
        <p className="album-bubbles__status">Loading your Spotify snapshot…</p>
      ) : albumTotals.length ? (
        <div
          ref={fieldRef}
          className="bubble-field"
          aria-label="Draggable Minecraft soundtrack albums sized by listening time"
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
