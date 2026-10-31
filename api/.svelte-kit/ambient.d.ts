
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const TERM_PROGRAM: string;
	export const SHELL: string;
	export const TERM: string;
	export const TMPDIR: string;
	export const TERM_PROGRAM_VERSION: string;
	export const TERM_SESSION_ID: string;
	export const USER: string;
	export const SSH_AUTH_SOCK: string;
	export const PATH: string;
	export const LaunchInstanceID: string;
	export const __CFBundleIdentifier: string;
	export const PWD: string;
	export const XPC_FLAGS: string;
	export const XPC_SERVICE_NAME: string;
	export const SHLVL: string;
	export const HOME: string;
	export const LOGNAME: string;
	export const OSLogRateLimit: string;
	export const SECURITYSESSIONID: string;
	export const COLORTERM: string;
	export const OLDPWD: string;
	export const HOMEBREW_PREFIX: string;
	export const HOMEBREW_CELLAR: string;
	export const HOMEBREW_REPOSITORY: string;
	export const FPATH: string;
	export const INFOPATH: string;
	export const BUN_INSTALL: string;
	export const NVM_DIR: string;
	export const NVM_CD_FLAGS: string;
	export const NVM_BIN: string;
	export const NVM_INC: string;
	export const LANG: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const AI_AGENT: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const CLAUDE_CODE_SUBAGENT_MODEL: string;
	export const CLAUDE_CODE_MESSAGING_SOCKET: string;
	export const CLAUDE_CODE_MESSAGING_TOKEN: string;
	export const GIT_EDITOR: string;
	export const CLAUDE_CODE_EXECPATH: string;
	export const CLAUDECODE: string;
	export const CLAUDE_CODE_SESSION_ID: string;
	export const CLAUDE_CODE_CHILD_SESSION: string;
	export const CLAUDE_CODE_SESSION_ATTENDED: string;
	export const CLAUDE_PID: string;
	export const CLAUDE_EFFORT: string;
	export const _: string;
	export const npm_config_local_prefix: string;
	export const npm_config_user_agent: string;
	export const npm_execpath: string;
	export const npm_package_name: string;
	export const npm_package_json: string;
	export const npm_package_version: string;
	export const NODE: string;
	export const npm_node_execpath: string;
	export const npm_command: string;
	export const npm_lifecycle_event: string;
	export const npm_lifecycle_script: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const TEST: string;
	export const VITEST: string;
	export const NODE_ENV: string;
	export const PROD: string;
	export const DEV: string;
	export const BASE_URL: string;
	export const MODE: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		TERM_PROGRAM: string;
		SHELL: string;
		TERM: string;
		TMPDIR: string;
		TERM_PROGRAM_VERSION: string;
		TERM_SESSION_ID: string;
		USER: string;
		SSH_AUTH_SOCK: string;
		PATH: string;
		LaunchInstanceID: string;
		__CFBundleIdentifier: string;
		PWD: string;
		XPC_FLAGS: string;
		XPC_SERVICE_NAME: string;
		SHLVL: string;
		HOME: string;
		LOGNAME: string;
		OSLogRateLimit: string;
		SECURITYSESSIONID: string;
		COLORTERM: string;
		OLDPWD: string;
		HOMEBREW_PREFIX: string;
		HOMEBREW_CELLAR: string;
		HOMEBREW_REPOSITORY: string;
		FPATH: string;
		INFOPATH: string;
		BUN_INSTALL: string;
		NVM_DIR: string;
		NVM_CD_FLAGS: string;
		NVM_BIN: string;
		NVM_INC: string;
		LANG: string;
		NoDefaultCurrentDirectoryInExePath: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		AI_AGENT: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		CLAUDE_CODE_SUBAGENT_MODEL: string;
		CLAUDE_CODE_MESSAGING_SOCKET: string;
		CLAUDE_CODE_MESSAGING_TOKEN: string;
		GIT_EDITOR: string;
		CLAUDE_CODE_EXECPATH: string;
		CLAUDECODE: string;
		CLAUDE_CODE_SESSION_ID: string;
		CLAUDE_CODE_CHILD_SESSION: string;
		CLAUDE_CODE_SESSION_ATTENDED: string;
		CLAUDE_PID: string;
		CLAUDE_EFFORT: string;
		_: string;
		npm_config_local_prefix: string;
		npm_config_user_agent: string;
		npm_execpath: string;
		npm_package_name: string;
		npm_package_json: string;
		npm_package_version: string;
		NODE: string;
		npm_node_execpath: string;
		npm_command: string;
		npm_lifecycle_event: string;
		npm_lifecycle_script: string;
		__CF_USER_TEXT_ENCODING: string;
		TEST: string;
		VITEST: string;
		NODE_ENV: string;
		PROD: string;
		DEV: string;
		BASE_URL: string;
		MODE: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
