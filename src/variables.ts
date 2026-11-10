import type { DisplayValues } from './display.js'
import type AppleTV from './main.js'
import type { PersonalOutputValues } from './node-backend.js'

export type VariablesSchema = { connection: string; last_result: string } & DisplayValues & PersonalOutputValues

const displayNames: Record<keyof DisplayValues, string> = {
	volume: 'Volume (percent, blank when unavailable)',
	mute_state: 'Mute state (Muted, Unmuted or Unavailable)',
	power: 'Power state (On, Off or Unknown)',
	metadata_state: 'Now-playing link (Connecting, Connected or Offline)',
	title: 'Now playing title',
	artist: 'Now playing artist',
	app: 'Now playing app',
	playback_state: 'Playback state (Playing, Paused, Stopped, Seeking, Idle, Interrupted or Unknown)',
	position: 'Playback position (seconds)',
	duration: 'Playback duration (seconds)',
	elapsed: 'Elapsed time (m:ss)',
	remaining: 'Remaining time (m:ss)',
	progress: 'Playback progress (percent, 0 to 100)',
}

export function UpdateVariableDefinitions(self: AppleTV): void {
	self.setVariableDefinitions({
		connection: { name: 'Connection state (such as ready, connecting, reconnecting or error)' },
		last_result: { name: 'Last dispatch result (not physical confirmation)' },
		personal_output_route: {
			name: 'Personal audio output route (Personal, Default, Connecting, Failed or Unavailable)',
		},
		personal_output_name: { name: 'Personal audio output name' },
		...(Object.fromEntries(Object.entries(displayNames).map(([key, name]) => [key, { name }])) as Record<
			keyof DisplayValues,
			{ name: string }
		>),
	})
}
