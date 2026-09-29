import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../Spotify.jsx";

function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setError("Spotify did not return an authorization code.");
      return;
    }

    async function exchangeCode() {
      try {
        await getToken(code);
        navigate("/", { replace: true });
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    exchangeCode();
  }, [navigate]);

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
