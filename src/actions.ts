import type { RemoteAction } from './prototype/controller.js'

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
