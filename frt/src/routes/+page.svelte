<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { toast } from '$lib/Toast';
	import Scenarios from '$lib/caishen/Scenarios.svelte';
	import { MTC_SERVER } from '$lib/Env';
	import suuid from 'short-uuid';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as empApi from '$lib/api';
	import QaBlock from '$lib/caishen/QaBlock.svelte';
	import type { ContextType, scenarioType } from '$lib/caishen/types.js';
	import {
		caishenContext,
		enableLog,
		myFontSize,
		my_chatgpt_api_key,
		userInputLogs,
		enableTask,
	} from '$lib/caishen/localStorage.js';
	import {
		homePage,
		currentQaId,
		shareItContent,
		generating,
		advisor,
	} from '$lib/caishen/Stores.js';
	import GptLog from '$lib/caishen/GptLog.svelte';
	import AiIsThinking from '$lib/caishen/AiIsThinking.svelte';
	import HelpModal from '$lib/caishen/HelpModal.svelte';
	import caishenIcon from '$lib/images/caishen3_round.png';
	import liukehong from '$lib/images/liukehong.png';
	import mahuateng from '$lib/images/mahuateng.png';
	import elonmusk from '$lib/images/elonmusk.png';
	import mayun from '$lib/images/mayun.png';
	import billgates from '$lib/images/billgates.png';
	import jeffbezos from '$lib/images/jeffbezos.png';
	import stevejobs from '$lib/images/stevejobs.png';
	import warrenbuffet from '$lib/images/warrenbuffet.png';
	import inamori from '$lib/images/inamori.png';
	import teacher1 from '$lib/images/teacher1.png';
	import background1 from '$lib/images/nasa3.jpeg';
	import { API_SERVER } from '$lib/Env';
	import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'sveltestrap';
	import AiAdvisors from '$lib/caishen/AiAdvisors.svelte';
	import SearchResultBlock from '$lib/caishen/SearchResultBlock.svelte';

	let srBlocks: any[] = [];
	const EMP_SERVER_ADDRESS = API_SERVER.replace('https://', '');
	const Icons = {
		default: caishenIcon,
		caishen: caishenIcon,
		mahuateng,
		liukehong,
		elonmusk,
		mayun,
		jackma: mayun,
		jeffbezos,
		stevejobs,
		billgates,
		warrenbuffet,
		inamori,
		teacher1: teacher1,
	};
	const AdvisorNames = {
		default: '财神老师',
		caishen: '财神老师',
		mahuateng: '小马哥',
		liukehong: '克鸿老师',
		elonmusk: '马斯克',
		mayun: '马老师',
		jeffbezos: '贝索斯',
		stevejobs: '乔布斯',
		billgates: '比尔·盖茨',
		warrenbuffet: '沃伦·巴菲特',
		inamori: '稻盛和夫',
		teacher1: '教务老师',
	};

	const shareItOptions = [
		{
			value: 'yhjf',
			checked: false,
			label: '阅后即焚',
		},
		{
			value: '1day',
			checked: false,
			label: '24小时内有效',
		},
		{
			value: '7days',
			checked: false,
			label: '7日内有效',
		},
		{
			value: 'forever',
			checked: false,
			label: '永久有效',
		},
	];

	const getShareItOptionLabel = (value: string) => {
		let index = shareItOptions.findIndex((item) => item.value === value);
		if (index >= 0) {
			return shareItOptions[index].label;
		}
		return '';
	};

	const PAGE_CHAT = 1;
	const PAGE_SCENARIO = 2;

	let intervalId_checkSearchResult: NodeJS.Timeout | undefined = undefined;
	let onlyInput = false;
	let previousScrollHeight = 0;
	let scrollingByCodes = false;
	let chatBody: HTMLElement | null = null;
	let chatArea: HTMLElement | null = null;
	let isWechat = false;
	let showHelpFlag = false;
	let useCornerButton = false;
	let currentCaishenIcon = caishenIcon;
	let theWebsocket: WebSocket | null = null;
	let glowing: boolean[] = [false, false];
	let theScrollToDiv: HTMLDivElement | null = null;
	let scrollLimit: number = 0;
	let shareItPeriod = '7days';
	let currentDetail = '';
	let inputHistoryIndex = -1;

	const context = $page.data.context;
	let scenarioGroups = context.groups;
	let scenarioList: scenarioType[] = context.scenarioList;
	let positions = context.positions;

	let myUserAgent = 'useragent unknown';
	let shouldAutoScroll = true;

	let checkActiveInterval: NodeJS.Timeout | undefined = undefined;
	let lastAskAt = Date.now();
	let lastMsgAt = Date.now();
	let lastMasterIcon: string = '';

	let theScenario: scenarioType | null = null;
	let currentAnswer = '';
	let currentQaBlock: any;

	let settingExpanded = false;
	let commandIndex = 0;
	let gptLogOpen = false;
	let theChatInput: HTMLTextAreaElement | null = null;

	let lastScrollAtTime = 0;
	let fullfilled = false;

	let lastTaskId = undefined;

	type searchResultTimestampType = {
		search_uuid: string;
		ts: number;
	};

	let searchResultTimestamp: searchResultTimestampType = {
		search_uuid: 'init_search',
		ts: Date.now(),
	};

	type gptLogType = {
		_id: string;
		bsid: string;
		scenid: string;
		checked: boolean;
		lastQuestion: string;
		deleted?: boolean;
		title?: string;
	};

	let askNumber = 0;
	let bsid: string = suuid.generate();
	let gptLog: gptLogType[] = [];

	const commands = [
		{ input: '/智囊团 ', note: '自选智囊团成员' },
		{ input: '/清空记忆 ', note: '忘掉之前说过的话' },
	];

	const clientGetScenarioById = (scenid: string): scenarioType => {
		const index = scenarioList.findIndex((item: any) => item.scenid === scenid);
		return scenarioList[index];
	};

	const getIcon = (who: string) => {
		return Icons[who] ? Icons[who] : Icons['default'];
	};

	const doCommandOnBrowserOnly = () => {
		return false;
	};

	const disconnectFromServer = async () => {
		await onWsFinishRound();
		await closeWebSocket();
		resetInputHeight();
	};

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const resetChatAreaPositon = () => {
		if (chatArea) {
			chatArea.scrollTop = chatArea.scrollHeight;
			previousScrollHeight = chatArea.scrollHeight;
		}
	};

	const askNormal = async () => {
		resetChatAreaPositon();
		$currentQaId = suuid.generate().toString();
		currentDetail = $caishenContext.userMsg;
		if ($generating) {
			await disconnectFromServer();
			$generating = false;
		}
		theScrollToDiv?.scrollIntoView({ behavior: 'smooth' });
		shouldAutoScroll = true;
		//如果是斜杠开头的命令，处理结束以后即刻返回
		if (doCommandOnBrowserOnly()) {
			$caishenContext.userMsg = '';
			return;
		}

		if (askNumber === 0) {
			bsid = suuid.generate();
			onlyInput = true;
		}

		askCaishen().then((ret) => {
			if (ret) {
				lastTaskId = undefined;
				resetInputHeight();
				askNumber++;
				if ($page.data.user) {
					autoScroll();
				}
			}
		});
	};

	const askCaishen = async (): Promise<boolean> => {
		// useCornerButton = true;
		lastAskAt = Date.now();
		lastMsgAt = Date.now();
		if (settingExpanded) {
			settingExpanded = false;
		}
		if ($page.data.user) {
			if ($generating) {
				//stop it
				disconnectFromServer();
				$generating = false;
				return false;
			}
			//此处开始一个新的问答,可能是第一句，也可能是后面的追问，要看askNumber这个数字
			//0 表示是第一次场景问答，大于0表示为后续的追问
			theScenario = clientGetScenarioById($caishenContext.scenid);
			if (!theScenario) {
				console.log('theScenario is null');
				await adhocAnswerBlock(caishenIcon, 'A', '___SELECT_SCENARIO___');
				return false;
			}
			if (theScenario.mustask && $caishenContext.userMsg.trim() === '') {
				await adhocAnswerBlock(caishenIcon, 'A', theScenario.mustask);
				repeatScenario();
				return false;
			}

			const regex_search_weixin = /getweixin (.+)/i;
			const match = theScenario.assistant.match(regex_search_weixin);
			let resultText = match ? match[1] : null;
			if (resultText) {
				if (resultText.match(/.*{usermsg}.*/gi)) {
					if ($caishenContext.userMsg.trim().length > 0) {
						resultText = resultText.replace(/{userMsg}/gi, $caishenContext.userMsg.trim());
					} else {
						return false;
					}
				}

				const ret = await fetch('https://desktop.localhost/caishen/wxSearch', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ query: resultText }),
				});
				searchResultTimestamp = { search_uuid: await ret.text(), ts: Date.now() };
				await checkSearchResult();
				return true;
			}

			let question =
				(askNumber === 0 ? theScenario.desc + ' ' : '') +
				(askNumber > 0 && $caishenContext.userMsg.trim() === ''
					? '请继续'
					: $caishenContext.userMsg);

			$generating = true;

			//显示问题框
			await pushQaBlock('', 'Q', question);

			// 刚开始一个主题时，显示财神的主持语
			if (askNumber === 0 && theScenario?.caishen && theScenario.caishen[0].trim()) {
				await adhocAnswerBlock(teacher1, 'A', theScenario.caishen[0]);
			}
			if ($caishenContext.name === '') {
				$caishenContext.name = $page.data.user.nickname;
			}
			if (theScenario.icon) {
				currentCaishenIcon = getIcon(theScenario.icon);
			}

			let tmpContext = { ...$caishenContext };
			console.log('tmpContext', tmpContext);
			let payload = {
				...tmpContext,
				sessionToken: $page.data.user.sessionToken,
				clientid: $page.data.user.clientid,
				askNumber,
				bsid: bsid,
				advisor: $advisor,
				enableLog: $enableLog,
			};

			//此时，应推出一个新的QaBlock， 类型为A， 内容为NEWCHAT
			await pushQaBlock(currentCaishenIcon, 'A', '___NEWCHAT___');
			// console.log("ws staus is", theWebsocket.readyState);
			console.log(JSON.stringify(payload, null, 2));
			if (theWebsocket?.readyState === WebSocket.OPEN) {
				// console.log("sending payload");
				try {
					sendCaiShenContext(JSON.stringify(payload));
				} catch (e) {
					console.log(e);
				}
			} else {
				// console.log("WebSocket is not open. Current state:", theWebsocket.readyState, "reconnecting...");
				await setupWebsocket(JSON.stringify(payload));
			}
			$userInputLogs.push($caishenContext.userMsg);
			$userInputLogs = $userInputLogs;
			// $caishenContext.userMsg = '';
			return true;
		} else {
			goto('/caishenlogin');
			return false;
		}
	};

	const sendCaiShenContext = async (payload: string) => {
		try {
			theWebsocket?.send(payload);
		} catch (e) {
			console.log(e);
		}
	};

	// function printStackTrace() {
	// 	const error = new Error();
	// 	console.log(error.stack);
	// }

	const adhocAnswerBlock = async (
		icon: string,
		_: string,
		content: string,
		showDropdownMenu: boolean = false,
	) => {
		await pushQaBlock(icon, 'A', content, showDropdownMenu);
		if (currentQaBlock) currentQaBlock.$set({ current: false });
	};

	const pushQaBlock = async (
		icon: string,
		qa: string,
		content: string,
		showDropdownMenu: boolean = true,
	) => {
		if (!chatBody) {
			// console.warn('chatBody not found, no answer will show');
			return;
		}
		//printStackTrace();
		if (currentQaBlock) {
			currentQaBlock.youComplete();
			await currentQaBlock.$set({ current: false, last: false });
		}
		currentQaBlock = new QaBlock({
			target: chatBody,
			props: {
				icon: icon,
				username: $caishenContext.name,
				qa: qa,
				content: content,
				showDropdownMenu: showDropdownMenu,
				context: { theScenario, askNumber, detail: currentDetail },
				qaId: $currentQaId,
				blockId: suuid.generate().toString(),
			},
		});
		currentQaBlock.$on('reask', (payload: { detail: { askNumber: number; userMsg: string } }) => {
			disconnectFromServer();
			console.log(payload);
			if (payload.detail.askNumber === 0) {
				repeatScenario();
				askNumber = 0;
			}
			$caishenContext.userMsg = payload.detail.userMsg;
		});
		currentQaBlock.$on('shareit', (payload: { detail: any }) => {
			if (payload.detail.qaJson) {
				$shareItContent = payload.detail.qaJson;
				toggleShareItModal();
			}
		});
		currentQaBlock.$on('showHelp', () => {
			showHelp();
		});
		currentQaBlock.$on('pick', () => {
			pickScenarioNow();
		});
		currentQaBlock.$on('addquota', () => {
			addQuotaNow();
		});
		currentQaBlock.$on('advisor', async (e: { detail: any }) => {
			console.log(`you pick ${e.detail}`);
			await adhocAnswerBlock(
				Icons[e.detail],
				'A',
				`我是${AdvisorNames[e.detail]}，接下来我是你的智囊导师`,
				false,
			);
			autoScroll();
			$advisor = e.detail;
		});
	};

	const onWsFinishRound = async () => {
		currentAnswer = '';

		if (askNumber === 1 && $enableLog) {
			console.log('Reload GPT log');
			await refreshGptLog();
		}
		$generating = false;
		if (currentQaBlock) currentQaBlock.$set({ current: false });
	};

	const closeWsConnection = async () => {
		try {
			theWebsocket?.close();
			$generating = false;
			if (currentQaBlock) currentQaBlock.$set({ current: false });
		} catch (e) {
			console.log(e);
		}
	};

	const autoScroll = (log: boolean = false) => {
		if (!shouldAutoScroll || $homePage !== PAGE_CHAT || scrollingByCodes || !chatArea) return;
		if (log) {
			console.log('Entering autoScroll');
		}
		fullfilled = false;
		//如果距离上次滚动超过2秒，则开始滚动
		if (chatArea.scrollHeight < previousScrollHeight) {
			console.warn('>>>>chatArea.scrollHeight < previousScrollHeight');
		}
		// if (Date.now() - lastScrollAtTime > 100 && chatArea.scrollHeight > previousScrollHeight) {
		log && console.log('chatArea.scrollHeight', chatArea.scrollHeight);
		log && console.log('previousScrollHeight', previousScrollHeight);
		if (chatArea.scrollHeight > previousScrollHeight) {
			log && console.log('chatArea.scrollHeight > previousScrollHeight');
			fullfilled = true;
			try {
				scrollingByCodes = true;
				lastScrollAtTime = Date.now();
				chatArea.scrollTo({ top: chatArea.scrollHeight + 3000, behavior: 'smooth' });
				let mainDiv = document.getElementById('main')!;
				mainDiv.scrollTo({ top: mainDiv.scrollHeight, behavior: 'smooth' });
				log && console.log('Top', chatArea.scrollHeight + 3000);
				scrollingByCodes = false;
				previousScrollHeight = chatArea.scrollHeight;
			} catch (e) {
				console.log(e);
			}
		}
		document.getElementById('bottomblock')!.scrollIntoView({ behavior: 'smooth' });
	};

	const closeWebSocket = async () => {
		await closeWsConnection();
		$generating = false;
		if (currentQaBlock) currentQaBlock.$set({ current: false });
	};

	const setupWebsocket = async (payload: string = '') => {
		if (!$page.data.user) {
			await adhocAnswerBlock(caishenIcon, 'A', `___PLEASE_LOGIN___`, false);
			return;
		}
		try {
			theWebsocket = new WebSocket(
				`wss://${EMP_SERVER_ADDRESS}/caishen/ws?token=${$page.data.user.sessionToken}`,
			);
			// theWebsocket = new WebSocket("ws://localhost:5008/caishen/ws", [], {
			//   headers: {
			//     "Authorization": `Bearer ${$page.data.user.sessionToken}`
			//   }
			// });

			theWebsocket.onopen = function () {
				// console.log("Ws opened");
				if (checkActiveInterval) {
					clearInterval(checkActiveInterval);
					checkActiveInterval = undefined;
				}

				checkActiveInterval = setInterval(async () => {
					if (Date.now() - lastMsgAt > 30 * 1000) {
						await closeWebSocket();
						clearInterval(checkActiveInterval);
						checkActiveInterval = undefined;
					}
				}, 3 * 1000);
				if (payload !== '') {
					sendCaiShenContext(payload);
				}
			};
			theWebsocket.onmessage = async function (event) {
				lastMsgAt = Date.now();
				let msg = event.data;
				msg = msg.replace(/\\n/g, '<br />');
				msg = msg.replace(/\\"/g, '"');
				if (msg.indexOf('Internal Server Error') > -1) {
					console.log(msg);
					await pushQaBlock(caishenIcon, 'A', '服务升级中，请稍后再试');
					currentAnswer = '';
					$generating = false;
					if (currentQaBlock) currentQaBlock.$set({ current: false });
				} else if (msg.indexOf('newSection') >= 0) {
					let icon = caishenIcon;
					if (theScenario?.icon) {
						icon = getIcon(theScenario.icon);
					}
					console.log('newSection');
					await pushQaBlock(icon, 'A', '___NEWCHAT___');
				} else if (msg.indexOf('currentIcon') >= 0) {
					let match = msg.match(/currentIcon: \[(.+)\]/);
					if (match) {
						let icon = match[1];
						currentCaishenIcon = getIcon(icon);
						currentQaBlock.$set({ icon: currentCaishenIcon, current: true });
						lastMasterIcon = currentCaishenIcon;
					}
				} else if (msg === '[[Done]]') {
					//[[Done]]
					//结束一个主题后，显示财神的主持结束语
					if (askNumber === 1 && theScenario?.caishen && theScenario.caishen[1].trim()) {
						await adhocAnswerBlock(teacher1, 'A', theScenario.caishen[1]);
					}
					disconnectFromServer().then(() => {
						$generating = false;
						autoScroll();
					});
				} else {
					if (currentQaBlock) {
						currentQaBlock.addText(msg);
						// currentAnswer = currentAnswer + msg;
						// currentQaBlock.$set({ content: currentAnswer });
						autoScroll();
					} else {
						console.log('currentQaBlock is null', msg);
					}
					/*
					currentAnswer = currentAnswer + msg;
					if (currentQaBlock) {
						await currentQaBlock.$set({ content: currentAnswer });
						autoScroll();
					} else {
						console.log('currentQaBlock is null');
					}
          */
				}
			};

			theWebsocket &&
				(theWebsocket.onclose = () => {
					// console.log('connection closed');
					if (currentQaBlock) currentQaBlock.$set({ current: false });
					currentQaBlock = null;
				});
		} catch (e) {
			console.log(e);
		}
	};

	function showHelp() {
		function showHelp() {
			showHelpFlag = true;
		}
		Object.defineProperty(showHelp, 'name', { value: 'showHelp' });
		return showHelp();
	}

	const toggleHelp = () => {
		showHelpFlag = !showHelpFlag;
	};

	const onScenario = async (scenario: scenarioType) => {
		let requires = (scenario.require ?? '').split(',').map((item) => item.trim());
		const validRequires = ['industry', 'position', 'name', 'company', 'detail'];
		const msgRequires = ['行业', '职位', '姓名', '公司', '细节'];

		askNumber = 0;

		let errMsg = '';
		for (let i = 0; i < requires.length; i++) {
			let validIndex = validRequires.indexOf(requires[i]);
			if (validIndex < 0) continue;
			if (!$caishenContext[requires[i]]) {
				errMsg += msgRequires[validIndex] + ' ';
			}
		}
		if (errMsg !== '') {
			await pushQaBlock(caishenIcon, 'A', `请先设置${errMsg}`);
			setTimeout(() => {
				if (currentQaBlock) currentQaBlock.$set({ current: false });
				toggleSetting();
			}, 500);
		}
	};

	let extras: { key: string; value: string } | {} = {};

	const chatThisScenario = async (scenario: scenarioType) => {
		extras = {};
		theScenario = scenario;
		console.log('chatThisScenario', theScenario);
		await empApi.post('caishen/bs/use', { scenid: scenario.scenid }, $page.data.user.sessionToken);
		if ($generating) {
			disconnectFromServer();
			$generating = false;
		}
		await onScenario(theScenario);
		($caishenContext as ContextType).scenid = scenario.scenid;
		$homePage = PAGE_CHAT;

		let match = theScenario?.assistant.match(/\{extra(.+):(.+)\}/gi);
		if (match) {
			match.map((x) => {
				let tmp = x.match(/\{(extra.+):(.+)\}/i);
				if (tmp) {
					extras[tmp[1]] = tmp[2];
				}
			});
			console.log(extras);
			if (Object.keys(extras).length > 0) onlyInput = false;
		}
		await adhocAnswerBlock(
			caishenIcon,
			'A',
			`好的，为你准备了在【${scenario.desc}】场景下的智能问答`,
		);
		await adhocAnswerBlock(caishenIcon, 'A', `现在您可以直接提问或者补充信息后提问`);
		if (theChatInput) {
			theChatInput.focus();
		}
		autoScroll(true);
	};

	const pickScenarioNow = () => {
		toggleModal('scenario');
	};
	const addQuotaNow = () => {
		showHelp();
	};

	const repeatScenario = () => {
		askNumber = 0;
		currentCaishenIcon = caishenIcon;
		// ($caishenContext as ContextType).userMsg = '';

		$homePage = PAGE_CHAT;
	};

	const refreshGptLog = async () => {
		if ($page.data.user?.sessionToken) {
			try {
				let res = await empApi.post('/caishen/getGptLog', {}, $page.data.user.sessionToken);
				gptLog = res.map((x: gptLogType) => {
					x.deleted = false;
					let tmp = clientGetScenarioById(x.scenid);
					tmp && (x.title = tmp.desc);
					return x;
				});
			} catch (e) {
				console.warn(e);
			}
		} else {
			console.log('no sessionToken yet');
		}
	};

	const getTasks = async () => {
		if ($page.data.user?.sessionToken) {
			try {
				let res = await empApi.post(
					'/caishen/getTasks',
					{ instance: false },
					$page.data.user.sessionToken,
				);
				console.log(res);
			} catch (e) {
				console.warn(e);
			}
		} else {
			console.log('no sessionToken yet');
		}
	};
	const checkSearchResult = async () => {
		let repeat = 0;
		if (intervalId_checkSearchResult) {
			try {
				clearInterval(intervalId_checkSearchResult);
				intervalId_checkSearchResult = undefined;
				await fetch('https://desktop.localhost/caishen/stopSearcher', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ search_uuid: searchResultTimestamp.search_uuid }),
				});
			} catch (e) {}
		}
		intervalId_checkSearchResult = setInterval(async () => {
			if (!searchResultTimestamp.search_uuid) return;
			const theBody = JSON.stringify(searchResultTimestamp);
			console.log(theBody);
			const ret = await fetch('https://desktop.localhost/caishen/getOneResult', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: theBody,
			});
			if (ret && chatBody) {
				let result = await ret.json();
				if (result.error) {
					console.log(result.error);
				} else {
					repeat = 0;
					console.log(result);
					searchResultTimestamp.search_uuid = result.search_uuid;
					searchResultTimestamp.ts = new Date(result.updatedAt).getTime();
					//get one search result
					//summarize it.
					//display it to user
					let srBlock = new SearchResultBlock({
						target: chatBody as Element,
						props: {
							srObject: result,
						},
					});
					srBlocks.push(srBlock);
					srBlock.$on('destroy', async () => {
						srBlocks = srBlocks.filter((block) => block !== srBlock);
						srBlock.$destroy();
					});
					srBlock.$on('expand', async (payload) => {
						let tmp = srBlocks.filter((block) => block.getExpanded());
						console.log('tmp', tmp);
						tmp.map((block) => {
							block.setExpanded(false);
						});
					});
					srBlock.$on('makePdf', async (payload) => {
						console.log(srBlocks.length);
						let html = `<html><head><meta charset="UTF-8"></head><body class="mybody">`;
						let tmp = srBlocks.filter((block) => block.getSelected());
						tmp.map((block) => {
							html += `<div class="doc">` + block.getObject().content + `</div>`;
						});
						html += `<style>
img {max-width: 100%}
.mybody {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
}
.doc{
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
}
</style></body></html>`;
						console.log(html);
						var blob = new Blob([html], { type: 'text/html; charset=utf-8' });
						if (blob) {
							let url = URL.createObjectURL(blob);
							window.open(url, '_blank');
						}
					});
					srBlock.$on('copyall', async (payload) => {
						const elements = document.querySelectorAll('div.srContent.selected');

						// Initialize an empty string to hold the content
						let combinedContent = '';

						// Iterate over the selected elements
						elements.forEach((element) => {
							// Append the innerHTML or innerText of each element to the combinedContent string
							combinedContent += element.innerHTML; // or element.innerText, depending on your needs
						});

						// Now, combinedContent holds the concatenated content of all selected div elements
						console.log(combinedContent);
						await navigator.clipboard.writeText(combinedContent);
						toast('内容已拷贝到系统剪贴板', 'Success', 'success');
					});
				}
			} else {
				repeat++; //not found, repeat
				if (repeat > 100) {
					//Stop after 100 empty-results
					clearInterval(intervalId_checkSearchResult);
					intervalId_checkSearchResult = undefined;
				}
			}
		}, 5 * 1000);
	};

	onMount(async () => {
		// myUserAgent = navigator.userAgent;
		if ($caishenContext.name === '' && $page.data.user) {
			$caishenContext.name = $page.data.user.nickname;
		}
		$caishenContext.extras = {};
		let user_num = 1012;
		await fetch('/what-is-my-user-agent')
			.then((res) => res.json())
			.then((json) => {
				myUserAgent = json.userAgent;
				if (myUserAgent.indexOf('MicroMessenger') >= 0) {
					isWechat = true;
				}
			});

		if ($page.data.user) await setupWebsocket();

		// let lastScrollTop = document.documentElement.scrollTop;

		// const chatContentArea = document.getElementById('chatcontentarea');
		chatArea?.addEventListener('scroll', () => {
			if (!chatArea) {
				console.warn('Chatarea should not be null');
				return;
			}
			// if (!scrollingByCodes) {
			// 	stopReason += ' S1 ';
			// 	console.log(stopReason);
			// 	shouldAutoScroll = false;
			// }
			scrollLimit = chatArea.scrollHeight - chatArea.clientHeight - 200;

			if (chatArea.scrollHeight > chatArea.clientHeight && chatArea.scrollTop < scrollLimit) {
				shouldAutoScroll = false;
			} else {
				shouldAutoScroll = true;
			}
		});

		await adhocAnswerBlock(
			caishenIcon,
			'A',
			`欢迎来到AI时代掘金商学院，当前拥有${user_num}个学员，通过人工智能的创新应用技术，提供商业经营创富智力支持，助你决胜商海，在人工智能时代掘金创富。`,
		);
		adhocAnswerBlock(teacher1, 'A', '{IAMLUCAS}');
		adhocAnswerBlock(teacher1, 'A', '{AI_ADVISORS}');
		adhocAnswerBlock(teacher1, 'A', '{FIRST_STEP}');
		if (!$page.data.user) {
			await adhocAnswerBlock(caishenIcon, 'A', '___PLEASE_LOGIN___');
		}

		document.addEventListener('keydown', function (event) {
			if ($homePage === PAGE_SCENARIO && event.key === 'g' && event.ctrlKey) {
				$homePage = PAGE_CHAT;
				return;
			} else if ($homePage === PAGE_CHAT && event.key === 'g' && event.ctrlKey) {
				$homePage = PAGE_SCENARIO;
				return;
			}

			const inputBox = document.getElementById('chatInput');
			if (!inputBox) return;

			if (event.key === 'ArrowUp' && ((event.ctrlKey && event.shiftKey) || event.metaKey)) {
				if (inputHistoryIndex < 0) {
					if ($userInputLogs.length > 0) inputHistoryIndex = $userInputLogs.length;
					else inputHistoryIndex = 0;
				}
				inputHistoryIndex = inputHistoryIndex - 1;
				if (inputHistoryIndex < 0) {
					if ($userInputLogs.length > 0) {
						inputHistoryIndex = $userInputLogs.length - 1;
					}
				}

				if (inputHistoryIndex >= 0) {
					$caishenContext.userMsg = $userInputLogs[inputHistoryIndex];
				}
			} else if (
				event.key === 'ArrowDown' &&
				((event.ctrlKey && event.shiftKey) || event.metaKey)
			) {
				if (inputHistoryIndex < 0) {
					if ($userInputLogs.length > 0) inputHistoryIndex = $userInputLogs.length;
					else inputHistoryIndex = 0;
				}
				inputHistoryIndex = inputHistoryIndex + 1;
				if ($userInputLogs.length > 0) {
					if (inputHistoryIndex >= $userInputLogs.length) {
						inputHistoryIndex = 0;
					}
				}

				if (inputHistoryIndex >= 0) {
					$caishenContext.userMsg = $userInputLogs[inputHistoryIndex];
				}
			}
			if (event.key === '/' && event.ctrlKey) {
				const list = document.getElementById('commandList');
				event.preventDefault();

				if (document.activeElement === inputBox) {
					list?.classList.remove('nodisplay');
				} else {
					inputBox.focus();
				}
			} else if (event.key === 'Escape') {
				$caishenContext.userMsg = '';
				const list = document.getElementById('commandList');
				list?.classList.add('nodisplay');
			}

			if (document.activeElement === inputBox) {
				if (event.ctrlKey && event.key === 'j') {
					console.log('ctrl+j pressed');
					commandIndex = (commandIndex + 1) % commands.length;
				} else if (event.ctrlKey && event.key === 'k') {
					console.log('ctrl+k pressed');
					commandIndex =
						(commandIndex - 1 < 0 ? commands.length - 1 : commandIndex - 1) % commands.length;
				} else if (event.key === 'Enter') {
					const list = document.getElementById('commandList');
					if (list?.classList.contains('nodisplay')) {
						if (!event.shiftKey && !$generating) {
							console.log('not shift and not generating');
							console.log('user input [' + $caishenContext.userMsg + ']');
							let theInput = theChatInput?.value;
							console.log('trimmed [' + theInput + ']');
							if (theInput) {
								$caishenContext.userMsg = theInput;
								console.log('post', $caishenContext.userMsg);
								askNormal();
							} else {
								$caishenContext.userMsg = ' ';
								console.log('post empty, no post');
							}
						} else {
							console.log('shiftKey or generating, no post, keep text');
						}
					} else {
						const command = commands[commandIndex];
						setInput(command.input);
					}
				}
			}
		});

		refreshGptLog().then(() => {
			// console.log('Gptlog loaded');
		});
		getTasks();

		//Process new instance tasks.
		setInterval(async () => {
			if ($enableTask === false) return;
			if ($generating === false && $page.data.user?.sessionToken) {
				try {
					let task = await empApi.post(
						'/caishen/getOneInstanceTask',
						{},
						$page.data.user.sessionToken,
					);
					if (task) {
						if (task.taskid !== lastTaskId) {
							console.log('Checking task:', task);
							$caishenContext.scenid = task.scenid;
							$caishenContext.userMsg = task.usermsg;
							$caishenContext.extras = task.extras;
							// if (!currentQaBlock) await pushQaBlock(currentCaishenIcon, 'A', '___NEWCHAT___');

							lastTaskId = task.taskid;
							await chatThisScenario(clientGetScenarioById(task.scenid));
							if (task.autoask) {
								await askNormal();
							} else {
								console.log('autoask is false');
								adhocAnswerBlock(
									caishenIcon,
									'A',
									`你的任务${task.usermsg}已经生成，你可以直接提问或者补充信息后提问`,
								);
								if (Object.keys(task.extras).length > 0) {
									console.log('task.extras keys length > 0');
									extras = $caishenContext.extras;
									onlyInput = false;
								}
							}
						} else {
							console.log('same taskid is waiting for execution');
						}
					} else {
						console.log('Checking task: not found');
					}
				} catch (e) {
					console.warn(e);
				}
			} else {
				console.log('Checking task: bypass generating');
			}
		}, 5 * 1000);
		// scrollToTop();
		searchResultTimestamp = { search_uuid: 'init search', ts: 0 };
		checkSearchResult();
	});

	const setInput = (text: string) => {
		$caishenContext.userMsg = text;
		const list = document.getElementById('commandList');
		list?.classList.add('nodisplay');
		const inputBox = document.getElementById('chatInput');
		inputBox?.focus();
	};

	const toggleSetting = () => {
		settingExpanded = !settingExpanded;
		if (settingExpanded) {
			startGlowing(1);
		}
		toggleSettingModal();
	};

	onDestroy(() => {});

	const logout = async () => {
		await closeWebSocket();
		await goto('/caishenlogout', { replaceState: true, invalidateAll: true });
	};

	function startGlowing(id: number = 0) {
		glowing[id] = true;
		if (id === 1) {
			setTimeout(() => {
				glowing[id] = false;
			}, 3000);
		}
	}

	const restoreLogIntoWindow = async (bsid: string) => {
		if ($page.data.user?.sessionToken) {
			empApi
				.post(
					'/caishen/restoreGptLogItem',
					{ bsid, clientid: $page.data.user.clientid },
					$page.data.user.sessionToken,
				)
				.then(async (logitem) => {
					console.log(logitem);
					if (logitem?.qas?.length > 0) {
						askNumber = 0;
						for (let i = 0; i < logitem.qas.length; i++) {
							logitem.qas[i].question = logitem.qas[i].question.replace(/\\n/g, '<br />');
							logitem.qas[i].answer = logitem.qas[i].answer.replace(/\\n/g, '<br />');
							logitem.qas[i].answer = logitem.qas[i].answer.replace(/\\"/g, '"');
							console.log(logitem.qas[i].question);
							await pushQaBlock('', 'Q', logitem.qas[i].question);
							await pushQaBlock(caishenIcon, 'A', logitem.qas[i].answer);
							askNumber++;
						}
					}
				});
		} else {
			console.log('no sessionToken yet');
		}
	};

	$: theScenario &&
		(() => {
			startGlowing(0);
		})();

	let settingModalIsOpen = false;
	let shareItModalIsOpen = false;
	const toggleSettingModal = () => (settingModalIsOpen = !settingModalIsOpen);
	const toggleShareItModal = () => (shareItModalIsOpen = !shareItModalIsOpen);
	const periodDesc = (period: string): string => {
		let ret = 'Unknonwn';
		switch (period) {
			case 'yhjf':
				ret = '只能被查看一次';
				break;
			case '1day':
				ret = '24小时内有效';
				break;
			case '7days':
				ret = '一周内有效';
				break;
		}
		return ret;
	};

	const doShareIt = async () => {
		toggleShareItModal();
		empApi
			.post(
				'/caishen/shareit',
				{ ...$shareItContent, period: shareItPeriod },
				$page.data.user.sessionToken,
			)
			.then(async (shareKey) => {
				const shareUrl = `AI时代掘金分享： ${MTC_SERVER}/cs/${shareKey}  【${getShareItOptionLabel(
					shareItPeriod,
				)}】`;
				await navigator.clipboard.writeText(shareUrl);
				await adhocAnswerBlock(
					caishenIcon,
					'A',
					`分享地址已放到剪贴板，请粘贴到微信或朋友圈。${periodDesc(shareItPeriod)}。`,
				);
			});
	};
	//TODO: followup

	function resetInputHeight() {
		theChatInput && (theChatInput.style.height = $myFontSize + 'px');
	}

	function adjustHeight() {
		const textarea: HTMLTextAreaElement | null = document.getElementById(
			'chatInput',
		) as HTMLTextAreaElement;
		if (!textarea) return;
		textarea.focus();
		if (textarea.value.startsWith('\n')) {
			textarea.value = textarea.value.substring(1);
		}
		// Reset textarea height to auto to calculate the actual content height
		textarea.style.height = 'auto';
		// Adjust the height of textarea based on scrollHeight
		let height = textarea.scrollHeight;
		let hasReturn = textarea.value.indexOf('\n') > -1;
		// textarea.style.height = (hasReturn ? height : height - 20) + 'px';
	}

	function toggleOnlyInput() {
		onlyInput = !onlyInput;
	}

	const modalControl = {
		scenario: false,
		setting: false,
		shareit: false,
	};
	function toggleModal(key: string) {
		if (!modalControl.hasOwnProperty(key)) {
			console.error(`Invalid key: ${key}`);
			return;
		}
		for (const k in modalControl) {
			modalControl[k] = k === key && !modalControl[k];
		}
	}
</script>

<svelte:head>
	<title>AI时代掘金商学院</title>
	<meta
		name="description"
		content="AI时代掘金商学院-AI MBA, 为企业经营者提供随身的专家顾问服务" />
	<meta
		name="keywords"
		content="AI, 人工智能, 商学院, 技术, 应用, 资讯, 教程, 行业动态" />
	<meta charset="UTF-8" />
	<meta
		name="robots"
		content="index, follow" />
	<meta
		name="language"
		content="zh-CN" />
	<meta
		name="author"
		content="AI时代掘金商学院" />
	<meta
		name="copyright"
		content="©DigiFlow Inc. AI时代掘金商学院" />
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
</svelte:head>
<div
	id="pageHeader"
	class="d-flex justify-content-center align-items-center p-0">
	<img
		src={background1}
		alt="caishen"
		class="aibs-logo m-2 rounded" />
</div>
<div
	id="main"
	class="container">
	<div class="helpCorner">
		<a
			href={'#'}
			on:click={showHelp}
			class="btn btn-primary btn-sm m-2 aifont">
			帮助
			<i class="bi bi-question-circle" />
		</a>
	</div>
	<div
		id="chatcontentarea"
		bind:this={chatArea}
		style={`font-size:${$myFontSize}px`}>
		<div
			id="chatbody"
			bind:this={chatBody}
			class="w-100">
		</div>
		<div
			id="scrollToAnchorDiv"
			bind:this={theScrollToDiv}>
			&nbsp;
		</div>
	</div>
	<div
		id="bottomblock"
		class="bg-transparent">
		&nbsp;
	</div>
</div>
<Scenarios
	{modalControl}
	{Icons}
	{scenarioGroups}
	{scenarioList}
	currentScenario={theScenario}
	on:showHelp={() => showHelp()}
	on:toggle={() => {
		toggleModal('scenario');
	}}
	on:chat={async (event) => {
		await chatThisScenario(event.detail);
		toggleModal('scenario');
	}}>
</Scenarios>
<Modal
	isOpen={shareItModalIsOpen}
	fade={false}
	class={'modal-dialog-centered '}
	toggle={toggleShareItModal}>
	<ModalHeader toggle={toggleShareItModal}>与好友分享</ModalHeader>
	<ModalBody>
		{#each shareItOptions as option, index}
			<div class="form-check">
				<input
					class="form-check-input"
					type="radio"
					name="shareitRadios"
					id={`shareitRadios-${index}`}
					bind:group={shareItPeriod}
					value={option.value}
					checked={option.checked} />
				<label
					class="form-check-label"
					for="shareitRadios-${index}">
					{option.label}
				</label>
			</div>
		{/each}
	</ModalBody>
	<ModalFooter>
		<Button
			color="secondary"
			on:click={toggleShareItModal}>
			取消
		</Button>
		<Button
			color="primary"
			on:click={doShareIt}>
			开始分享
		</Button>
	</ModalFooter>
</Modal>
<Modal
	isOpen={settingModalIsOpen}
	fade={false}
	scrollable
	class={'modal-dialog-centered '}
	toggle={toggleSettingModal}>
	<ModalHeader toggle={toggleSettingModal}>业务背景设置</ModalHeader>
	<ModalBody>
		<div class="d-flex justify-content-between m-0 mx-3 mb-3">
			<a
				href={'#'}
				on:click={() => {
					toggleSettingModal();
					showHelp();
				}}
				class="kfk-link">
				续费
			</a>
			<a
				href={'#'}
				on:keydown={null}
				on:click={async () => {
					toggleSettingModal();
					await goto('/caishenpwd', { replaceState: true, invalidateAll: true, noScroll: true });
				}}
				class="kfk-link">
				修改密码
			</a>
			<a
				href={'#'}
				class="kfk-link"
				on:click={async () => {
					toggleSettingModal();
					await logout();
				}}>
				退出登录
			</a>
		</div>
		<AiAdvisors
			fullmode={false}
			on:advisor={async (e) => {
				console.log(`you pick ${e.detail}`);
				await adhocAnswerBlock(
					Icons[e.detail],
					'A',
					`我是${AdvisorNames[e.detail]}，接下来我来辅导你`,
					false,
				);
				autoScroll();
				$advisor = e.detail;
			}} />
		<div id="bizcontext">
			<div class="input-group">
				<span class="input-group-text">所在行业</span>
				<input
					type="text"
					aria-label="My industry is"
					class="form-control"
					placeholder="我的行业"
					bind:value={$caishenContext.industry} />
				<!-- <select -->
				<!-- 	class="form-select" -->
				<!-- 	aria-label="My industry is" -->
				<!-- 	bind:value={$caishenContext.industry}> -->
				<!-- 	{#each industries as desc, id} -->
				<!-- 		<option value={String(id)}>{desc}</option> -->
				<!-- 	{/each} -->
				<!-- </select> -->
			</div>
			<div class="input-group">
				<span class="input-group-text">我的名字</span>
				<input
					type="text"
					aria-label="personal name"
					class="form-control"
					placeholder="输入你自己的名字"
					bind:value={$caishenContext.name} />
			</div>
			<div class="input-group">
				<span class="input-group-text">我的单位</span>
				<input
					type="text"
					aria-label="company name"
					class="form-control"
					placeholder="输入工作单位名称"
					bind:value={$caishenContext.company} />
			</div>
			<div class="input-group">
				<span class="input-group-text">我的角色</span>
				<select
					class="form-select"
					aria-label="my position"
					bind:value={$caishenContext.position}>
					{#each positions as desc, id}
						<option value={String(id)}>{desc}</option>
					{/each}
				</select>
			</div>
		</div>
		<label
			class="mt-2"
			for="my_chatgpt_api_key">
			我的API_KEY:
		</label>
		<div class="input-group">
			<input
				type="text"
				id="my_chatgpt_api_key"
				aria-label="company name"
				class="form-control"
				placeholder="设置后不再显示"
				bind:value={$my_chatgpt_api_key} />
			<button
				class="btn btn-primary"
				disabled={$my_chatgpt_api_key.indexOf('*') > 0}
				on:click={async () => {
					if ($my_chatgpt_api_key.indexOf('*') > 0) return;
					await empApi.post(
						'/caishen/setMyKey',
						{ key: $my_chatgpt_api_key },
						$page.data.user.sessionToken,
					);
					const tmp = $my_chatgpt_api_key;
					$my_chatgpt_api_key = tmp.slice(0, 3) + '*'.repeat(10) + tmp.slice(-3);
				}}>
				设置
			</button>
		</div>
		<div>
			<span>字体大小({$myFontSize})</span>
			<button
				class="btn btn-light btn-sm p-1 m-2"
				on:click={() => {
					$myFontSize = 16;
				}}>
				缺省大小
			</button>
			<input
				id="exampleRange"
				min="10"
				max="30"
				step="1"
				type="range"
				class="form-range"
				bind:value={$myFontSize}
				name="range"
				placeholder="字体大小" />
		</div>
	</ModalBody>
	<ModalFooter>
		<Button
			color="primary"
			on:click={toggleSettingModal}>
			确定
		</Button>
	</ModalFooter>
</Modal>
{#if $homePage === PAGE_CHAT}
	{#if gptLogOpen}
		<GptLog
			logs={gptLog}
			{gptLogOpen}
			on:close={() => {
				gptLogOpen = false;
			}}
			on:reload={async () => {
				await refreshGptLog();
			}}
			on:restore={async (pld) => {
				gptLogOpen = false;
				await chatThisScenario(clientGetScenarioById(gptLog[pld.detail].scenid));
				restoreLogIntoWindow(gptLog[pld.detail].bsid);
			}} />
	{/if}
	{#if useCornerButton}
		<div
			class="corner-button"
			on:click={() => {
				useCornerButton = false;
			}}
			on:keydown={null}>
			<img
				src={caishenIcon}
				style="width:100%; height:100%"
				alt="caishen" />
		</div>
	{:else}
		<div class="bottomarea container">
			<div class="d-flex justify-content-center mb-2">
				{#if $generating}
					<button
						class="btn btn-outline-primary rounded-pill py-1 px-3"
						on:keydown={null}
						on:click={() => {
							//onstop
							disconnectFromServer();
							$generating = false;
						}}>
						停止
					</button>
				{/if}
			</div>
			<div class="bottomarea-inner bg-light">
				<div class="container-fluid p-2">
					{#if !onlyInput}
						<div class="row m-0 p-0 align-items-center">
							<div class="col m-0 p-0 copyright">©DigiFlow {shouldAutoScroll}</div>
							<div class="col-auto m-0 p-0">
								<button
									class="btn btn-sm btn-light py-0 border-0 aifont txtcolor"
									type="button"
									on:click={() => {
										$enableTask = !$enableTask;
									}}>
									{#if $enableTask}
										<i class="bi bi-lightning" />
									{:else}
										<i class="bi bi-chat-text-fill" />
									{/if}
								</button>
							</div>
							<div class="col-auto m-0 p-0">
								<button
									class="btn btn-sm btn-light py-0 border-0 aifont txtcolor"
									type="button"
									on:click={pickScenarioNow}>
									<!-- <i class="bi bi-arrow-down-up" /> -->
									切换场景
								</button>
							</div>
							<div class="col-auto ms-1 p-0">
								<button
									class="btn btn-sm btn-light py-0 border-0 aifont txtcolor"
									type="button"
									on:click={repeatScenario}>
									<!-- <i class="bi bi-arrow-repeat" /> -->
									重进场景
								</button>
							</div>
							<div class="col-auto m-0 p-0">
								<button
									class="btn btn-sm btn-light py-0 border-0 aifont txtcolor"
									type="button"
									on:click={() => {
										gptLogOpen = true;
									}}>
									<!-- <i class="bi bi-bookmark-heart" /> -->
									历史
								</button>
							</div>
							<div class="col-auto m-0 ms-1 p-0">
								<button
									class="btn btn-sm btn-light py-0 border-0 aifont txtcolor"
									type="button"
									on:click={() => {
										toggleSetting();
									}}>
									<!-- <i class="bi bi-gear" /> -->
									设置
								</button>
							</div>
						</div>
						<div class="row mt-2 p-0 mb-3 aifont">
							<div
								class="col d-flex justify-content-center align-items-center overflow-auto clickable"
								on:click={pickScenarioNow}
								on:keydown={null}>
								<span class="text-glow ps-0">
									{theScenario ? theScenario.desc : '点这里去选择一个主题'}
									<!-- <TypingEffect -->
									<!-- 	text={theScenario ? theScenario.desc : '点这里去选择一个主题'} /> -->
								</span>
							</div>
						</div>
						{#each Object.keys(extras) as key}
							<div class="row m-1">
								<textarea
									id={key}
									aria-label={key}
									class="form-control bg-light border-0 m-0 p-0"
									rows="5"
									style={`font-size: ${$myFontSize}px;`}
									bind:value={$caishenContext.extras[key]}
									placeholder={extras[key]} />
							</div>
						{/each}
					{/if}
					<div class="row m-1">
						<div
							class="input-group p-1 mb-0 border-1 rounded"
							class:glowing={true}>
							<textarea
								id="chatInput"
								on:input={() => {
									adjustHeight();
								}}
								aria-label="Details"
								class="form-control bg-light border-0 m-0 p-0"
								style={`font-size: ${$myFontSize}px;`}
								bind:value={$caishenContext.userMsg}
								bind:this={theChatInput}
								placeholder={askNumber === 0
									? theScenario?.note
										? theScenario.note
										: '补充更多信息或要求，也可不补充直接提问'
									: '在当前主题下继续追问'} />
							<div class="h-100 d-flex align-items-end">
								<button
									class="btn btn-transparent border-0 m-0 p-0 px-1"
									on:click={pickScenarioNow}>
									<i class="bi bi-three-dots-vertical" />
								</button>
								<button
									class="btn btn-primary border-0 m-0 p-0 px-1"
									disabled={$generating}
									type="button"
									id="askButton"
									style={`font-size: ${$myFontSize}px;`}
									on:click={() => {
										if ($generating) {
											disconnectFromServer();
											$generating = false;
										} else {
											askNormal();
										}
									}}>
									{#if $generating}
										<AiIsThinking color={'white'} />
									{:else if askNumber === 0}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 16 16"
											fill="none"
											class="h-4 w-4 m-1 md:m-0 text-light"
											style="height: 18px; width: 18px;"
											stroke-width="2">
											<path
												d="M.5 1.163A1 1 0 0 1 1.97.28l12.868 6.837a1 1 0 0 1 0 1.766L1.969 15.72A1 1 0 0 1 .5 14.836V10.33a1 1 0 0 1 .816-.983L8.5 8 1.316 6.653A1 1 0 0 1 .5 5.67V1.163Z"
												fill="currentColor">
											</path>
										</svg>
									{:else}
										<span style="font-size:12px;">追问</span>
									{/if}
								</button>
								<!-- wencai-->
							</div>
							<button
								class="btn btn-transparent border-0 m-0 p-0 px-1"
								on:click={toggleOnlyInput}>
								{#if onlyInput}
									<i class="bi bi-arrow-up" />
								{:else}
									<i class="bi bi-arrow-down" />
								{/if}
							</button>
						</div>
					</div>
					<ul
						id="commandList"
						class="nodisplay">
						{#each commands as command, index}
							<li
								class:active={commandIndex === index}
								on:keydown={null}
								on:click={() => {
									setInput(command.input);
								}}>
								{command.input}
								<span class="smalltext">{command.note}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}
{/if}

{#if showHelpFlag}
	<HelpModal on:toggle={toggleHelp} />
{/if}

<style>
	#main {
		display: flex;
		flex-direction: column;
		height: 100vh; /* 100% of the viewport height */
	}

	#chatcontentarea {
		flex: 1; /* This will make the div take up any remaining space */
		overflow: auto; /* Add scroll if chat content overflows */
	}

	.corner-button {
		border-radius: 20px;
		width: 40px;
		height: 40px;
	}
	.text-glow {
		color: #333; /* Dark gray for the text on a light background */
		text-shadow:
			0 0 3px rgba(200, 200, 200, 0.5),
			0 0 6px rgba(200, 200, 200, 0.4),
			0 0 9px rgba(200, 200, 200, 0.3);
	}
	.helpCorner {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 999;
	}

	@keyframes glowEffect {
		2%,
		34%,
		66%,
		100% {
			box-shadow: 0 0 5px #3498db;
		}
		18%,
		50%,
		82% {
			box-shadow:
				0 0 5px #fff,
				0 0 10px #fff,
				0 0 15px #3498db,
				0 0 20px #3498db,
				0 0 25px #3498db,
				0 0 30px #3498db,
				0 0 35px #3498db;
		}
	}

	@keyframes glowEffect_golden {
		2%,
		34%,
		66%,
		98% {
			box-shadow: none;
		}
		18%,
		50%,
		82% {
			box-shadow:
				0 0 5px #fff,
				0 0 10px #fff,
				0 0 15px #ffd700,
				0 0 20px #ffd700,
				0 0 25px #ffd700,
				0 0 30px #ffd700,
				0 0 35px #ffd700;
		}
	}

	.glowing {
		animation: glowEffect 40s infinite;
	}

	#chatInput::placeholder {
		color: gray; /* Change the color of the placeholder text */
		font-style: italic; /* Make the placeholder text italic */
		font-size: 9px; /* Set the font size of the placeholder text */
	}

	#scrollToAnchorDiv {
		height: 40px;
	}

	.smalltext {
		font-size: 9px;
		font-style: italic;
		color: gray;
	}

	li.active {
		background-color: #e9ecff;
	}

	.aibs-logo {
		height: 100px;
	}

	#pageHeader {
		background-color: rgba(0, 0, 0, 1);
	}

	.bottomarea {
		position: sticky;
		bottom: 0px;
	}

	.bottomarea-inner {
		flex-shrink: 0; /* Prevents the div from shrinking */
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
		box-shadow: 0 -2px 2px 2px rgba(0, 0, 0, 0.2);
	}

	#caishenwx {
		width: 200px;
	}

	#chatInput {
		min-height: 0 !important;
		height: 28px;
		overflow-y: hidden;
		resize: none;
	}

	#chatInput:focus {
		background-color: #e6e6e6;
		outline: none !important;
		border: none !important;
		box-shadow: none !important;
	}

	.copyright {
		color: #3498db;
		font-size: 10px;
	}

	@font-face {
		font-family: 'aiFont';
		src: url('/fonts/aiFont.woff2');
		font-weight: normal;
		font-style: normal;
	}
	.aifont {
		font-family: 'aiFont', sans-serif;
		font-size: 12px;
	}
	.txtcolor {
		color: #3498db;
	}
</style>
