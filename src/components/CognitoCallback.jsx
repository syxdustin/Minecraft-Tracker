import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeCognitoLogin } from "../auth/cognito.js";

function CognitoCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (hasCompleted.current) {
      return;
    }

    hasCompleted.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const cognitoError = params.get("error");

    if (cognitoError) {
      setError(params.get("error_description") || cognitoError);
      return;
    }

    if (!code) {
      setError("Cognito did not return an authorization code.");
      return;
    }

    async function finishLogin() {
      try {
        await completeCognitoLogin(code);
        navigate("/", { replace: true });
      } catch (loginError) {
        setError(loginError.message);
      }
    }

    finishLogin();
  }, [navigate]);

  if (error) {
    return <p>Cloud sign-in failed: {error}</p>;
  }

  return <p>Signing in to cloud history...</p>;
}

export default CognitoCallback;
