export interface ContextType {
	industry: string;
	company: string;
	position: string;
	scenid: string;
	userMsg: string;
	name: string;
	extras: {};
}

export type scenarioType = {
	groupid: string;
	scenid: string;
	caishen: string[];
	desc: string;
	icon: string;
	note?: string;
	require?: string;
	mustask?: string;
	assistant: string;
};
