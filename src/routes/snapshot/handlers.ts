import { Request, ResponseToolkit } from "@hapi/hapi";
import { Cheerio, CheerioAPI, Element } from "cheerio";
import Parser from "../../lib/Parser.js";
import { Template, TemplateType } from "../../database/models/Template.js";
import { Workflow, WorkflowType } from "../../database/models/Workflow.js";
import { Todo, TodoType } from "../../database/models/Todo.js";
import { Route, RouteType } from "../../database/models/Route.js";
import replyHelper from "../../lib/ReplyHelpers.js";
import { SVG, registerWindow } from "@svgdotjs/svg.js";
import { createSVGWindow } from "svgdom";
const nodeColor = { default: "#a7a6ff", hover: "#ff2726", ST_DONE: "#078806", ST_RUN: "#2726ff" };
const labelColor = { normal: "#2726ff" };
const theConnect_color = "#2726ff";
const theConnect_width = 2;

const drawCurve: boolean = true;

async function _svgDrawNodesConnect(
	canvas: any,
	lstr: string, //line string 直线模式的连接点
	_tstr: string,
	triangle: number[],
	caseValue: string,
	setValue: string,
	pbostatus: string,
	debug: boolean = false,
) {
	//eslint-disable-next-line  @typescript-eslint/no-this-alias
	try {
		let theConnect: any = null;
		let theTriangle: any = null;

		const theConnect_fill_color = theConnect_color;
		//如果存在同一ID的线,则重画这条线及其三角
		//如果不同在同一ID的线, then
		//如果同向线和反向线都不存在,则画新线条及其三角. 反向线是指与从fromNode指向toNode的线反向相反的线,也就是从toNode指向fromNode的线
		theConnect = canvas.path(lstr);
		theConnect.fill("none").stroke({
			width: theConnect_width,
			color: theConnect_color,
		});

		theTriangle = canvas.polygon(triangle).fill(theConnect_color).stroke({ width: 0 });
		theConnect.attr("case", caseValue);
		theConnect.attr("set", setValue);
		theConnect.attr("pbostatus", pbostatus);
		let caseDisplay = `${caseValue}${setValue ? "+++" : ""}`;
		if (caseDisplay !== "") {
			const connectText = canvas.text(function (add: any) {
				add.tspan(caseDisplay).dy(-2);
			});
			connectText.font({ family: "Helvetica", anchor: "start" });
			connectText.path(lstr).attr("startOffset", "40%");
		}
	} catch (error) {
		console.error(error);
	}
}
/**
 * 画线
 *
 * @param {string} fid - 起始节点的ID
 * @param {string} tid - 终点节点的ID
 * @param {number} fbp - 起始节点上的连接点的编号,从0-3, 分别代表左上右下
 * @param {number} tbp - 终点节点上的连接点的编号,从0-3
 * @param {number} fx - 连接点1的x坐标
 * @param {number} fy - 连接点1的y坐标
 * @param {number} tx - 连接点2的x坐标
 * @param {number} ty - 连接点2的y坐标
 */
async function svgConnectNode(
	canvas: any,
	fbp: number,
	tbp: number,
	fx: number,
	fy: number,
	tx: number,
	ty: number,
	caseValue: string,
	setValue: string,
	pbostatus: string,
	debug: boolean = false,
) {
	//eslint-disable-next-line  @typescript-eslint/no-this-alias
	let pstr = "";
	let lstr = "";
	let tstr = "";
	let x = [0, 0, 0, 0];
	let y = [0, 0, 0, 0];
	const ctrls = [0.4, 0.5, 0.5, 0.6];
	let triangle: number[] = [];
	const rad = 20;
	const ww = 10;
	let tri = 10;
	const tri_half = tri * 0.5;
	const tri_height = 17.3;
	let tsx = tx,
		tsy = ty - tri_height;
	//算出箭头三角形的三个顶点的坐标
	switch (tbp) {
		case 0: //从左侧指向
			tsx = tx - tri_height;
			tsy = ty;
			triangle = [tsx, tsy + tri_half, tx, ty, tsx, tsy - tri_half];
			break;
		case 1: //从顶部指向
			tsx = tx;
			tsy = ty - tri_height;
			triangle = [tsx - tri_half, tsy, tx, ty, tsx + tri_half, tsy];
			break;
		case 2: //从右侧指向
			tsx = tx + tri_height;
			tsy = ty;
			triangle = [tsx, tsy - tri_half, tx, ty, tsx, tsy + tri_half];
			break;
		case 3: //从下方指向
			tsx = tx;
			tsy = ty + tri_height;
			triangle = [tsx - tri_half, tsy, tx, ty, tsx + tri_half, tsy];
			break;
	}
	//画线不用画到重点，只需要画到三角形即可
	switch (tbp) {
		case 0:
			tx = tx - tri_height;
			break;
		case 1:
			ty = ty - tri_height;
			break;
		case 2:
			tx = tx + tri_height;
			break;
		case 3:
			ty = ty + tri_height;
			break;
	}
	let dis = 0;
	switch (fbp) {
		case 0:
			switch (tbp) {
				case 0:
					pstr = `M${fx} ${fy} C${fx - rad} ${fy} ${tx - rad} ${ty} ${tx} ${ty}`;
					break;
				case 1:
					pstr = `M${fx} ${fy} C${tx} ${fy} ${tx} ${ty} ${tx} ${ty}`;
					lstr = drawCurve
						? //? `M${fx} ${fy} C${tx} ${fy} ${fx} ${ty} ${tx} ${ty}`
						  `M${fx} ${fy} C${(tx + fx) * 0.5} ${fy} ${(fx + tx) * 0.5} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} C${tx} ${fy} ${fx} ${ty} ${tx} ${ty}`;
					//: `M${fx} ${fy} V${ty} H${tx}`;
					tstr = `M${tx} ${ty} C${fx} ${ty} ${tx} ${fy} ${fx} ${fy}`;
					dis = Math.abs(tx - fx);
					if (ty >= fy) {
						x = [3, 2, 0, 1].map((x) => fx - dis * ctrls[x]);
					} else {
						x = [0, 1, 3, 2].map((x) => fx - dis * ctrls[x]);
					}
					pstr =
						`M${fx},${fy + ww} ` +
						`L${fx},${fy - ww} ` +
						`C${x[0]},${fy - ww} ` +
						`${x[1]},${ty} ` +
						`${tx},${ty} ` +
						`C${x[2]},${ty} ` +
						`${x[3]},${fy + ww} ` +
						`${fx},${fy + ww} z`;
					break;
				case 2:
					dis = Math.abs(tx - fx);
					lstr = drawCurve
						? //? `M${fx} ${fy} C${tx} ${fy} ${fx} ${ty} ${tx} ${ty}`
						  `M${fx} ${fy} C${(tx + fx) * 0.5} ${fy} ${(tx + fx) * 0.5} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} C${tx} ${fy} ${fx} ${ty} ${tx} ${ty}`;
					//: `M${fx} ${fy} H${tx} V${ty}`;
					tstr = `M${tx} ${ty} C${tx} ${fy} ${fx} ${ty} ${fx} ${fy}`;
					if (ty >= fy) {
						x = [3, 2, 0, 1].map((x) => fx + dis * ctrls[x]);
					} else {
						x = [0, 1, 3, 2].map((x) => fx + dis * ctrls[x]);
					}
					pstr =
						`M${fx},${fy + ww} ` +
						`L${fx},${fy - ww} ` +
						`C${x[0]},${fy - ww} ` +
						`${x[1]},${ty} ` +
						`${tx},${ty} ` +
						`C${x[2]},${ty} ` +
						`${x[3]},${fy + ww} ` +
						`${fx},${fy + ww} z`;
					break;

				case 3:
					pstr = `M${fx} ${fy} C${tx} ${fy} ${tx} ${ty} ${tx} ${ty}`;
					break;
			}
			break;
		case 1:
			switch (tbp) {
				case 0:
					lstr = drawCurve
						? `M${fx} ${fy} C${fx} ${ty} ${tx} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} V${ty} H${tx}`;
					pstr = `M${fx} ${fy} C${fx} ${ty} ${tx} ${ty} ${tx} ${ty}`;
					break;
				case 1:
					pstr = `M${fx} ${fy} C${fx} ${ty - rad} ${tx} ${ty - rad} ${tx} ${ty}`;
					break;
				case 2:
					lstr = drawCurve
						? `M${fx} ${fy} C${fx} ${ty} ${tx} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} V${ty} H${tx}`;
					pstr = `M${fx} ${fy} C${fx} ${ty} ${tx} ${ty} ${tx} ${ty}`;
					break;
				case 3:
					lstr = `M${fx} ${fy} C${fx} ${ty} ${tx} ${fy} ${tx} ${ty}`;
					tstr = `M${tx} ${ty} C${tx} ${fy} ${fx} ${ty} ${fx} ${fy}`;
					dis = Math.abs(ty - fy);
					if (tx >= fx) {
						y = [3, 2, 0, 1].map((x) => fy - dis * ctrls[x]);
					} else {
						y = [0, 1, 3, 2].map((x) => fy - dis * ctrls[x]);
					}
					pstr =
						`M${fx + ww},${fy} ` +
						`L${fx - ww},${fy} ` +
						`C${fx - ww}, ${y[0]} ` +
						`${tx}, ${y[1]} ` +
						`${tx},${ty} ` +
						`C${tx}, ${y[2]} ` +
						`${fx + ww}, ${y[3]} ` +
						`${fx + ww},${fy} z`;
					break;
			}
			break;
		case 2:
			switch (tbp) {
				case 0: //从右侧 指向  左侧
					dis = Math.abs(tx - fx);
					lstr = drawCurve
						? //? `M${fx} ${fy} C${tx} ${fy} ${fx} ${ty} ${tx} ${ty}`
						  `M${fx} ${fy} C${Math.round((tx + fx) * 0.5)} ${fy} ${Math.round(
								(tx + fx) * 0.5,
						  )} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} C${tx} ${fy} ${fx} ${ty} ${tx} ${ty}`;
					//: `M${fx} ${fy} H${tx} V${ty}`;
					tstr = `M${tx} ${ty} C${tx} ${fy} ${fx} ${ty} ${fx} ${fy}`;
					if (ty >= fy) {
						x = [3, 2, 0, 1].map((x) => fx + dis * ctrls[x]);
					} else {
						x = [0, 1, 3, 2].map((x) => fx + dis * ctrls[x]);
					}
					pstr =
						`M${fx},${fy + ww} ` +
						`L${fx},${fy - ww} ` +
						`C${x[0]},${fy - ww} ` +
						`${x[1]},${ty} ` +
						`${tx},${ty} ` +
						`C${x[2]},${ty} ` +
						`${x[3]},${fy + ww} ` +
						`${fx},${fy + ww} z`;
					break;
				case 1: //从右侧 指向 顶部
					lstr = drawCurve
						? `M${fx} ${fy} C${tx} ${fy} ${tx} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} H${tx} V${ty}`;
					tstr = `M${tx} ${ty} C${tx} ${ty} ${tx} ${fy} ${fx} ${fy}`;
					dis = Math.abs(tx - fx);
					if (ty >= fy) {
						x = [3, 2, 0, 1].map((x) => fx + dis * ctrls[x]);
					} else {
						x = [0, 1, 3, 2].map((x) => fx + dis * ctrls[x]);
					}
					pstr =
						`M${fx},${fy + ww} ` +
						`L${fx},${fy - ww} ` +
						`C${x[0]},${fy - ww} ` +
						`${tx},${ty} ` +
						`${tx},${ty} ` +
						`C${tx},${ty} ` +
						`${x[3]},${fy + ww} ` +
						`${fx},${fy + ww} z`;
					break;
				case 2:
					dis = Math.abs(tx - fx);
					lstr = drawCurve
						? `M${fx} ${fy} C${fx + rad} ${fy} ${tx + rad} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} H${tx} V${ty}`;
					tstr = `M${tx} ${ty} C${tx + rad} ${ty} ${fx + rad} ${fy} ${fx} ${fy}`;
					if (ty >= fy) {
						x = [3, 2, 0, 1].map((x) => fx + dis * ctrls[x]);
					} else {
						x = [0, 1, 3, 2].map((x) => fx + dis * ctrls[x]);
					}
					pstr =
						`M${fx},${fy + ww} ` +
						`L${fx},${fy - ww} ` +
						`C${tx + rad},${fy - ww} ` +
						`${tx + rad},${ty} ` +
						`${tx},${ty} ` +
						`C${tx + rad},${ty} ` +
						`${tx + rad},${fy + ww} ` +
						`${fx},${fy + ww} z`;
					break;
				case 3:
					lstr = drawCurve
						? `M${fx} ${fy} C${tx} ${fy} ${tx} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} H${tx} V${ty}`;
					pstr = `M${fx} ${fy} C${tx} ${fy} ${tx} ${ty} ${tx} ${ty}`;
					break;
			}
			break;
		case 3:
			switch (tbp) {
				case 0:
					lstr = drawCurve
						? `M${fx} ${fy} C${fx} ${ty} ${tx} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} V${ty} H${tx}`;
					pstr = `M${fx} ${fy} C${fx} ${ty} ${tx} ${ty} ${tx} ${ty}`;
					break;
				case 1:
					lstr = `M${fx} ${fy} C${fx} ${ty} ${tx} ${fy} ${tx} ${ty}`;
					tstr = `M${tx} ${ty} C${tx} ${fy} ${fx} ${ty} ${fx} ${fy}`;
					dis = Math.abs(ty - fy);
					if (tx >= fx) {
						y = [3, 2, 0, 1].map((x) => fy + dis * ctrls[x]);
					} else {
						y = [0, 1, 3, 2].map((x) => fy + dis * ctrls[x]);
					}
					pstr =
						`M${fx + ww},${fy} ` +
						`L${fx - ww},${fy} ` +
						`C${fx - ww}, ${y[0]} ` +
						`${tx}, ${y[1]} ` +
						`${tx},${ty} ` +
						`C${tx}, ${y[2]} ` +
						`${fx + ww}, ${y[3]} ` +
						`${fx + ww},${fy} z`;
					break;
				case 2:
					lstr = drawCurve
						? `M${fx} ${fy} C${fx} ${ty} ${tx} ${ty} ${tx} ${ty}`
						: `M${fx} ${fy} V${ty} H${tx}`;
					pstr = `M${fx} ${fy} C${fx} ${ty} ${tx} ${ty} ${tx} ${ty}`;
					break;
				case 3:
					pstr = `M${fx} ${fy} C${fx} ${fy + rad} ${tx} ${ty + rad} ${tx} ${ty}`;
					break;
			}
			break;
	}
	await _svgDrawNodesConnect(canvas, lstr, tstr, triangle, caseValue, setValue, pbostatus, debug);
}

function calculateNodeConnectPoints(nodesInfo: any, index: number) {
	const divLeft = nodesInfo[index].left;
	const divTop = nodesInfo[index].top;
	const divWidth = nodesInfo[index].width;
	const divHeight = nodesInfo[index].height;

	const pos = {
		center: {
			x: Math.round(divLeft + divWidth * 0.5),
			y: Math.round(divTop + divHeight * 0.5),
		},
		points: [
			{
				x: Math.round(divLeft),
				y: Math.round(divTop + divHeight * 0.5),
			},
			{
				x: Math.round(divLeft + divWidth * 0.5),
				y: Math.round(divTop),
			},
			{
				x: Math.round(divLeft + divWidth),
				y: Math.round(divTop + divHeight * 0.5),
			},
			{
				x: Math.round(divLeft + divWidth * 0.5),
				y: Math.round(divTop + divHeight),
			},
		],
	};
	return pos;
}

async function drawConnect(
	canvas: typeof SVG,
	nodesInfo: any,
	indexOfA: number,
	indexOfB: number,
	caseValue: string,
	setValue: string,
	pbostatus: string,
	_posLimitA = [0, 1, 2, 3], //eslint-disable-line
	_posLimitB = [0, 1, 2, 3], //eslint-disable-line
) {
	//eslint-disable-next-line  @typescript-eslint/no-this-alias
	const APos = calculateNodeConnectPoints(nodesInfo, indexOfA);
	const BPos = calculateNodeConnectPoints(nodesInfo, indexOfB);
	let ANodeConnectPointIndex = 0;
	let BNodeConnectPointIndex = 0;

	//A是起始点， B是结束点
	//points是节点的四个周边链接点位置，从0-3分别对应左上右下四个点
	//ANodeConnectPointIndex, BNodeConnectPointIndex是指起始点从左上右下四个点中哪个点来链接
	if (APos.points[0].x > BPos.points[2].x) {
		//If A is on the right of B
		if (drawCurve) {
			ANodeConnectPointIndex = 0; //Draw line from "left of A" to "right of B"
			BNodeConnectPointIndex = 2;
		} else {
			if (APos.points[1].y > BPos.points[3].y) {
				// the 2nd Quarter
				ANodeConnectPointIndex = 1;
				BNodeConnectPointIndex = 2;
			} else if (APos.points[3].y < BPos.points[1].y) {
				// the 3nd Quarter
				ANodeConnectPointIndex = 3;
				BNodeConnectPointIndex = 2;
			} else {
				ANodeConnectPointIndex = 0;
				BNodeConnectPointIndex = 2;
			}
		}
	} else if (APos.points[2].x < BPos.points[0].x) {
		//If A is on the left of B
		if (drawCurve) {
			//If curve, draw curve from A:Right to B:Left
			ANodeConnectPointIndex = 2;
			BNodeConnectPointIndex = 0;
		} else {
			//If straight line and...
			if (APos.points[1].y > BPos.points[3].y) {
				//in 1st Quarter
				ANodeConnectPointIndex = 1;
				BNodeConnectPointIndex = 0;
			} else if (APos.points[3].y < BPos.points[1].y) {
				//in 4th Quarter
				ANodeConnectPointIndex = 3;
				BNodeConnectPointIndex = 0;
			} else {
				ANodeConnectPointIndex = 2;
				BNodeConnectPointIndex = 0;
			}
		}
	} else if (APos.points[2].y > BPos.points[2].y) {
		ANodeConnectPointIndex = 1;
		BNodeConnectPointIndex = 3;
	} else if (APos.points[2].y < BPos.points[2].y) {
		ANodeConnectPointIndex = 3;
		BNodeConnectPointIndex = 1;
	} else {
		// 不画线
		ANodeConnectPointIndex = 0;
		BNodeConnectPointIndex = -1;
	}

	if (BNodeConnectPointIndex >= 0) {
		//只有当BNodeConnectPointIndex>=0时画线
		await svgConnectNode(
			canvas,
			ANodeConnectPointIndex,
			BNodeConnectPointIndex,
			APos.points[ANodeConnectPointIndex].x,
			APos.points[ANodeConnectPointIndex].y,
			BPos.points[BNodeConnectPointIndex].x,
			BPos.points[BNodeConnectPointIndex].y,
			caseValue,
			setValue,
			pbostatus,
			indexOfA === 1 && indexOfB === 3,
		);
	}
	return [ANodeConnectPointIndex, BNodeConnectPointIndex];
}

async function redrawLinkLines(
	canvas: any,
	tpRoot: any,
	nodesInfo: any,
	fromIndex: any,
	allowConnectPoints = [[2], [0], [2], [0]],
) {
	//eslint-disable-next-line  @typescript-eslint/no-this-alias
	const fromId = nodesInfo[fromIndex].id;
	const tplLinks = tpRoot.find(`.link[from="${fromId}"]`);

	//画出从当前node:fromNode到所有"连接到"节点的连接线
	for (let i = 0; i < tplLinks.length; i++) {
		const thisLink = tplLinks.eq(i);
		const toId = thisLink.attr("to");
		const toIndex = nodesInfo.findIndex((item: any) => item.id === toId);
		let caseValue = thisLink.attr("case");
		caseValue = Parser.isEmpty(caseValue) ? "" : caseValue;
		let setValue = thisLink.attr("set");
		setValue = Parser.isEmpty(setValue) ? "" : setValue;
		let pbostatus = thisLink.attr("pbostatus");
		pbostatus = Parser.isEmpty(pbostatus) ? "" : pbostatus;
		await drawConnect(
			canvas,
			nodesInfo,
			fromIndex,
			toIndex,
			caseValue,
			setValue,
			pbostatus,
			allowConnectPoints[0],
			allowConnectPoints[1],
		);
		//anchorPair返回一个包含两个数字的数组,第一个数字标识父节点的锚点位置,第二个数字标识子节点的锚点位置
	}
}

async function getSvg(tenant: string, objtype: string, objid: string) {
	const window = createSVGWindow();
	const document = window.document;
	registerWindow(window, document);
	let canvas: any = SVG(document.documentElement);
	canvas.clear();

	let IO: CheerioAPI;
	let tpRoot: Cheerio<Element>;
	let allNodes: Cheerio<Element>;
	let todos: TodoType[];
	let routes: RouteType[];
	if (objtype === "tpl") {
		const tpl: TemplateType = await Template.findOne({ tenant: tenant, tplid: objid });
		IO = await Parser.parse(tpl.doc);
	} else {
		const wf: WorkflowType = await Workflow.findOne({ tenant: tenant, wfid: objid });
		IO = await Parser.parse(wf.doc);
		todos = await Todo.find({ tenant: tenant, wfid: objid }, { nodeid: 1, status: 1 });
		routes = await Route.find({ tenant: tenant, wfid: objid }, { from_nodeid: 1, to_nodeid: 1 });
	}
	tpRoot = IO("div.template");
	allNodes = tpRoot.find("div.node");

	const nodesInfo = [];
	for (let i = 0; i < allNodes.length; i++) {
		const node = allNodes.eq(i);
		const id = node.attr("id");
		const left = node.css("left") ? Number(node.css("left")?.slice(0, -2)) : -1;
		const top = node.css("top") ? Number(node.css("top")?.slice(0, -2)) : -1;
		const width = node.css("width") ? Number(node.css("width")?.slice(0, -2)) : 24;
		const height = node.css("height") ? Number(node.css("height")?.slice(0, -2)) : 24;
		const label = node.find("p").text();
		nodesInfo.push({ id, label, left, top, width, height, x: left + 16, y: top + 16, node });
	}
	if (nodesInfo[0].left < 0) {
		nodesInfo[0].left = nodesInfo[1].left - 120;
		nodesInfo[0].top = nodesInfo[1].top;
		nodesInfo[0].x = nodesInfo[0].left + 16;
		nodesInfo[0].y = nodesInfo[0].top + 16;
	}
	const viewpoints = [
		Math.min(...nodesInfo.map((p) => p.x - 32 - 20)),
		Math.min(...nodesInfo.map((p) => p.y - 32)),
		Math.max(...nodesInfo.map((p) => p.x + 32 + 20)),
		Math.max(...nodesInfo.map((p) => p.y + 32 + 20)),
	];
	const svgWidth = viewpoints[2] - viewpoints[0];
	const svgHeight = viewpoints[3] - viewpoints[1];

	canvas.attr("style", "background-color: #DDDDDD");
	canvas.attr("preserveAspectRatio", "none");

	canvas.viewbox(viewpoints[0], viewpoints[1], svgWidth, svgHeight);
	//theSVGClone.viewbox(0, 0, svgWidth, svgHeight);
	canvas.size(svgWidth, svgHeight);

	// canvas.rect(svgWidth, svgHeight).fill("yellow").move(viewpoints[0], viewpoints[1]);
	function getTodoStatus(nodeid: string) {
		for (let i = 0; i < todos.length; i++) {
			if (todos[i].nodeid === nodeid) {
				return todos[i].status;
			}
		}
		return "";
	}
	for (let i = 0; i < nodesInfo.length; i++) {
		await redrawLinkLines(canvas, tpRoot, nodesInfo, i);
		const svgNode = canvas.group();
		svgNode.circle(32);
		svgNode.addClass("svgnode");
		if (objtype === "wf") {
			let todoStatus = nodesInfo[i].id === "start" ? "ST_DONE" : getTodoStatus(nodesInfo[i].id);
			if (todoStatus) {
				svgNode.addClass(todoStatus);
			}
		}
		svgNode.center(nodesInfo[i].x, nodesInfo[i].y);
		const svgText = canvas.text(nodesInfo[i].label);
		svgText
			.center(nodesInfo[i].x, nodesInfo[i].y + 24)
			.font({ fill: labelColor["normal"], family: "Arial; SimSun" });
	}
	canvas.style(".node:hover", { fill: nodeColor["hover"] });
	canvas.style(".node.ST_IGNORED", { fill: nodeColor["ST_IGNORED"] });
	canvas.style(".node.ST_DONE:hover", { fill: nodeColor["hover"] });
	canvas.style(".node.ST_RUN:hover", { fill: nodeColor["hover"] });
	canvas.style("@import url(/css/snapshot.css)");
	// canvas.style(".link.DONE", { fill: linkColor["DONE"] });

	return canvas.svg();
}

async function getSvgdata(tenant: string, objtype: string, objid: string) {
	let IO: CheerioAPI;
	let tpRoot: Cheerio<Element>;
	let allNodes: Cheerio<Element>;

	let todos: TodoType[];
	let routes: RouteType[];
	const nodesInfo = [];

	if (objtype === "tpl") {
		const tpl: TemplateType = await Template.findOne({ tenant: tenant, tplid: objid });
		IO = await Parser.parse(tpl.doc);
	} else {
		const wf: WorkflowType = await Workflow.findOne({ tenant: tenant, wfid: objid });
		IO = await Parser.parse(wf.doc);
		todos = await Todo.find({ tenant: tenant, wfid: objid }, { nodeid: 1, status: 1 });
		routes = await Route.find({ tenant: tenant, wfid: objid }, { from_nodeid: 1, to_nodeid: 1 });
	}
	tpRoot = IO("div.template");
	allNodes = tpRoot.find("div.node");

	for (let i = 0; i < allNodes.length; i++) {
		const node = allNodes.eq(i);
		const id = node.attr("id");
		const left = node.css("left") ? Number(node.css("left")?.slice(0, -2)) : -1;
		const top = node.css("top") ? Number(node.css("top")?.slice(0, -2)) : -1;
		const width = node.css("width") ? Number(node.css("width")?.slice(0, -2)) : 24;
		const height = node.css("height") ? Number(node.css("height")?.slice(0, -2)) : 24;
		const label = node.find("p").text();
		nodesInfo.push({ id, label, left, top, width, height, x: left + 16, y: top + 16, node });
	}
	if (nodesInfo[0].left < 0) {
		nodesInfo[0].left = nodesInfo[1].left - 120;
		nodesInfo[0].top = nodesInfo[1].top;
		nodesInfo[0].x = nodesInfo[0].left + 16;
		nodesInfo[0].y = nodesInfo[0].top + 16;
	}

	// canvas.rect(svgWidth, svgHeight).fill("yellow").move(viewpoints[0], viewpoints[1]);
	function getTodoStatus(nodeid: string) {
		for (let i = 0; i < todos.length; i++) {
			if (todos[i].nodeid === nodeid) {
				return todos[i].status;
			}
		}
		return "";
	}
	for (let i = 0; i < nodesInfo.length; i++) {
		if (objtype === "wf") {
			nodesInfo[i].todoStatus =
				nodesInfo[i].id === "start" ? "ST_DONE" : getTodoStatus(nodesInfo[i].id);
		}
	}

	return nodesInfo;
}

async function TplSnapshot(req: Request, h: ResponseToolkit) {
	try {
		const CRED = req.auth.credentials as any;
		let tenant = CRED.tenant._id;
		// let myEid = CRED.employee.eid;

		return h
			.response(await getSvg(tenant, "tpl", req.params.tplid))
			.header("cache-control", "no-cache")
			.header("Pragma", "no-cache")
			.header("Access-Control-Allow-Origin", "*")
			.header("Content-Type", "image/svg+xml");
	} catch (err) {
		console.error(err);
		return h.response(replyHelper.constructErrorResponse(err)).code(500);
	}
}

async function TplSnapdata(req: Request, h: ResponseToolkit) {
	try {
		const CRED = req.auth.credentials as any;
		let tenant = CRED.tenant._id;
		// let myEid = CRED.employee.eid;

		return h
			.response(await getSvgdata(tenant, "tpl", req.params.tplid))
			.header("cache-control", "no-cache")
			.header("Pragma", "no-cache")
			.header("Access-Control-Allow-Origin", "*")
			.header("Content-Type", "image/svg+xml");
	} catch (err) {
		console.error(err);
		return h.response(replyHelper.constructErrorResponse(err)).code(500);
	}
}

async function WfSnapshot(req: Request, h: ResponseToolkit) {
	try {
		const CRED = req.auth.credentials as any;
		let tenant = CRED.tenant._id;
		// let myEid = CRED.employee.eid;

		return h
			.response(await getSvg(tenant, "wf", req.params.wfid))
			.header("cache-control", "no-cache")
			.header("Pragma", "no-cache")
			.header("Access-Control-Allow-Origin", "*")
			.header("Content-Type", "image/svg+xml");
	} catch (err) {
		console.error(err);
		return h.response(replyHelper.constructErrorResponse(err)).code(500);
	}
}

async function WfSnapdata(req: Request, h: ResponseToolkit) {
	try {
		const CRED = req.auth.credentials as any;
		let tenant = CRED.tenant._id;
		// let myEid = CRED.employee.eid;

		return h
			.response(await getSvgdata(tenant, "wf", req.params.wfid))
			.header("cache-control", "no-cache")
			.header("Pragma", "no-cache")
			.header("Access-Control-Allow-Origin", "*")
			.header("Content-Type", "image/svg+xml");
	} catch (err) {
		console.error(err);
		return h.response(replyHelper.constructErrorResponse(err)).code(500);
	}
}

export default {
	TplSnapshot,
	WfSnapshot,
	TplSnapdata,
	WfSnapdata,
};
