import { combineRgb } from '@companion-module/base'
import type AppleTV from './main.js'

export type FeedbacksSchema = {
	personalOutputActive: { type: 'boolean'; options: Record<string, never> }
	powerOn: { type: 'boolean'; options: Record<string, never> }
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
	})
}
