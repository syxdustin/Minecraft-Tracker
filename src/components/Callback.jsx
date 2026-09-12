function Callback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    console.log("Spotify code:", code);

    return (
        <div>
            <h1>Spotify Callback</h1>
        </div>
    );
}
export default Callback;