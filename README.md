# Apple TV Companion module

Control Apple TV from Bitfocus Companion, with discovery, PIN pairing, remote
buttons, app launching and Now Playing variables. It runs entirely in Companion's
Node runtime, with no terminal command or credential file to prepare.

## Requirements

Companion 5.1.0 or later. Companion 5.0.x refuses to start this module.

## Setup

1. Import the built package into Companion and add an Apple TV connection.
2. Enable the connection and Save. Select your Apple TV from the discovered list.
   If needed, check **Refresh device list when saving** and Save again.
3. While watching that TV, check **Start pairing when saving** and Save.
4. Enter the four-digit PIN shown on the TV and Save while the prompt is still open.
5. Wait for **Connected**. Keys are saved in Companion's connection secrets after
   a fresh connection verifies remote control and metadata access.

Apple TV and Companion must be reachable on the same local network with Bonjour
discovery available. A saved pairing uses the TV's discovered identifier, so a
changed IP address does not require editing the connection. A PIN appears only
after an explicit pairing request; reconnects never start pairing automatically.

The PIN clears after submission. The module waits up to three minutes, but the
TV can close its session earlier. Companion reports that closure immediately.
If pairing fails or expires, explicitly start a
new attempt. Previous saved keys are retained until a replacement verifies.
Disabling the connection cancels a pending attempt. Failed pairing can leave a
controller registration on the TV; remove only the abandoned registration from
tvOS when retiring it.

## Controls and feedback

Remote command provides navigation, Select, Back, Home, Control Center, App
Switcher, Screensaver, play/pause, previous/next, ten- or thirty-second seeks,
relative volume, mute save/restore, power toggle, sleep and four swipe directions.
Launch App lists applications reported by the TV and accepts existing bundle
identifiers. Playback commands depend on the active app's advertised capabilities.
Text entry is not implemented.

Power toggle requires a current known state. Wake sends Home only while the TV
reports Off, so it opens the Home screen rather than resuming the previous stream.
Sleep (`sleep`) only ever sleeps the TV: it sends the sleep key without reading
power first, so it never wakes a TV that is already asleep. Wake (`wake`) only
ever wakes it: it reads power first and sends Home only while the TV reports
Off, so it never sleeps an awake TV or navigates Home on one. Read the `power`
variable, or use the **Apple TV is on** feedback, to confirm the result. The
feedback is true only while `power` reads On.
Allow the TV to finish sleeping before waking it. A cycle with twenty seconds
asleep worked in testing and a five-second cycle failed, so avoid immediate
sleep/wake automation.

Mute saves a nonzero reported volume and sets it to zero. A second press restores
the saved value only while the audio output and feedback remain valid. A dial
change, external volume change, output change, lost capability or reconnect
discards the saved level. Switching back to AirPods does not automatically restore
audio. A missing or discarded level is **Unavailable**, not a guessed mute state.
Output changes are observable only when reported by the TV; numeric volume does
not prove perceived loudness or per-output accuracy.

Presets provide ready-made Power (state, Wake, Sleep), Remote, Apps and Now
Playing buttons. The Apps group lists one Open button per app the TV reports
after connecting.

Variables include connection, title, artist, app, playback state, elapsed and
remaining time, progress, volume, mute-save state, power, personal output route
and name, and `last_result`.
Elapsed time advances from the selected player's reported position, timestamp
and playback rate; it freezes on pause and clears on connection loss. Streams
without a duration have no invented remaining time. Metadata availability depends
on the playing app. `last_result` describes dispatch, rejection or uncertain
delivery, never physical confirmation.

## Personal audio output

The **Personal audio output** action selects a personal output, such as
same-account AirPods, as the TV's system audio route. Enable it by setting
**Personal output name contains** (for example `AirPods`); an empty value
disables it. The TV must report the AirPods once, for example after selecting
them from its Control Center. The module then remembers their output UID in the
connection secrets, not the public configuration. If several reported outputs
match, nothing is learned. **Personal output identifier** overrides the match.

| Item                                               | ID                      | Values                                                       |
| -------------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| Action **Personal audio output**, option **Route** | `personalOutput`        | `target`: `toggle`, `personal` or `default`                  |
| Route variable                                     | `personal_output_route` | `Personal`, `Default`, `Connecting`, `Failed`, `Unavailable` |
| Name variable                                      | `personal_output_name`  | Remembered output name                                       |
| Boolean feedback **Personal audio output active**  | `personalOutputActive`  | True while the AirPods are in the reported route             |

The module sends one MRP `ModifyOutputContextRequest` with the `SharedSystemAudio`
context over the authenticated AirPlay session. Toggle chooses the direction
from the live output list. Returning to default selects the other outputs the
TV currently reports. If the route is still unconfirmed 3 seconds after the
request settles, the same request is sent once more on the same session, and
never again, because a first request just after AirPods leave their case can
connect them without routing audio to them. The TV's acknowledgement is not treated as success; only the reported output list confirms the route. A slow
or missing acknowledgement, common while AirPods are taken over from another
device, ends only that wait and never drops the connection.
`Connecting` lasts until confirmation or 20 seconds. `Failed` follows a timeout
or rejection and clears after 10 seconds or on the next route change. A late
connection or a change made on the TV therefore still updates the variable.
Reconnects cancel a pending request, including its repeat, without replaying it.

Taking over AirPods connected to another Apple device on the same account can
take more than 8 seconds; idle nearby AirPods usually confirm in under a second.

## How failures are handled

- One serialized action queue, at most eight operations, with input expiring
  after 500 ms waiting. Complete button and swipe gestures stay together.
- Seek ticks that arrive while an earlier seek is still waiting to be sent add
  to it, so a fast encoder spin becomes a few larger skips instead of one
  request per tick. One request carries at most 60 seconds; a tick that would
  pass that starts the next queued seek. A tick in the other direction subtracts,
  and ticks that cancel out send nothing. Ticks never join a seek queued before
  other input, and joined ticks share that request's result.
- Failed or lost sessions discard queued actions and stale feedback. Controls
  are never automatically retried, including after uncertain delivery.
- Remote and metadata connections reconnect together using saved pairing and
  bounded backoff. Read-only health checks detect silent failures.
- A command the TV does not answer in time is dropped, not retried, and the
  session stays up; three unanswered commands in a row, a failed health check
  or a closed connection end it. Each session loss and reconnect is written to
  the Companion log with its reason. A lost Companion connection names how it
  ended: a socket error with its code, or a close by the TV, with any frame the
  library could not read just before it.
- A frame the TV sends that the library cannot decode is dropped and does not
  end the session.
- Disabling or destroying the connection cancels discovery, pairing, requests,
  sockets and timers. Keys remain in Companion's secret store.
- The package needs no child-process or general filesystem permission. It reads
  its own bundled protocol schemas. Companion's handling of secrets and backups
  still applies; do not publish backups containing pairing keys.

## Development

Use Node 22 and Yarn 4. `yarn build`, `yarn lint` and `yarn test` are the usual
checks. `yarn package` builds the Companion package and `yarn test:package` loads
it with filesystem access restricted to the package.

CI builds and packages the module on Linux, macOS and Windows. Synthetic tests
cover setup, secret persistence, restart, cancellation, encryption,
metadata, queue expiry and reconnect without replay. Metadata decoding is also
checked against packets recorded from pyatv 0.18.0. Hardware testing so far covers
one Apple TV; this does not establish compatibility with every tvOS version, app,
audio route or operating-system installation.

Developer tools for a real Apple TV live in `tools/` and are not part of the
package. `yarn build:tools` compiles them to `dist-tools/`, for example
`node dist-tools/tools/live.js scan`.

Real Apple TV tests are opt-in and run only while someone is watching the TV.
CI and unit tests use synthetic peers and fixtures. Never start a pairing
automatically or retry one after an uncertain result. Never commit pairing keys,
credentials, device identifiers, addresses or raw captures; use invented values.

## Provenance

The project started with Bitfocus's TypeScript template. The module uses the
MIT-licensed `node-appletv-remote` library with a small patch in
`patches/`; package generation includes the bundled
dependency license inventory. pyatv 0.18.0 was the independent protocol reference
during development.
