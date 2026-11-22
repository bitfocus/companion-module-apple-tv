import { combineRgb } from '@companion-module/base'
import type AppleTV from './main.js'
import { playbackStates } from './device/metadata.js'

export type FeedbacksSchema = {
	personalOutputActive: { type: 'boolean'; options: Record<string, never> }
	powerOn: { type: 'boolean'; options: Record<string, never> }
	playbackState: { type: 'boolean'; options: { state: (typeof playbackStates)[number] } }
	muted: { type: 'boolean'; options: Record<string, never> }
}

export function UpdateFeedbacks(self: AppleTV): void {
	self.setFeedbackDefinitions({
		personalOutputActive: {
			type: 'boolean',
			name: 'Personal audio output active',
			description: 'True while the TV reports the configured personal output in its audio route',
			defaultStyle: { bgcolor: combineRgb(0, 102, 204), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.backend?.personalOutputActive ?? false,
		},
		powerOn: {
			type: 'boolean',
			name: 'Apple TV is on',
			description: 'True while the TV reports that it is awake; false when asleep, unknown or disconnected',
			defaultStyle: { bgcolor: combineRgb(0, 153, 0), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.power === 'On',
		},
		playbackState: {
			type: 'boolean',
			name: 'Playback state is',
			description: 'True while the connected Apple TV reports the selected playback state',
			defaultStyle: { bgcolor: combineRgb(0, 102, 204), color: combineRgb(255, 255, 255) },
			options: [
				{
					type: 'dropdown',
					id: 'state',
					label: 'Playback state',
					default: 'Playing',
					choices: playbackStates.map((state) => ({ id: state, label: state })),
				},
			],
			callback: ({ options }) => self.playbackState !== undefined && self.playbackState === options.state,
		},
		muted: {
			type: 'boolean',
			name: 'Muted by Companion',
			description: 'True while the module has a saved volume level to restore on the current audio output',
			defaultStyle: { bgcolor: combineRgb(204, 51, 0), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.muted,
		},
	})
}
