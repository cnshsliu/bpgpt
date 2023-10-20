import type { Writable } from 'svelte/store';
import mtcLocalStorage from '$lib/mtcLocalStorage';
import type { ContextType } from './types.js';

const defaultValue: ContextType = {
	industry: '',
	company: '',
	name: '',
	position: '0',
	scenid: '0',
	userMsg: '',
	extras: {},
};
export const caishenContext = mtcLocalStorage('caishencontext', defaultValue);

export const advisoryGroup = mtcLocalStorage('caishenadvisorygroup', '');
export const enableLog = mtcLocalStorage('caishenenablelog', false);
export const myFontSize = mtcLocalStorage('caishenenfontsize', 16);
export const my_chatgpt_api_key = mtcLocalStorage('caishenenmychatgptapikey', '');
export const expandAllGroups = mtcLocalStorage('caishenexpandallgroups', true);
export const userInputLogs: Writable<string[]> = mtcLocalStorage('caishenuserinputs', []);
export const enableTask = mtcLocalStorage('caishenenabletask', true);
