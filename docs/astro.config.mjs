// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	integrations: [
		starlight({
			title: 'rxjs-ai',
			description: 'A stream-first AI SDK built on RxJS.',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/user/rxjs-ai' }],
			editLink: {
				baseUrl: 'https://github.com/user/rxjs-ai/edit/main/docs/',
			},
			customCss: [],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
						{ label: 'Why rxjs-ai?', slug: 'getting-started/why-rxjs-ai' },
					],
				},
				{
					label: 'Core',
					items: [
						{ label: 'createStore', slug: 'core/create-store' },
						{ label: 'createCommandBus', slug: 'core/create-command-bus' },
						{ label: 'createAsyncController', slug: 'core/create-async-controller' },
						{ label: 'createViewModel', slug: 'core/create-view-model' },
					],
				},
				{
					label: 'AI',
					items: [
						{ label: 'Chat Controller', slug: 'ai/chat-controller' },
						{ label: 'Model Adapters', slug: 'ai/model-adapters' },
					],
				},
				{
					label: 'UI',
					items: [
						{ label: 'React', slug: 'ui/react' },
					],
				},
				{
					label: 'Examples',
					items: [
						{ label: 'Basic Chat', slug: 'examples/basic-chat' },
						{ label: 'Stream Composition', slug: 'examples/stream-composition' },
					],
				},
			],
		}),
	],
});
