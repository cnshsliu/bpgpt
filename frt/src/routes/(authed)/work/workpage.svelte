<script lang="ts">
	import TimeTool from '$lib/TimeTool';
	import { _ } from '$lib/i18n';
	import { qtb, nbArray } from '$lib/utils';
	import * as empApi from '$lib/api';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Parser from '$lib/parser';
	import { setFadeMessage } from '$lib/Notifier';
	import { text_area_resize } from '$lib/autoresize_textarea';
	import { createEventDispatcher } from 'svelte';
	import Comments from '$lib/Comments.svelte';
	import ProcessTrack from '$lib/ProcessTrack.svelte';
	import InputKVar from '$lib/input/KVarInput.svelte';
	import KVarDisplay from '$lib/display/KVarDisplay.svelte';
	import SignArea from '$lib/input/SignArea.svelte';
	import TransferWork from './_transfer.svelte';
	import { Row, Col, Accordion, AccordionItem } from 'sveltestrap';
	import { onMount, tick } from 'svelte';
	import { Input } from 'sveltestrap';
	import { Button } from 'sveltestrap';
	import { inputs, debugOption } from '$lib/mtcLocalStores';
	import WorkFile from '$lib/workfile.svelte';
	import { printing, worklistChangeFlag } from '$lib/Stores';
	import type { User, Work } from '$lib/types';
	export let work: Work;
	export let delegators: String[] = [];
	let user: User = $page.data.user;
	let theCommentInput: any;
	let recentUsers: string[] = [];
	let showAdhocForm: boolean = false;
	let adhocTaskTitle: string = '';
	let adhocTaskComment: string = '';
	let adhocTaskDoer: string = '';
	let comment: string = '';
	let creatingAdhoc = false;
	let adhocTaskDoerConfirmed = false;
	let checkingTimer: ReturnType<typeof setTimeout> | undefined;
	let checkingAdhocResult: any[] = [];
	let newComment: string = '';
	let workJustDone: Work | null = null;
	let caculateFormulaTimer: ReturnType<typeof setTimeout> | undefined;
	let pointToOrigin: string = '';
	let hasSignature: boolean = false;
	import CommentInput from '$lib/input/CommentInput.svelte';
	const dispatch = createEventDispatcher();

	let signature: string = '';

	const onPrint = async function () {
		$printing = true;
		setTimeout(async () => {
			$printing = false;
		}, 3000);
	};

	function _sendbackWork() {
		//if (checkRequiredAndError() === false) return;
		let payload: any = {
			wfid: work.wfid,
			todoid: work.todoid,
			doer: work.doer,
			comment: comment,
		};
		payload.kvars = {};
		for (let i = 0; i < work.kvarsArr.length; i++) {
			payload.kvars[work.kvarsArr[i]['name']] = work.kvarsArr[i];
		}
		empApi.post('work/sendback', payload, user.sessionToken);
		empApi.removeCacheByPath('work/search');
		$worklistChangeFlag++;
		setTimeout(() => {
			goto('/work');
		}, 500);
	}
	function _revokeWork() {
		//if (checkRequiredAndError() === false) return;
		let payload: any = {
			wfid: work.wfid,
			todoid: work.todoid,
			comment: comment,
		};
		empApi.post('work/revoke', payload, user.sessionToken);
		empApi.removeCacheByPath('work/search');
		$worklistChangeFlag++;
		setTimeout(() => {
			goto('/work');
		}, 500);
	}
	function _toggleAdhoc() {
		adhocTaskDoerConfirmed = false;
		checkingAdhocResult = [];
		showAdhocForm = !showAdhocForm;
	}
	const checkAdhocTaskDoer = async function (evt: Event, atonce = false) {
		evt.preventDefault();
		if (adhocTaskDoer.trim().length === 0) return;
		creatingAdhoc = true;

		if (atonce || checkingTimer) {
			clearTimeout(checkingTimer);
			checkingTimer = undefined;
		}
		checkingTimer = setTimeout(
			async () => {
				checkingAdhocResult = (await empApi.post(
					'explain/pds',
					{
						wfid: work.wfid,
						pds: adhocTaskDoer,
						//teamid:  will use workflow's teamid automatically
						//email: will use workflow's starter automatically
					},
					user.sessionToken,
				)) as unknown as any[];
				checkingTimer = undefined;
			},
			atonce ? 1 : 1000,
		);
	};

	const createAdhoc = async function () {
		creatingAdhoc = true;

		let res = await empApi.post(
			'work/adhoc',
			{
				wfid: work.wfid,
				todoid: work.todoid,
				title: adhocTaskTitle,
				doer: adhocTaskDoer,
				rehearsal: work.rehearsal,
				comment: adhocTaskComment,
			},
			user.sessionToken,
		);
		setTimeout(async () => {
			creatingAdhoc = false;
		}, 4000);
		if (res.error) {
			setFadeMessage(res.message, 'warning');
		} else {
			empApi.removeCacheByPath('work/search');
			$worklistChangeFlag++;
			saveOneRecentUser(adhocTaskDoer);
			setFadeMessage($_('notify.create_adhoc_success'));
		}
	};
	function checkRequiredAndError() {
		let errMsg = '';
		for (let i = 0; i < work.kvarsArr.length; i++) {
			if (work.kvarsArr[i].required && showKVars[i]) {
				if (work.kvarsArr[i].type === 'user') {
					if (work.kvarsArr[i].value === '' || (work.kvarsArr[i].value as string).trim() === '') {
						// errMsg = `${work.kvarsArr[i].label}: should have a value`;
						errMsg = $_('input.should_have_value', { values: { key: work.kvarsArr[i].label } });
						break;
					}
					if (work.kvarsArr[i].wrong_input) {
						errMsg = `${work.kvarsArr[i].label}: ${work.kvarsArr[i].wrong_input}`;
						break;
					}
				} else if (work.kvarsArr[i].type === 'checkbox') {
					if (
						(work.kvarsArr[i].value as unknown) !== true &&
						(work.kvarsArr[i].value as unknown) !== false
					) {
						// errMsg = `${work.kvarsArr[i].label} should hava value`;
						errMsg = $_('input.should_have_value', { values: { key: work.kvarsArr[i].label } });
						break;
					}
				} else if (work.kvarsArr[i].type === 'file') {
					let file_number = 0;
					for (let a = 0; a < work.wf.attachments.length; a++) {
						if (work.wf.attachments[a].forKey === work.kvarsArr[i].name) {
							file_number++;
						}
					}
					if (file_number === 0) {
						errMsg = $_('input.should_have_value_file', {
							values: { key: work.kvarsArr[i].label },
						});
						break;
					} else {
						console.log(work.kvarsArr[i].label, file_number);
					}
				} else if (work.kvarsArr[i].type === 'number' || work.kvarsArr[i].type === 'range') {
					if (typeof work.kvarsArr[i].value !== 'number') {
						errMsg = $_('input.should_have_value_number', {
							values: { key: work.kvarsArr[i].label },
						});
						break;
					}
				} else {
					if (!work.kvarsArr[i].value) {
						errMsg = $_('input.should_have_value', { values: { key: work.kvarsArr[i].label } });
						break;
					}
				}
			}
		}
		if (errMsg !== '') {
			setFadeMessage(errMsg, 'warning');
			return false;
		}
		return true;
	}
	async function _doneWork(user_choice: string | undefined = undefined) {
		if (checkRequiredAndError() === false) return;
		let payload: any = {
			doer: work.doer,
			todoid: work.todoid,
			comment: comment,
		};
		if (user_choice) {
			payload.route = user_choice;
		}
		payload.kvars = {};
		for (let i = 0; i < work.kvarsArr.length; i++) {
			payload.kvars[work.kvarsArr[i]['name']] = work.kvarsArr[i];
		}
		let ret = await empApi.post('work/do', payload, user.sessionToken);
		if (ret.error) {
			setFadeMessage(ret.message, 'error');
		} else {
			empApi.removeCacheByPath('work/search');
			$worklistChangeFlag++;
			dispatch('statusChanged', ret);
			setFadeMessage($_('todo.completed'), 'success');
			//If have endpoint, post to endpoint
			if (
				work.wf.endpoint &&
				work.wf.endpoint.startsWith('http') &&
				['both', 'user'].includes(work.wf.endpointmode)
			) {
				let tmpvars = payload.kvars;
				for (const valueDef of Object.values(tmpvars)) {
					delete (valueDef as any).breakrow;
					delete (valueDef as any).placeholder;
					delete (valueDef as any).type;
					delete (valueDef as any).ui;
					delete (valueDef as any).required;
					delete (valueDef as any).id;
					delete (valueDef as any).visi;
					delete (valueDef as any).when;
				}
				let data = {
					mtcdata: {
						mode: 'client',
						context: {
							tplid: work.wf.tplid,
							wfid: work.wf.wfid,
							wftitle: work.wf.wftitle,
							todoid: work.todoid,
							title: work.title,
							doer: work.doer,
						},
						route: payload.route,
						kvars: tmpvars,
					},
				};
				let opts = {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(data),
				};
				try {
					fetch(`${work.wf.endpoint}`, opts as RequestInit)
						.then((r) => {
							console.log(r.text());
						})
						.catch((error) => console.log(error))
						.finally(() => console.log(`Callback ${work.wf.endpoint} finished`));
				} catch (error) {
					console.error(error);
				}
			}
		}
		workJustDone = work;
		tick().then(() => {
			_refreshWork(work.todoid).then(() => {});
		});
	}

	export async function _refreshWork(todoid: string) {
		console.log('todoid', todoid);
		setTimeout(async () => {
			work = (await empApi.post(
				'work/info',
				{ todoid: todoid },
				user.sessionToken,
			)) as unknown as Work;
			//console.log(JSON.stringify(work, null, 2));
			work.wf.kvarsArr = work.wf.kvarsArr;
		}, 3000);
		comment = '';
	}

	const checkDoable = function () {
		console.log(work);
		console.log(user);
		let is_doable =
			//工作项的负责人doer是当前用户
			(work.doer === user.eid ||
				//或者，在演练模式下，该演练流程由当前用户发起
				(work.rehearsal && work.wfstarter === user.eid) ||
				//或者，把工作委托给当前用户的人（delegators）中，有当前工作项的负责人，
				//也就是说，当前工作的负责人把工作委托给了当前用户
				(delegators && Array.isArray(delegators) && delegators.includes(work.doer))) &&
			//最后，要求当前工作项的状态必须是正在进行中ST_RUN
			work.status === 'ST_RUN';
		return is_doable;
	};

	const saveOneRecentUser = function (user: string) {
		let tmp = recentUsers.indexOf(user);
		if (tmp > -1) {
			recentUsers.splice(tmp, 1);
		}
		recentUsers.unshift(user);
		if (recentUsers.length > 10) {
			recentUsers.splice(10);
		}
		localStorage.setItem('recentUsers', JSON.stringify(recentUsers));
		recentUsers = recentUsers;
	};

	let showKVars = new Array();
	for (let i = 0; i < work.kvarsArr.length; i++) {
		showKVars[i] = work.kvarsArr[i].when ? false : true;
	}

	const getKVarValue = (name: string) => {
		for (let i = 0; i < work.kvarsArr.length; i++) {
			if (work.kvarsArr[i].name === name) {
				return work.kvarsArr[i].value;
			}
		}
		return `NON_EXISTING`;
	};

	const splitWhen = (x: string) => {
		x = x.trim();
		let tmp = x.match(/(\w+)(\={1,3}|\>=?|\<=?|\!=)(.+)/);
		if (tmp) {
			tmp[3] = tmp[3].replace(/^["\']/, '');
			tmp[3] = tmp[3].replace(/["\']$/, '');
			return [tmp[1], tmp[2], tmp[3]];
		} else {
			return null;
		}
	};

	const setShowKVars = function () {
		if (work.kvarsArr.length <= 0) return;
		for (let i = 0; i < work.kvarsArr.length; i++) {
			if (work.kvarsArr[i].when) {
				let theWhenString = <string>work.kvarsArr[i].when;
				showKVars[i] = false;
				//如果有when的话，when的格式应该是正确的，否则splitWhen会出错
				//所支持的语法包括  kvar_name[=|==|===|>|>=|<|<=|!=]value
				//value的类型可视是string， boolean或number
				//当为字符串时，出发是空字符，否则不必添加左右引号
				//MTC会对value进行类型转换，转换为与kvar_name的值相同的类型，然后进行比较
				//例如，如kvar checkbox_req为checkbox，那么它的值是boolean类型，当在这个checkbox被选定时，才需要输入一个值时，则可使用  checkbox_req=true
				//判断一个数值大小， kvar名称为 number_amount, 其值的类型为number，则可以使用如下定义来判断是否这个值大于100
				//  number_amount>100
				//所支持的操作符如下：
				//   =， ==， ===
				//  >  >=  <   <=  !=
				let tmp = splitWhen(theWhenString);
				if (!tmp) {
					console.error('Caution:', theWhenString, 'split to ', tmp);
				} else {
					let refValue = getKVarValue(tmp[0]);
					let chk = tmp[2];
					chk = Parser.sameTypeValue(chk, refValue);
					showKVars[i] = ['=', '==', '==='].includes(tmp[1])
						? refValue === chk
						: ['>'].includes(tmp[1])
						? refValue > chk
						: ['>='].includes(tmp[1])
						? refValue >= chk
						: ['<'].includes(tmp[1])
						? refValue < chk
						: ['<='].includes(tmp[1])
						? refValue <= chk
						: ['!='].includes(tmp[1])
						? refValue != chk
						: false;
				}
			}
		}
	};

	//对数字类输入值进行自动处理
	const autoSetDefaultValue = function () {
		for (let i = 0; i < work.kvarsArr.length; i++) {
			if (work.kvarsArr[i].value === '') {
				//数字栏位如果为空，自动设为0
				if (work.kvarsArr[i].type === 'number' || work.kvarsArr[i].type === 'range') {
					work.kvarsArr[i].value = 0;
				}
			} else {
				if (work.kvarsArr[i].type === 'number' || work.kvarsArr[i].type === 'range') {
					//数字栏位不是空，进行类型转换
					let tmp = Number(work.kvarsArr[i].value);
					work.kvarsArr[i].value = isNaN(tmp) ? 0 : tmp;
				}
			}
		}
	};

	const caculateFormula = function () {
		if (work.kvarsArr.length <= 0) return;
		if (caculateFormulaTimer) {
			clearTimeout(caculateFormulaTimer);
			caculateFormulaTimer = undefined;
		}
		caculateFormulaTimer = setTimeout(async () => {
			try {
				setShowKVars();
				autoSetDefaultValue();
				for (let i = 0; i < work.kvarsArr.length; i++) {
					if (work.kvarsArr[i].formula) {
						//console.log(work.kvarsArr[i].formula);
						try {
							Parser.evalFormula(<any[]>work.kvarsArr, <string>work.kvarsArr[i].formula).then(
								(result) => {
									work.kvarsArr[i].value = result;
								},
							);
						} catch (e) {
							console.warn(e);
						}
					}
				}
			} finally {
				caculateFormulaTimer = undefined;
			}
		}, 500);
	};

	const ensureSignature = async () => {
		if (work.mustsign && !hasSignature) return false;
		else if (work.mustsign) {
			//post signature here
			await empApi.post(
				'signature/save',
				{ signature: signature, objid: work.todoid },
				$page.data.user.sessionToken,
			);
			return true;
		}
	};

	onMount(async () => {
		//Get timeout setting of delete timeout from server
		//根据参数的When设置计算是否显示
		setShowKVars();
		if (localStorage) {
			recentUsers = JSON.parse(localStorage.getItem('recentUsers') ?? JSON.stringify([]));
		}

		for (let i = 0; i < work.kvarsArr.length; i++) {
			if ($inputs[work.todoid] && $inputs[work.todoid][work.kvarsArr[i].name]) {
				work.kvarsArr[i].value = $inputs[work.todoid][work.kvarsArr[i].name];
			}
		}

		caculateFormula();
	});
</script>

{#if $debugOption === 'all'}
	<pre><code /></pre>
{/if}
<Accordion>
	<div class="text-center fs-4">
		{work.doer === user.eid
			? ''
			: $_('setting.delegation.delegated_by', { values: { delegator: work.doer } })}
	</div>
	<div
		id={'workitem_' + work.todoid}
		class={'m-0 p-0'}
		class:nodisplay={$printing}>
		{#if work.status !== 'ST_DONE'}
			{#if work.instruct}
				<div class="fs-5">
					{$_('todo.instruction')}
					<br />
					<span class="mt-3">
						{@html Parser.base64ToCode(work.instruct, '')}
					</span>
				</div>
			{/if}
			<!-- 这里显示excel上传的内容 csv_ START -->
			{#if work.cellInfo}
				<div style="overflow-x:auto;">
					{@html work.cellInfo}
				</div>
			{/if}
			<!-- 这里显示excel上传的内容 csv_ END -->
			<!--- div class="w-100">
				<iframe id="workInstruction" src="/work/instruct" title="YouTube video" width="100%" />
			</div -->
			<div class="m-0 p-3 kfk-highlight-2">
				{#if checkDoable() && work.status === 'ST_RUN'}
					<!-- 参数输入区  START -->
					{#if work.kvarsArr.length > 0}
						<div class="card w-100">
							<span class="fs-4 text-center">
								{$_('todo.nodeInput')}
							</span>
							<div class="card-body">
								<Row
									cols={{ lg: 4, md: 2, xs: 1 }}
									class="m-2"
									id="todo_variable_area">
									{#each work.kvarsArr as kvar, kvarIndex}
										{#if showKVars[kvarIndex]}
											<InputKVar
												{work}
												{kvar}
												{kvarIndex}
												on:kvar_value_input_changed={async () => {
													if (!$inputs[work.todoid]) {
														$inputs[work.todoid] = {
															___ts__: new Date().getTime(),
														};
													}
													$inputs[work.todoid][kvar.name] = kvar.value;
													$inputs[work.todoid]['___ts__'] = new Date().getTime();
													caculateFormula();
													for (const [key, value] of Object.entries($inputs)) {
														if (key !== work.todoid) {
															if (!value['___ts__']) {
																delete $inputs[key];
															} else {
																let tmp1 = new Number(value['___ts__']).valueOf();
																if (new Date().getTime() - tmp1 > 10000) {
																	delete $inputs[key];
																}
															}
														}
													}
												}} />
										{/if}
									{/each}
								</Row>
							</div>
						</div>
					{/if}
					<!-- 参数输入区  END -->
					<input
						type="hidden"
						name="todoid"
						value={work.todoid} />
					<!-- {#if work.nodeid === 'ADHOC' || (work.withcmt && work.status === 'ST_RUN')} -->
					<!-- 	<textarea -->
					<!-- 		placeholder={$_('work.quickcomments')} -->
					<!-- 		bind:value={comment} -->
					<h4>{work.title}</h4>
					<!-- 		use:text_area_resize -->
					<!-- 		class="form-control" /> -->
					<!-- {/if} -->
					<!-- buttons 按钮区 START -->
					{#if work.status === 'ST_RUN'}
						{#if work.mustsign}
							<Col class="w-100 d-flex justify-content-center">
								<SignArea
									objid={work.todoid}
									bind:hasSignature
									bind:signature />
							</Col>
						{/if}
						<Row
							class="mt-2"
							id="todo_buttons_area">
							{#if work.routingOptions.length === 0}
								<Col>
									<Button
										class="w-100"
										color="primary"
										disabled={work.mustsign && !hasSignature}
										on:click={async (e) => {
											e.preventDefault();
											if (await ensureSignature()) {
												$inputs[work.todoid] = {};
												await _doneWork();
											}
										}}>
										{$_('button.done')}
										{work.mustsign && !hasSignature ? $_('sign.waitforsignature') : ''}
										{work.rehearsal ? 'Rehearsal' : ''}
									</Button>
								</Col>
							{/if}
							{#each work.routingOptions as aChoice}
								<Col>
									<Button
										class="w-100"
										color="primary"
										disabled={work.mustsign && !hasSignature}
										on:click={async (e) => {
											e.preventDefault();
											if (await ensureSignature()) {
												$inputs[work.todoid] = {};
												await _doneWork(aChoice);
											}
										}}>
										{(() => {
											let a = aChoice.match(/^\d+[-\.:](.*)/);
											if (a) {
												return a[1];
											} else {
												return aChoice;
											}
										})() + (work.mustsign && !hasSignature ? $_('sign.waitforsignature') : '')}
									</Button>
								</Col>
							{/each}
						</Row>
					{/if}
					<!-- 按钮区 END -->

					<Row class="mt-4">
						{#if work.withsb && work.returnable}
							<Col>
								<Button
									class="w-100"
									on:click={(e) => {
										e.preventDefault();
										$inputs[work.todoid] = {};
										_sendbackWork();
									}}>
									{$_('button.sendback')}
								</Button>
							</Col>
						{:else if work.withrvk && work.revocable}
							<Col>
								<Button
									class="w-100"
									on:click={(e) => {
										e.preventDefault();
										$inputs[work.todoid] = {};
										_revokeWork();
									}}>
									{$_('button.revoke')}
								</Button>
							</Col>
						{/if}
						{#if work.withadhoc && work.status === 'ST_RUN'}
							<Col>
								<Button
									class="w-100"
									color="success"
									on:click={(e) => {
										e.preventDefault();
										_toggleAdhoc();
									}}>
									{showAdhocForm ? $_('button.cancel') : $_('button.adhoc')}
								</Button>
							</Col>
						{/if}
					</Row>
					{#if showAdhocForm}
						<Row
							cols="1"
							class="mx-5 my-2 kfk-highlight-2 ">
							<div class="fs-5">{$_('adhoc.header')}</div>
							<Col class="my-1">
								<div class="form-floating">
									<Input
										name="adhoc_task_title"
										id="input-adhoc-title"
										class="form-control"
										bind:value={adhocTaskTitle} />
									<label for="input-adhoc-title">{$_('adhoc.title')}</label>
								</div>
							</Col>
							<Col>
								<div class="form-floating">
									<Input
										name="adhoc_task_doer"
										id="input-adhoc-doer"
										class="form-control"
										bind:value={adhocTaskDoer}
										on:change={(e) => {
											e.preventDefault();
											adhocTaskDoer = qtb(adhocTaskDoer);
										}} />
									<label for="input-adhoc-doer">{$_('adhoc.pds')}</label>
								</div>
							</Col>
							{#if nbArray(recentUsers)}
								<Col>
									<span>{$_('adhoc.recent')}:</span>
									{#each recentUsers as aUser}
										<Button
											class="mx-1 badge bg-info text-dark"
											on:click={async (e) => {
												e.preventDefault();
												adhocTaskDoer = aUser;
												await checkAdhocTaskDoer(e, true);
											}}>
											{aUser}
										</Button>
									{/each}
								</Col>
							{/if}
							<Col class="my-1">
								<div class="form-floating">
									<textarea
										placeholder={$_('adhoc.comment')}
										name="adhoc_task_comment"
										id="input-adhoc-comment"
										class="form-control"
										bind:value={adhocTaskComment}
										use:text_area_resize />
									<label for="input-adhoc-comment">{$_('adhoc.comment')}</label>
								</div>
							</Col>
							<Button
								color="primary"
								on:click={async (e) => {
									e.preventDefault();
									await checkAdhocTaskDoer(e, true);
								}}>
								{$_('button.checkdoer')}
							</Button>
							{#if adhocTaskDoerConfirmed}
								<Col class="d-flex justify-content-end my-1">
									<Button
										color="primary"
										disabled={creatingAdhoc}
										on:click={async (e) => {
											e.preventDefault();
											await createAdhoc();
										}}>
										{$_('button.sendadhoc')}
									</Button>
									<Button
										color="secondary"
										class="mx-1"
										on:click={async (e) => {
											e.preventDefault();
											showAdhocForm = false;
										}}>
										Cancel
										{$_('button.cancel')}
									</Button>
								</Col>
							{:else if nbArray(checkingAdhocResult)}
								<p>
									{$_('adhoc.founduser', { values: { num: checkingAdhocResult.length } })}
								</p>
								<p>
									{#each checkingAdhocResult as aUser}
										{aUser.cn}({aUser.eid})
									{/each}
								</p>
								<Button
									class="mt-1"
									color="primary"
									on:click={async (e) => {
										e.preventDefault();
										await createAdhoc();
									}}>
									{$_('button.sendadhocConfirm')}
								</Button>
								<Button
									class="mt-1"
									color="secondary"
									on:click={async (e) => {
										e.preventDefault();
										showAdhocForm = false;
									}}>
									{$_('button.sendadhocReconsider')}
								</Button>
							{/if}
						</Row>
					{/if}
					<!-- Transfer --->
					<TransferWork {work} />
				{:else}
					NOT Doable
					{#if work.revocable}
						<Row>
							<Col>
								<Button
									class="w-100"
									on:click={(e) => {
										e.preventDefault();
										_revokeWork();
									}}>
									{$_('button.revoke')}
								</Button>
							</Col>
						</Row>
					{/if}
				{/if}
			</div>
		{/if}
		<div class="my-3 py-2 kfk-highlight-2 text-wrap text-break">
			<WorkFile
				{work}
				wf={work.wf}
				title={$_('todo.pbo')}
				forWhat={'workflow'}
				forWhich={work.wfid}
				forKey="pbo" />
		</div>
		{#if work.wf.kvarsArr && work.wf.kvarsArr.length > 0}
			<!-- <span class="fs-4 text-center"> -->
			<!-- 	{$_('todo.workflowcontext')} -->
			<!-- </span> -->
			<div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 m-1">
				{#each work.wf.kvarsArr as kvar}
					{#if kvar.name[0] !== '$'}
						<KVarDisplay
							{work}
							{kvar} />
					{/if}
				{/each}
			</div>
			<!-- {#if work.comment} -->
			<!-- 	<CommentEntry bind:comment={work.comment} /> -->
			<!-- {/if} -->
		{/if}
		{#if work.rehearsal}
			<AccordionItem>
				<h4
					class="m-0 text-center"
					slot="header">
					{$_('todo.rehearsalinformation')}
				</h4>
				<div class="card w-100 my-3 p-3 mx-0">
					<div class="card-body">
						<sup class="fw-light fs-6">
							{work.nodeid === 'ADHOC' ? '/ adhoc' : ''}
							{#if work.rehearsal}
								/ <i class="bi-patch-check" />
								Rehearsal
							{/if}
							{TimeTool.fromNow(work.createdAt)}
						</sup>
						<p>
							Doable: {checkDoable()} status: {work.status} revocable: {work.revocable}
							Wfid: {work.wfid}
							Workid: {work.workid}
							Todoid: {work.todoid}
						</p>
						<p>{work.doer === user.eid ? '' : `Rehearsal for ${work.doer}`}</p>
						<div>
							<ul>
								Role: {work.role}
								{#each JSON.parse(Parser.base64ToCode(work.doer_string, '[]')) as aDoer}
									<li>
										{aDoer.cn}({aDoer.uid})
									</li>
								{/each}
							</ul>
						</div>
					</div>
				</div>
			</AccordionItem>
		{/if}
		{#if work.allowdiscuss && work.wf.allowdiscuss}
			<AccordionItem>
				<h4
					class="m-0 text-center"
					slot="header">
					{$_('comment.zone')}
				</h4>
				<div class="kfk-highlight-2 mt-0 p-3">
					<Row class="ms-0 me-1 my-1">
						<CommentInput
							bind:value={newComment}
							cmtid={'todo'}
							bind:this={theCommentInput}
							placeholder={'Discussion...'}
							on:comment={async (e) => {
								let res = await empApi.post(
									'comment/addforbiz',
									{
										objtype: 'TODO',
										objid: work.todoid,
										content: e.detail,
									},
									user.sessionToken,
								);
								if (res.error) {
									console.log(res.message);
								} else {
									work.comments.unshift(res.thisComment);
									for (let i = 0; i < work.comments.length; i++) {
										work.comments[i].transition = i === 0;
									}
									work.comments = work.comments;
									newComment = '';
								}
							}} />
					</Row>
					{#if work.comments && work.comments.length > 0}
						<Row
							class="mt-2 p-2"
							id="todo_comments">
							<Comments
								bind:comments={work.comments}
								bind:pointToOrigin />
						</Row>
					{/if}
				</div>
			</AccordionItem>
		{/if}<!-- if work(todo).allowdiscuss-->
	</div>
	<AccordionItem class="mt-5">
		<h4
			class="m-0 text-center"
			slot="header">
			{$_('todo.worklogof')}
		</h4>
		<ProcessTrack
			bind:wf={work.wf}
			bind:wfid={work.wfid}
			bind:workid={work.workid}
			bind:rehearsal={work.rehearsal}
			{onPrint}
			{workJustDone} />
	</AccordionItem>
</Accordion>
