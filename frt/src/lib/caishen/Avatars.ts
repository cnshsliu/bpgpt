const caishen = '/images/caishen/caishen3_round.png';
const teacher1 = '/images/caishen/teacher1.png';
const liukehong = '/images/caishen/advisor/liukehong.png';
const ponyma = '/images/caishen/advisor/ponyma.png';
const jackma = '/images/caishen/advisor/jackma.png';

const elonmusk = '/images/caishen/advisor/elonmusk.png';
const jeffbezos = '/images/caishen/advisor/jeffbezos.png';
const stevejobs = '/images/caishen/advisor/stevejobs.png';
const inamori = '/images/caishen/advisor/inamori.png';

const notfound = '/images/caishen/default.png';

export const Avatars = {
	notfound: notfound,
	default: caishen,
	caishen: caishen,
	mahuateng: ponyma,
	ponyma: ponyma,
	liukehong: liukehong,
	elonmusk: elonmusk,
	mayun: jackma,
	jackma: jackma,
	jeffbezos,
	stevejobs,
	inamori,
	teacher1: liukehong,
	tycoon: liukehong,
};
export const Advisors = {
	ponyma,
	elonmusk,
	jackma,
	jeffbezos,
	stevejobs,
	inamori,
};

export const getIcon = (id: string, prefix: string = '') => {
	return prefix + (Avatars[id] ?? Avatars['notfound']);
};
