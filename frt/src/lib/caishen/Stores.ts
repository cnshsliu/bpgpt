import { writable } from 'svelte/store';
export const homePage = writable(1);
export const generating = writable(false);
export const speeching = writable(false);
export const currentQaId = writable('start_ai4business');
export const advisor = writable('caishen');
export const shareItContent = writable({ question: '', answers: [], images: [] });
