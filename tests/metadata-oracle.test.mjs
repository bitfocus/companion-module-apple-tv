/** Offline integration check of recorded pyatv packets through the installed codec. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Message, MRPMessage } from 'node-appletv-remote'
import { MetadataState } from '../dist/device/metadata.js'

/** @type {{messages: Record<string, string>}} */
const fixtures = JSON.parse(await readFile(new URL('./fixtures/metadata-packets.json', import.meta.url), 'utf8'))
const decode = async (name) => MRPMessage.decode(Buffer.from(fixtures.messages[name], 'hex'))

test('recorded pyatv packets read through the Node codec and metadata state', async () => {
	const state = new MetadataState()
	state.setConnected()
	for (const name of ['device', 'availability', 'capabilities', 'volume', 'client', 'player', 'state']) {
		state.receive(await decode(name))
	}
	assert.equal(state.snapshot().audio.volume, 30)
	assert.equal(state.snapshot().audio.outputId, 'cluster-output')
	assert.equal(state.snapshot().audio.outputs.length, 2)
	assert.equal(state.snapshot().nowPlaying.state, 'Playing')
	assert.equal(state.snapshot().nowPlaying.title, 'Synthetic title')
	assert.equal(state.snapshot().nowPlaying.reportedPosition, 12)
	const query = await decode('volumeQuery')
	const generated = await MRPMessage.decode(await MRPMessage.getVolume('cluster-output'))
	assert.equal(query.type, 49)
	assert.equal(query['.getVolumeMessage'].outputDeviceUID, 'cluster-output')
	assert.equal(generated.type, query.type)
	assert.deepEqual(generated['.getVolumeMessage'], query['.getVolumeMessage'])
	const route = await decode('systemAudioRoute')
	const generatedRoute = await MRPMessage.decode(await MRPMessage.modifyOutputDevices('set', ['personal-output'], 2))
	assert.equal(route.type, 48)
	assert.equal(route['.modifyOutputContextRequestMessage'].type, 2)
	assert.equal(generatedRoute.type, route.type)
	assert.deepEqual(generatedRoute['.modifyOutputContextRequestMessage'], route['.modifyOutputContextRequestMessage'])
	const audioRead = state.beginAudioRead()
	state.receive(await decode('capabilities'))
	state.finishAudioRead(audioRead, await decode('volumeResult'))
	assert.equal(state.snapshot().audio.volume, 37.5)
	state.receive(await decode('content'))
	assert.equal(state.snapshot().nowPlaying.reportedPosition, 24)
	assert.equal(state.snapshot().nowPlaying.title, 'Synthetic title')
	state.receive(await decode('removePlayer'))
	assert.equal(state.snapshot().nowPlaying.title, undefined)
	assert.equal(new Message(await decode('ack')).type, 0)
	assert.equal((await decode('error'))['errorCode'], 6)
	state.invalidate()
	assert.equal(state.snapshot().audio.volume, undefined)
})
