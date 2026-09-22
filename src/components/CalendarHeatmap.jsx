import { useMemo } from "react";

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDay(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function formatMinutes(durationMs) {
  const minutes = Math.round(durationMs / 60000);

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function getLevel(durationMs) {
  const minutes = durationMs / 60000;

  if (!minutes) {
    return 0;
  }

  if (minutes <= 10) {
    return 1;
  }

  if (minutes <= 30) {
    return 2;
  }

  if (minutes <= 60) {
    return 3;
  }

  return 4;
}

function buildCalendar(sessions) {
  const today = startOfDay(new Date());
  const firstTrackedDay = new Date(today);
  firstTrackedDay.setDate(firstTrackedDay.getDate() - 364);

  const calendarStart = new Date(firstTrackedDay);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());

  const dailyTotals = sessions.reduce((totals, session) => {
    const playedAt = new Date(session.playedAt);

    if (Number.isNaN(playedAt.getTime())) {
      return totals;
    }

    const key = toDayKey(playedAt);
    totals.set(key, (totals.get(key) || 0) + session.durationMs);

    return totals;
  }, new Map());

  const days = Array.from({ length: 53 * 7 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(date.getDate() + index);

    const isFuture = date > today;
    const isBeforeRange = date < firstTrackedDay;
    const durationMs =
      isFuture || isBeforeRange ? 0 : dailyTotals.get(toDayKey(date)) || 0;

    return {
      date,
      durationMs,
      isFuture,
      isBeforeRange,
      level: getLevel(durationMs),
    };
  });

  const visibleDays = days.filter((day) => !day.isFuture && !day.isBeforeRange);
  const totalDurationMs = visibleDays.reduce(
    (total, day) => total + day.durationMs,
    0
  );
  const activeDays = visibleDays.filter((day) => day.durationMs > 0).length;

  return { activeDays, days, totalDurationMs };
}

function CalendarHeatmap({ sessions, isSignedIn, isLoading }) {
  const { activeDays, days, totalDurationMs } = useMemo(
    () => buildCalendar(sessions),
    [sessions]
  );

  return (
    <section className="dashboard-card heatmap">
      <div>
        <h2>Listening calendar</h2>
        <p className="dashboard__muted">
          Your official Minecraft soundtrack listening over the last 365 days.
        </p>
      </div>

      {!isSignedIn ? (
        <p className="dashboard__muted heatmap__message">
          Sign in to cloud history to see your listening calendar.
        </p>
      ) : isLoading ? (
        <p className="dashboard__muted heatmap__message">
          Loading your listening calendar...
        </p>
      ) : (
        <>
          <p className="heatmap__summary">
            {formatMinutes(totalDurationMs)} across {activeDays} active day
            {activeDays === 1 ? "" : "s"}.
          </p>

          <div className="heatmap__scroll">
            <div
              className="heatmap__grid"
              aria-label="Minecraft listening calendar"
              role="list"
            >
              {days.map((day) => {
                const label = `${formatDay(day.date)}: ${formatMinutes(
                  day.durationMs
                )} of Minecraft listening`;

                return (
                  <span
                    key={toDayKey(day.date)}
                    className={`heatmap__cell heatmap__cell--level-${day.level}${
                      day.isFuture || day.isBeforeRange
                        ? " heatmap__cell--empty"
                        : ""
                    }`}
                    role="listitem"
                    aria-label={
                      day.isFuture || day.isBeforeRange ? undefined : label
                    }
                    title={
                      day.isFuture || day.isBeforeRange ? undefined : label
                    }
                  />
                );
              })}
            </div>
          </div>

          <div className="heatmap__legend" aria-hidden="true">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i
                key={level}
                className={`heatmap__cell heatmap__cell--level-${level}`}
              />
            ))}
            <span>More</span>
          </div>
        </>
      )}
    </section>
  );
}

export default CalendarHeatmap;
