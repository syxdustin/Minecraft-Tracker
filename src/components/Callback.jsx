import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../Spotify.jsx";

function getInitialError() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("error")) return `Spotify returned "${params.get("error")}".`;
  if (!params.get("code")) return "Spotify did not return an authorization code.";

  return "";
}

function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState(getInitialError);
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current || error) return;
    hasExchanged.current = true;

    const code = new URLSearchParams(window.location.search).get("code");

    async function exchangeCode() {
      try {
        await getToken(code);
        navigate("/", { replace: true });
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    exchangeCode();
  }, [error, navigate]);

  if (error) {
    return (
      <main className="callback-status">
        <p className="callback-status__error">Spotify connection failed: {error}</p>
      </main>
    );
  }

  return (
    <main className="callback-status">
      <p>Connecting Spotify…</p>
    </main>
  );
}

export default Callback;
