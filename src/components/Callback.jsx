import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../Spotify.jsx";

function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const hasExchanged = useRef(false);

  useEffect(() => {
    // React Strict Mode runs effects twice in development.
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
      } catch (error) {
        setError(error.message);
      }
    }

    exchangeCode();
  }, [navigate]);

  if (error) {
    return <p>Spotify connection failed: {error}</p>;
  }

  return <p>Connecting Spotify...</p>;
}

export default Callback;