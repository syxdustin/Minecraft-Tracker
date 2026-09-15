import { useEffect } from "react";
import { getToken } from "../Spotify.jsx";

function Callback() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
            getToken(code);
        }
    }, []);

    return (
        <div>
            <h1>Spotify Connected</h1>
        </div>
    );
}

export default Callback;