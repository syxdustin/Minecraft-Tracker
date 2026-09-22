function Stats({ minutes, label = "Minecraft listening time" }) {
  return <p className="stats">{label}: {minutes} minutes</p>;
}

export default Stats;
