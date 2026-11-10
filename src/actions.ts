import type { RemoteAction } from './device/controller.js'
import type AppleTV from './main.js'
import type { RouteTarget } from './personal-output.js'

export type ActionsSchema = {
	command: { options: { command: string } }
	launchApp: { options: { appId: string } }
	personalOutput: { options: { target: string } }
}

export const remoteActions: Record<
	string,
	{ label: string; action: RemoteAction; preset?: { name: string; text: string } }
> = {
	up: { label: 'Up', action: { kind: 'button', button: 'up' }, preset: { name: 'Up', text: 'Up' } },
	down: { label: 'Down', action: { kind: 'button', button: 'down' }, preset: { name: 'Down', text: 'Down' } },
	left: { label: 'Left', action: { kind: 'button', button: 'left' }, preset: { name: 'Left', text: 'Left' } },
	right: { label: 'Right', action: { kind: 'button', button: 'right' }, preset: { name: 'Right', text: 'Right' } },
	select: { label: 'Select', action: { kind: 'button', button: 'select' }, preset: { name: 'Select', text: 'OK' } },
	back: { label: 'Back', action: { kind: 'button', button: 'back' }, preset: { name: 'Back', text: 'Back' } },
	home: { label: 'Home', action: { kind: 'button', button: 'home' }, preset: { name: 'Home', text: 'Home' } },
	playPause: {
		label: 'Play/Pause',
		action: { kind: 'button', button: 'playPause' },
		preset: { name: 'Play/Pause', text: 'Play\\nPause' },
	},
	previous: { label: 'Previous', action: { kind: 'media', command: 'previous' } },
	next: { label: 'Next', action: { kind: 'media', command: 'next' } },
	toggleMute: { label: 'Mute/Unmute', action: { kind: 'mute' } },
	controlCenter: {
		label: 'Control Center',
		action: { kind: 'button', button: 'controlCenter' },
		preset: { name: 'Control Center', text: 'Control\\nCenter' },
	},
	appSwitcher: { label: 'App Switcher', action: { kind: 'button', button: 'appSwitcher' } },
	screensaver: { label: 'Screensaver', action: { kind: 'button', button: 'screensaver' } },
	power: { label: 'Power Toggle', action: { kind: 'power' } },
	sleep: { label: 'Sleep', action: { kind: 'power', state: 'Off' } },
	wake: { label: 'Wake', action: { kind: 'power', state: 'On' } },
	volumeUp: { label: 'Volume Up', action: { kind: 'button', button: 'volumeUp' } },
	volumeDown: { label: 'Volume Down', action: { kind: 'button', button: 'volumeDown' } },
	seekForward: {
		label: 'Seek Forward 10 Seconds',
		action: { kind: 'seek', seconds: 10 },
		preset: { name: 'Forward 10 seconds', text: '+10s' },
	},
	seekBackward: {
		label: 'Seek Back 10 Seconds',
		action: { kind: 'seek', seconds: -10 },
		preset: { name: 'Back 10 seconds', text: '-10s' },
	},
	seekForward30: { label: 'Seek Forward 30 Seconds', action: { kind: 'seek', seconds: 30 } },
	seekBackward30: { label: 'Seek Back 30 Seconds', action: { kind: 'seek', seconds: -30 } },
	swipeUp: { label: 'Swipe Up', action: { kind: 'swipe', direction: 'up' } },
	swipeDown: { label: 'Swipe Down', action: { kind: 'swipe', direction: 'down' } },
	swipeLeft: { label: 'Swipe Left', action: { kind: 'swipe', direction: 'left' } },
	swipeRight: { label: 'Swipe Right', action: { kind: 'swipe', direction: 'right' } },
}

const routeTargets: Record<string, RouteTarget> = { toggle: 'toggle', personal: 'personal', default: 'default' }

export function UpdateActions(self: AppleTV): void {
	self.setActionDefinitions({
		command: {
			name: 'Remote command',
			options: [
				{
					id: 'command',
					type: 'dropdown',
					label: 'Command',
					default: 'select',
					choices: Object.entries(remoteActions).map(([id, { label }]) => ({ id, label })),
				},
			],
			callback: async (event) =>
				self.backend?.perform(
					Object.hasOwn(remoteActions, event.options.command)
						? remoteActions[event.options.command]?.action
						: undefined,
				),
		},
		launchApp: {
			name: 'Launch App',
			options: [
				{
					id: 'appId',
					type: 'dropdown',
					label: 'App',
					default: '',
					allowCustom: true,
					choices: self.apps.map((app) => ({ id: app.id, label: `${app.name} (${app.id})` })),
				},
			],
			callback: async (event) => self.backend?.perform({ kind: 'launch', bundleId: event.options.appId }),
		},
		personalOutput: {
			name: 'Personal audio output',
			description:
				'Toggle or select the configured personal output, such as AirPods, as the system audio route. Sends one request; the route variable confirms the result.',
			options: [
				{
					id: 'target',
					type: 'dropdown',
					label: 'Route',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle personal output' },
						{ id: 'personal', label: 'Route to personal output' },
						{ id: 'default', label: 'Route to default output' },
					],
				},
			],
			callback: async (event) => {
				const target = Object.hasOwn(routeTargets, event.options.target)
					? routeTargets[event.options.target]
					: undefined
				if (!target) self.setVariableValues({ last_result: 'unknown output route; not sent' })
				else await self.backend?.selectPersonalOutput(target)
			},
		},
	})
}
