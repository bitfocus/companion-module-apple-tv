import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

export default [
	...(await generateEslintConfig({ enableTypescript: true })),
	{ ignores: ['dist-tools/**'] },
	// Tests import the compiled tools, which `yarn test` builds before running them.
	{ files: ['tests/**'], rules: { 'n/no-missing-import': 'off' } },
]
