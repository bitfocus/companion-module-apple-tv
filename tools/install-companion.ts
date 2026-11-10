/** Separate development CLI; never imported by the installed Companion module. */
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

const HELP = `Install the built package into the Companion running on this computer:
  yarn companion:install                 build, package, install and switch the connection
  node dist-tools/tools/install-companion.js --use 1.0.0   switch back to an installed version
  node dist-tools/tools/install-companion.js --use latest  let Companion pick the newest stable version

Options:
  --connection LABEL_OR_ID   needed only when more than one Apple TV connection exists
  --url URL                  Companion web address (default http://127.0.0.1:8212)
  --replace                  reinstall a version Companion already has

Uses the same import as Companion's "Import module package" button, which Companion
allows only from this computer. The previous version stays installed, so switching
back is instant. The connection reconnects with its saved pairing; no pairing starts.
`

const MODULE_ID = 'apple-tv'

type Connection = { id: string; label: string; moduleId: string; moduleVersionId: string | null }

class Companion {
	private nextId = 1
	private constructor(private readonly socket: WebSocket) {}

	static async open(url: string): Promise<Companion> {
		const socket = new WebSocket(`${url.replace(/^http/, 'ws').replace(/\/$/, '')}/trpc`)
		await new Promise<void>((resolve, reject) => {
			socket.addEventListener('open', () => resolve(), { once: true })
			socket.addEventListener('error', () => reject(new Error(`Companion is not reachable at ${url}`)), {
				once: true,
			})
		})
		return new Companion(socket)
	}

	/** Sends one request and returns its first data message (a subscription's first value). */
	async call(method: 'mutation' | 'subscription', path: string, input?: unknown): Promise<unknown> {
		const id = this.nextId++
		this.socket.send(JSON.stringify({ id, method, params: { path, input } }))
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.socket.removeEventListener('message', onMessage)
				reject(new Error(`${path} did not answer within 60 seconds`))
			}, 60_000)
			const onMessage = (event: MessageEvent): void => {
				const message = JSON.parse(String(event.data)) as {
					id?: number
					error?: { message: string }
					result?: { type: string; data?: unknown }
				}
				if (message.id !== id || message.result?.type === 'started') return
				clearTimeout(timer)
				this.socket.removeEventListener('message', onMessage)
				if (method === 'subscription') this.socket.send(JSON.stringify({ id, method: 'subscription.stop' }))
				if (message.error) reject(new Error(`${path}: ${message.error.message}`))
				else resolve(message.result?.data)
			}
			this.socket.addEventListener('message', onMessage)
		})
	}

	close(): void {
		this.socket.close()
	}
}

async function findConnection(companion: Companion, wanted: string | undefined): Promise<Connection> {
	const update = (await companion.call('subscription', 'instances.connections.watch')) as {
		type: string
		info: Record<string, Connection>
	}[]
	const all = Object.values([update].flat().find((item) => item.type === 'init')?.info ?? {})
	const matches = all.filter(
		(connection) =>
			connection.moduleId === MODULE_ID &&
			(wanted === undefined || connection.id === wanted || connection.label === wanted),
	)
	if (matches.length === 1) return matches[0]
	const labels = all.filter((connection) => connection.moduleId === MODULE_ID).map((connection) => connection.label)
	if (matches.length === 0 && labels.length === 0) throw new Error('No Apple TV connection exists in Companion yet')
	throw new Error(`Pick a connection with --connection: ${labels.join(', ')}`)
}

async function useVersion(companion: Companion, connection: Connection, version: string): Promise<void> {
	const problem = await companion.call('mutation', 'instances.connections.setModuleAndVersion', {
		connectionId: connection.id,
		moduleId: MODULE_ID,
		// Companion picks the newest installed stable version for null.
		versionId: version === 'latest' ? null : version,
	})
	if (typeof problem === 'string') throw new Error(problem)
}

/** Companion refuses to remove a version in use, so step the connection onto another installed version first. */
async function stepAside(companion: Companion, connection: Connection, version: string): Promise<void> {
	if (connection.moduleVersionId !== version) return
	const update = (await companion.call('subscription', 'instances.modules.watch')) as {
		type: string
		info: Record<string, { installedVersions: { versionId: string }[] }>
	}[]
	const installed =
		[update].flat().find((item) => item.type === 'init')?.info[`connection:${MODULE_ID}`]?.installedVersions ?? []
	const other = installed
		.map((entry) => entry.versionId)
		.filter((id) => id !== version)
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
		.at(-1)
	if (!other) throw new Error(`${connection.label} uses ${version} and no other version is installed to switch to`)
	console.log(`Switching ${connection.label} to ${other} while ${version} is replaced`)
	await useVersion(companion, connection, other)
}

async function install(companion: Companion, connection: Connection, version: string, replace: boolean): Promise<void> {
	const archive = `${MODULE_ID}-${version}.tgz`
	const tarBuffer = (await readFile(archive)).toString('base64')
	let problem = await companion.call('mutation', 'instances.modulesManager.installModuleTar', { tarBuffer })
	if (typeof problem === 'string' && problem.includes('already exists') && replace) {
		await stepAside(companion, connection, version)
		const removed = await companion.call('mutation', 'instances.modulesManager.uninstallModule', {
			moduleType: 'connection',
			moduleId: MODULE_ID,
			versionId: version,
		})
		if (typeof removed === 'string') throw new Error(removed)
		problem = await companion.call('mutation', 'instances.modulesManager.installModuleTar', { tarBuffer })
	}
	if (typeof problem === 'string' && problem.includes('already exists'))
		throw new Error(`${problem}; add --replace to reinstall it`)
	if (typeof problem === 'string') throw new Error(problem)
	console.log(`Installed ${archive}`)
}

async function waitForStatus(url: string, connectionId: string): Promise<void> {
	let last = ''
	for (let elapsed = 0; elapsed <= 60; elapsed += 2) {
		const connections = (await (await fetch(`${url.replace(/\/$/, '')}/api/connections`)).json()) as {
			id: string
			status?: { level: string; message: string | null }
		}[]
		const status = connections.find((connection) => connection.id === connectionId)?.status
		const text = `${status?.level ?? 'unknown'}: ${status?.message ?? ''}`
		if (text !== last) console.log(`Status ${text}`)
		last = text
		if (status?.level === 'ok') return
		await new Promise((resolve) => setTimeout(resolve, 2000))
	}
	throw new Error('The connection did not reach OK within 60 seconds; check its log in Companion')
}

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: {
			use: { type: 'string' },
			connection: { type: 'string' },
			url: { type: 'string', default: 'http://127.0.0.1:8212' },
			replace: { type: 'boolean', default: false },
			help: { type: 'boolean', default: false },
		},
	})
	if (values.help) return void console.log(HELP)
	const companion = await Companion.open(values.url)
	try {
		const connection = await findConnection(companion, values.connection)
		let version = values.use
		if (version === undefined) {
			version = (JSON.parse(await readFile('package.json', 'utf8')) as { version: string }).version
			await install(companion, connection, version, values.replace)
		}
		await useVersion(companion, connection, version)
		const previous = connection.moduleVersionId ?? 'latest'
		console.log(`${connection.label} now runs ${MODULE_ID} ${version} (was ${previous})`)
		if (previous !== version) {
			const target = `--connection ${JSON.stringify(connection.id)} --url ${JSON.stringify(values.url)}`
			console.log(`To go back: node dist-tools/tools/install-companion.js --use ${previous} ${target}`)
		}
		await waitForStatus(values.url, connection.id)
	} finally {
		companion.close()
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
})
