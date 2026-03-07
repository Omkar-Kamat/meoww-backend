# Socket Reconnection — Client Integration Guide

## Error codes on connection failure

When `socket.connect()` fails, the `connect_error` event fires with an `err`
object. Check `err.data.code` to decide what to do:

```js
socket.on("connect_error", async (err) => {
    const code = err.data?.code;

    if (code === "TOKEN_EXPIRED") {
        // Access token expired — refresh over HTTP then reconnect.
        // The user is still logged in; this is a recoverable state.
        try {
            await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
            socket.connect(); // retry — new cookie is now set
        } catch {
            // Refresh failed (e.g. refresh token also expired) → logout
            window.location.href = "/login";
        }

    } else if (code === "TOKEN_INVALID") {
        // Token is malformed or signature is wrong — do not retry.
        // Redirect to login.
        window.location.href = "/login";

    } else if (code === "NO_TOKEN" || code === "NO_COOKIE") {
        // Not logged in at all
        window.location.href = "/login";
    }
});
```

---

## Mid-session token expiry

Once connected, the server schedules two events based on the JWT `exp` claim:

### `token-expiring-soon`
Fires **2 minutes before** the token expires.
Use this to proactively refresh so the user never experiences a disconnect.

```js
socket.on("token-expiring-soon", async ({ expiresInMs }) => {
    try {
        await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        // Reconnect to pick up the new token — socket.io will re-run the
        // auth middleware which reads the updated cookie.
        socket.disconnect();
        socket.connect();
    } catch {
        // Refresh failed — let the expiry event handle it
    }
});
```

### `token-expired`
Fires **at** token expiry if the client didn't refresh in time.
The server disconnects the socket immediately after emitting this.

```js
socket.on("token-expired", () => {
    // Show "session expired" UI, then redirect
    showSessionExpiredModal();
});
```

---

## Session terminated (duplicate tab)

If the same user opens a second tab, the first tab's socket is kicked:

```js
socket.on("session-terminated", ({ reason }) => {
    if (reason === "another_session_detected") {
        showToast("You connected from another tab. This session has ended.");
        socket.disconnect();
    }
});
```

---

## Recommended socket setup

```js
// Disable auto-reconnect — we handle reconnection manually so we can
// refresh the token before retrying. Auto-reconnect would re-attempt
// with the same expired cookie and fail in a loop.
const socket = io(SERVER_URL, {
    withCredentials: true,
    autoConnect: false,   // connect manually after confirming auth state
    reconnection: false,  // we handle this ourselves
});

// Connect only after confirming the user is authenticated
async function connectSocket() {
    // Optionally pre-refresh if you know the token is close to expiry
    socket.connect();
}
```