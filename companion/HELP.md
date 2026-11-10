# Apple TV

Requires Companion 5.1.0 or later.

No terminal setup is required. Keep Apple TV and Companion reachable
on the same local network.

1. Enable the connection and Save. Select your Apple TV from the list. Use
   **Refresh device list when saving** if it is missing.
2. Watch the TV, check **Start pairing when saving**, and Save.
3. Enter the TV's four-digit PIN and Save while the prompt is still open.
4. Wait for **Connected**. The PIN clears after submission; verified keys are
   saved in Companion's connection secrets for future restarts.

Pairing never starts automatically. The module waits up to three minutes, but
the TV can close the session earlier; Companion reports when that happens.
If pairing fails or expires, explicitly start a
new attempt. Disabling the connection cancels a pending attempt.

Remote command offers navigation, playback, volume, seeks, swipes, App Switcher,
Control Center, Screensaver and power. Launch App lists the TV's applications.
Seeks sent faster than the TV answers, such as from an encoder, are combined into
fewer skips of up to 60 seconds each; opposite turns subtract.
Available playback commands and Now Playing metadata depend on the active app.
Text entry is not implemented.

## Personal audio output (AirPods)

Set **Personal output name contains** (for example `AirPods`) to enable the
**Personal audio output** action. Select the AirPods once from the TV's Control
Center so the module sees them in the TV's output list; it then remembers their
identifier in the connection secrets. Leave the name empty to disable the feature.
**Personal output identifier** overrides the name match when needed.

The action's Route option is **Toggle personal output**, **Route to personal
output** or **Route to default output**. Toggle decides the direction from the
TV's current output list. Each press sends one request, and sends it once more
if the TV has not switched 3 seconds after the request settles.
Returning to default selects the other outputs the TV currently reports.

`personal_output_route` shows `Personal`, `Default`, `Connecting`, `Failed` or
`Unavailable`; `personal_output_name` shows the remembered output name. The
**Personal audio output active** feedback follows the reported route. The route
comes only from the TV's reported outputs, so changes made on the TV also update
it. `Failed` appears after 20 seconds without confirmation, or immediately if
the TV rejects the request. It clears after 10 seconds or as soon as the route
changes, so a late connection still shows the real route. `Unavailable` means
the feature is disabled, the TV is not connected, the AirPods have not yet been
seen, or this connection cannot change outputs.

Taking over AirPods that are connected to another Apple device on the same
account can take longer than 8 seconds; nearby idle AirPods usually confirm in
under a second. If a press fails while the AirPods are still switching, wait for
the route to update before pressing again.

Mute saves a nonzero level, then sets volume to zero. Press again to restore only
while the same output and valid feedback remain. Output changes, external volume
changes, capability loss and reconnect discard that saved level; switching back
to AirPods does not automatically restore it. **Unavailable** means the module
cannot safely restore a level. Numeric volume does not prove perceived loudness.

Wake uses Home when the TV reports Off and returns to the Home screen. An
immediate sleep/wake cycle can fail; allow the TV to finish sleeping.
Commands are not replayed after failure. `last_result` reports dispatch, not a
physical result. Connection loss clears stale metadata and reconnects using
saved keys without a new PIN prompt.

## Feedbacks

- **Apple TV is on**: true while the TV reports that it is awake.
- **Personal audio output active**: true while the TV reports the configured
  personal output in its audio route.

## Variables

Use them on a button as `$(label:variable)`, where label is this connection's
name in Companion.

| Variable                | Shows                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| `power`                 | `On`, `Off` or `Unknown`                                                    |
| `title`                 | Now playing title, or `Nothing Playing`                                     |
| `artist`                | Now playing artist                                                          |
| `app`                   | App that is playing                                                         |
| `playback_state`        | `Playing`, `Paused`, `Stopped`, `Seeking`, `Idle`, `Interrupted`, `Unknown` |
| `position`, `duration`  | Whole seconds                                                               |
| `elapsed`, `remaining`  | Time as `m:ss` or `h:mm:ss`                                                 |
| `progress`              | Percent played, `0` to `100`                                                |
| `volume`                | Volume as a whole percent; blank when the TV does not report it             |
| `mute_state`            | `Muted`, `Unmuted` or `Unavailable`                                         |
| `metadata_state`        | `Connecting`, `Connected` or `Offline`                                      |
| `connection`            | Setup state, such as `ready`, `connecting`, `reconnecting` or `error`       |
| `last_result`           | Result of the last command sent; not proof the TV acted on it               |
| `personal_output_route` | See Personal audio output above                                             |
| `personal_output_name`  | Remembered personal output name                                             |
