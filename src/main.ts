import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { displayDefaults } from './display.js'
import { NodeBackend, type BackendOptions, type SetupState } from './node-backend.js'
import type { ModuleSecrets } from './node-credentials.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdatePresets } from './presets.js'
import { MRPMessage } from 'node-appletv-remote'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

const statuses: Record<SetupState, InstanceStatus> = {
	disabled: InstanceStatus.Disconnected,
	unpaired: InstanceStatus.BadConfig,
	discovering: InstanceStatus.Connecting,
	pairing: InstanceStatus.Connecting,
	pin: InstanceStatus.BadConfig,
	verifying: InstanceStatus.Connecting,
	connecting: InstanceStatus.Connecting,
	ready: InstanceStatus.Ok,
	reconnecting: InstanceStatus.ConnectionFailure,
	error: InstanceStatus.ConnectionFailure,
}

export default class AppleTV extends InstanceBase<ModuleSchema> {
	config: ModuleConfig = { enabled: false, deviceId: '' }
	backend?: NodeBackend
	apps: { id: string; name: string }[] = []
	power = 'Unknown'
	private configurationTasks = new Set<Promise<void>>()
	private configurationVersion = 0
	private destroyed = false
	constructor(
		internal: unknown,
		private readonly backendOptions: BackendOptions = {},
	) {
		super(internal)
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets = {}): Promise<void> {
		UpdateVariableDefinitions(this)
		this.setVariableValues({
			...displayDefaults,
			connection: 'disabled',
			last_result: '',
			personal_output_route: 'Unavailable',
			personal_output_name: '',
		})
		try {
			// Load packaged protocol assets before the user is asked to pair. No message is sent.
			await MRPMessage.clientUpdatesConfig({})
		} catch {
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Module files could not be loaded; reinstall the package')
			this.setVariableValues({ connection: 'error' })
			return
		}
		if (this.destroyed) return
		this.backend = new NodeBackend(
			{
				save: (updated, saved) => {
					this.config = updated
					this.saveConfig(updated, saved)
				},
				status: (state, message) => {
					this.updateStatus(statuses[state], message)
					if (state === 'error') this.log('warn', message)
				},
				values: (values) => {
					this.setVariableValues(values)
					if (values.power !== undefined && values.power !== this.power) {
						this.power = values.power
						this.checkFeedbacks('powerOn')
					}
				},
				log: (level, message) => this.log(level, message),
				feedback: () => this.checkFeedbacks('personalOutputActive'),
				apps: (apps) => {
					this.apps = apps
					this.defineActions()
				},
			},
			this.backendOptions,
		)
		UpdateFeedbacks(this)
		await this.configUpdated(config, secrets)
	}
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields(this.backend?.devices, this.config.deviceId)
	}
	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets = {}): Promise<void> {
		this.config = config
		const backend = this.backend
		if (!backend) return
		// Preset text names the connection label, which may have just changed.
		this.defineActions()
		const version = ++this.configurationVersion
		// Companion's configuration IPC has a shorter deadline than discovery or PIN
		// verification. Acknowledge Save now and publish progress through callbacks.
		const task = backend.configure(config, secrets).catch((error: unknown) => {
			if (this.backend !== backend || this.configurationVersion !== version) return
			this.log('error', `Setup failed: ${error instanceof Error ? error.message : String(error)}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Setup failed; disable the connection and try again')
			this.setVariableValues({ connection: 'error' })
		})
		this.configurationTasks.add(task)
		void task.then(() => this.configurationTasks.delete(task))
	}
	private defineActions(): void {
		// Presets reference these actions, so define the actions first.
		UpdateActions(this)
		UpdatePresets(this)
	}
	async destroy(): Promise<void> {
		this.destroyed = true
		const backend = this.backend
		this.backend = undefined
		this.configurationVersion++
		await backend?.stop()
		await Promise.allSettled(this.configurationTasks)
	}
}
