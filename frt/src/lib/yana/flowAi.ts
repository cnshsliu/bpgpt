import * as empApi from '$lib/api';
import Parser from '$lib/parser';

interface stepType {
	stepId: string;
	instruction: string[];
}
interface TokenHolderLike {
	sessionToken: string;
	eid: string;
}
let user: TokenHolderLike;
const flowAi = {
	steps: [] as stepType[],
	started: false,
	stepIndex: -1,
	meta: {
		goto: '',
		show: '',
	},
	tplid: '',
	wfid: '',
	todo: { instruct: '', todoid: '' },
	instruct: '',
	brain: { tplid: '', name: '', cells: '' },
	setUser: (u: TokenHolderLike) => {
		user = u;
	},

	start: async (yanaid: string) => {
		const res = await empApi.post('yana/start', { yanaid: yanaid }, user.sessionToken);
		flowAi.steps = res.steps;
		flowAi.tplid = res.tplid;
		flowAi.wfid = res.wfid;
		flowAi.started = true;
		flowAi.stepIndex = 0;
		return res;
	},

	destroy: async () => {
		await empApi.post('yana/destroy', { wfid: flowAi.wfid }, user.sessionToken);
	},

	hasNext: () => {
		return flowAi.stepIndex < flowAi.steps.length - 1;
	},

	next: async () => {
		flowAi.instruct = '';
		if (flowAi.todo.todoid) {
			await empApi.post(
				'work/do',
				{
					doer: user.eid,
					todoid: flowAi.todo.todoid,
				},
				user.sessionToken,
			);
			flowAi.stepIndex = flowAi.stepIndex + 1;
			await flowAi.waitStep();
		}
	},

	waitStep: async () => {
		let index = flowAi.stepIndex;
		if (index >= 0 && index < flowAi.steps.length)
			await flowAi.waitByStepId(flowAi.steps[index].stepId);
	},

	waitByStepId: async (stepid: string) => {
		flowAi.instruct = '';
		const stepTodo = await empApi.post(
			'work/search',
			{ wfid: flowAi.wfid, nodeid: stepid },
			user.sessionToken,
		);
		flowAi.todo = { instruct: '', todoid: '' };
		flowAi.instruct = '';
		flowAi.meta = { goto: '', show: '' };
		if (stepTodo.total > 0 && stepTodo.objs[0].todoid) {
			interface withInstruct {
				instruct: string;
				todoid: string;
			}
			let tmp: withInstruct = (await empApi.post(
				'work/info',
				{ todoid: stepTodo.objs[0].todoid },
				user.sessionToken,
			)) as withInstruct;
			flowAi.todo = tmp;
			console.log(flowAi.todo);
			let instructDef = flowAi.todo ? Parser.base64ToCode(flowAi.todo.instruct) : '';
			const gotoRegex = /goto\(([^)]+)\)/;
			let m = instructDef.match(gotoRegex);
			if (m) {
				flowAi.meta.goto = m[1];
				instructDef = instructDef.replace(gotoRegex, '');
			}
			const showRegex = /show\(([^)]+)\)/;
			m = instructDef.match(showRegex);
			if (m) {
				flowAi.meta.show = m[1];
				instructDef = instructDef.replace(showRegex, '');
			}
			flowAi.instruct = instructDef;
			console.log(flowAi.instruct);
		}
	},
};

export default flowAi;
