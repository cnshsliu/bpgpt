import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { clientlocale } from '$lib/mtcLocalStores';
import { _, setupI18n, locale } from '$lib/i18n';
const setI18N = async function (locale: string) {
	if (['en', 'zh-CN', 'zh-HK', 'zh-TW', 'jp'].includes(locale) === false) {
		if (locale.indexOf('-') > 0) {
			await setI18N(locale.substring(0, locale.indexOf('-')));
		} else {
			await setI18N('en');
		}
	} else {
		await setupI18n({ withLocale: locale });
	}
};

export const load: LayoutLoad = async ({ url, data }) => {
	const { user, version } = data;
	//if (get(locale) === null && get(clientlocale)) {
	let locale_value = '';
	if (get(locale) === null) {
		clientlocale.subscribe(async (value) => {
			locale_value = value;
			if (value === '') {
				if (browser) {
					// const i18n = get(_);
					let browserLocale = window.navigator.language;
					await setI18N(browserLocale);
					clientlocale.set(browserLocale);
					locale_value = browserLocale;
				}
			} else {
				await setI18N(value);
			}
		});
	}
	return { url, user, version };
};
