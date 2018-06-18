import getName from './namegenerator.js';
import log from './logger.js';
import extendDefaultOptions from './options.js';

import { InsufficientBalanceError } from './errors.js';

const getRandomNumber = function(max) {
	return Math.floor(Math.random() * max);
}

/**
 * TODO:
 */
class Beadnet {

	/**
	 * Create a new BeadNet chart.
	 * @param {Object} options 
	 */
	constructor(options) {
		this._opt = extendDefaultOptions(options);
		log.debug("initializing beadnet with options: ", this._opt);

		/* find the parent container DOM element and insert an SVG */
		this.container = document.querySelector(this._opt.container.selector);
		this.svg = d3.select(this.container)
			.append("svg")
			.attr("class", "beadnet");
		
		this.updateSVGSize();

		/* create svg root element called with class "chart" and initial  */
		this.chart = this.svg.append("g")
			.attr("class", "chart")
			.attr("transform", "translate(0,0) scale(1)");

		/* create a SVG-container-element for all nodes and all channels */
		this.channelContainer = this.chart.append("g").attr("class", "channels");
		this.nodeContainer = this.chart.append("g").attr("class", "nodes");
		
		this._nodes = [];
		this._channels = [];
		this.beadElements = [];

		this.simulation = this._createSimulation();
		
		this.updateSimulationCenter();

		this.behaviors = this.createBehaviors();
		this.svg.call(this.behaviors.zoom);

		this._updateNodes();
		
		window.addEventListener("resize", this.onResize.bind(this));
	}

	/**
	 * Return the node element with the given id.
	 * @param {String} id - the id of the node to find.
	 * @returns {Node|undefinded}
	 */
	_getNodeById(id) {
		return d3.map(this._nodes, (d) => { return d.id; }).get(id);
	}

	/**
	 * @returns {d3.forceSimulation} simulation
	 * @private
	 */
	_createSimulation() {
		// return d3.forceSimulation()
			//.nodes(this._nodes)
			// .alphaDecay(0.1)
			// .force("x", d3.forceX().strength(0))
			// .force("y", d3.forceY().strength(1))
			// .force("charge", d3.forceManyBody().strength(-1000).distanceMin(this.forceDistance).distanceMax(3*this.forceDistance))
			// .force("collide", d3.forceCollide(this.forceDistance/6))
			// .force("link", d3.forceLink(this._channels).distance(this.forceDistance))
			// .force("center", d3.forceCenter(this.width / 2, this.height / 2))
			// .alphaTarget(0)
			// .on("tick", this._ticked.bind(this));

		return d3.forceSimulation(this._nodes)
			.force("charge", d3.forceManyBody().strength(-5000))
			.force("link", d3.forceLink(this._channels).strength(0.01).distance(this.forceDistance))
			.force("x", d3.forceX())
			.force("y", d3.forceY())
			.alphaTarget(0)
			.on("tick", this._ticked.bind(this));
	}

	/**
	 * TODO
	 */
	updateSVGSize() {
		this.width = +this.container.clientWidth;
		this.height = +this.container.clientHeight;
		this.forceDistance = (this.width + this.height)*.1;
		this.svg
			.attr("width", this.width)
			.attr("height", this.height);
	}

	/**
	 * TODO
	 */
	onResize() {
		this.updateSVGSize();
		this.updateSimulationCenter();
		this.createBehaviors();
	}
	
	/**
	 * 
	 */
	createBehaviors() {
		return {

			zoom: d3.zoom()
				.scaleExtent([0.1, 5, 4])
				.on('zoom', () => this.chart.attr('transform', d3.event.transform)),

			drag: d3.drag()
				.on("start", this._onDragStart.bind(this))
				.on("drag", this._onDragged.bind(this))
				.on("end", this._onDragendEnd.bind(this))
		}
	}

	updateSimulationCenter() {
		const centerX = this.svg.attr('width') / 2;
		const centerY = this.svg.attr('height') / 2;
		this.simulation
			.force("center", d3.forceCenter(centerX, centerY))
			.restart();
	}

	/**
	 * Update DOM elements after this._nodes has been updated.
	 * This creates the SVG repensentation of a node.
	 * 
	 * @private
	 */
	_updateNodes() {
		this._nodeElements = this.nodeContainer
			.selectAll(".node")
			.data(this._nodes, (data) => data.id);

		this._nodeElements.exit()
			.remove();

		var nodeParent = this._nodeElements.enter()
			.append("g")
				.attr("class", "node")
				.attr("id", (data) => data.id)
				.attr("balance", (data) => data.balance)
				.style("stroke", this._opt.nodes.strokeColor)
				.style("stroke-width", this._opt.nodes.strokeWidth);

		nodeParent.append("circle")
				.attr("r",  this._opt.nodes.radius)
				.attr("fill", function(data) { return data.color; })
				.style("cursor", "pointer");

		nodeParent.append("text")
			.style("stroke-width", 0.5)
			.attr("stroke", this._opt.nodes.strokeColor)
			.attr("fill", this._opt.nodes.strokeColor)
			.attr("font-family", "sans-serif")
			.attr("font-size", "15px")
			.attr("y", "5px")
			.attr("text-anchor", "middle")
			.attr("pointer-events", "none")
			.text((d) => d[this._opt.nodes.text]);

		nodeParent.append("title")
			.text((d) => d.id);
		
		nodeParent
			.call(this.behaviors.drag);

		this.simulation
			.nodes(this._nodes)
			.alpha(1)
			.restart();

		this._nodeElements = this.nodeContainer
			.selectAll(".node")

		return this._nodeElements;
	}

	/**
	 * Adds a new node to the network.
	 * 
	 * @param {Node} node 
	 * @returns {BeatNet}
	 */
	addNode(node) {
		node = node || {};

		/* initialize with default values */
		node.id = node.id || getName();
		node.channelCount = 0;
		node.color = node.color || this._opt.colorScheme(this._nodes.length % 10);

		/* save to nodes array */
		this._nodes.push(node);
		this._updateNodes();

		/* make this funktion chainable */
		return this;
	}

	/**
	 * Adds multible new nodes to the network.
	 * 
	 * @param {Array<Node>} nodes
	 * @returns {BeatNet}
	 */
	addNodes(nodes) {
		nodes.forEach((node) => this.addNode(node));

		/* make this funktion chainable */
		return this;
	}

	/**
	 * Removes a the node with the given id from the network.
	 * 
	 * @param {String} nodeId 
	 * @returns {BeatNet}
	 */
	removeNode(nodeId) {
		this._nodes = this._nodes.filter(node => node.id != nodeId);
		this._updateNodes();	
		
		return this;
	};

	/**
	 * Create new nodes with random names.
	 * @param {Integer} [count=1] - how many nodes.
	 * @returns {Node}
	 */
	createRandomNodes(count) {
		if ((typeof count !== "undefined" && typeof count !== "number") || count < 0) {
			throw new TypeError('parameter count must be a positive number');
		}
		return Array.from(new Array(count), (x) => {
			return {
				id: getName(),
				balance: getRandomNumber(10)
			};
		});
	}

	/**
	 * TODO: getRandomNode
	 * @returns {Node}
	 */
	getRandomNode() {
		return this._nodes[getRandomNumber(this._nodes.length)];
	}

	/**
	 * TODO:
	 * @private
	 * @returns {d3.selection} this._channelElements
	 */
	_updateChannels() {
		const opt = this._opt;

		this._channelElements = this.channelContainer.selectAll(".channel").data(this._channels);

		/* remove channels that no longer exist */
		this._channelElements.exit().remove()

		/* create new svg elements for new channels */
		var channelRoots = this._channelElements.enter().append("g")
				.attr("class", "channel")
				.attr("id", (d) => d.id)
				.attr("source-balance", (d) => d.sourceBalance)
				.attr("target-balance", (d) => d.targetBalance)
				.attr("source-id", (d) => d.source.id)
				.attr("target-id", (d) => d.target.id);

		channelRoots.append("path")
				.attr("class", "path")
				.style("stroke-width", opt.channels.strokeWidth)
				.style("stroke", opt.channels.color)
				.style("fill", "none");

			let sourceBalance = +channelRoots.attr("source-balance");
			let targetBalance = +channelRoots.attr("target-balance");
			var beadArray = Array.from(new Array(sourceBalance), (x, index) => {
				return {
					state: 0,
					index: index
				}
			});
			beadArray.push(...Array.from(new Array(targetBalance), (x, index) => {
				return {
					state: 1,
					index: sourceBalance+index
				}
			}));
			console.log(beadArray);
		
			let beadElements = channelRoots.selectAll(".bead").data(beadArray);
			
			beadElements.exit().remove();
			
			let beadElement = beadElements.enter().append("g")
				.attr("class", "bead")	
				.attr("channel-state", (d) => d.state) //TODO: 0 or 1?
				.attr("index", (d) => d.index)
		
				beadElement.append("circle")
				.attr("r",  opt.beads.radius)
				.style("stroke-width", opt.beads.strokeWidth)
				.style("fill", opt.beads.color)
				.style("stroke", opt.beads.strokeColor);

			if (opt.beads.showIndex) {
				/* show bead index */
				beadElement.append("text")
					.attr("class", "bead-text")	
					.style("stroke-width", 0.2)
					.attr("stroke", opt.container.backgroundColor)
					.attr("fill", opt.container.backgroundColor)
					.attr("font-family", "sans-serif")
					.attr("font-size", "8px")
					.attr("y", "2px")
					.attr("text-anchor", "middle")
					.attr("pointer-events", "none")
					.text((d) => d.index);
			}

		/* update this._paths; needed in this._ticked */
		this._paths = this.channelContainer.selectAll(".channel .path");
		this.beadElements = this.channelContainer.selectAll(".channel .bead");

		return this._channelElements;
	}

	_getUniqueChannelId(channelInfos) {
		const channelBalance = (channelInfos.sourceBalance || 0) + (channelInfos.targetBalance || 0);
		let nonce = 0;
		let id = `channel${channelInfos.source}${channelBalance}${channelInfos.target}${nonce}`;
		while (this._channels.filter((channel) => channel.id == id).length > 0) {
			nonce++;
			id = `channel${channelInfos.source}${channelBalance}${channelInfos.target}${nonce}`;
		}
		return id;
	}

	/**
	 * TODO: addChannel
	 * @param {Channel} channel 
	 */
	addChannel(channel) {;
		const source = this._getNodeById(channel.source);
		const target = this._getNodeById(channel.target);
		const id = this._getUniqueChannelId(channel);
		this._channels.push({
			id: id,
			source: source, 
			target: target,
			sourceBalance: channel.sourceBalance,
			targetBalance: channel.targetBalance
		});

		source.channelCount = source.channelCount + 1;
		target.channelCount = target.channelCount + 1;

		this._updateChannels();

		this.simulation.force("link").links(this._channels)
		
		this.simulation.alpha(1).restart();
	}

	/**
	 * TODO: 
	 * @param {*} channels 
	 * @returns TODO:
	 */
	addChannels(channels) {
		channels.forEach((channel) => this.addChannel(channel));
	}

		/**
	 * Create new nodes with random names.
	 * @param {Integer} [count=1] - how many nodes.
	 * @returns {Node}
	 */
	createRandomChannels(count, unique) {
		// if ((typeof count !== "undefined" && typeof count !== "number") || count < 0) {
		// 	throw new TypeError('parameter count must be a positive number');
		// }
		let channels = Array.from(new Array(count), (x) =>  {
			let source = this.getRandomNode();
			let target = this.getRandomNode();

			if (unique) {
				let killCounter = 0;
				while((source.id == target.id || this.getChannels(source.id, target.id).length > 0) && killCounter < this._channels.length) {
					console.log("IGNORED: ", source.id, "->", target.id, killCounter);
					source = this.getRandomNode();
					target = this.getRandomNode();
					killCounter++;
				}
			}
			console.log("New Channel: ", source.id, "->", target.id);

			let sourceBalance = getRandomNumber(6);
			let targetBalance = getRandomNumber(6);
			sourceBalance = (!sourceBalance && !targetBalance) ?  getRandomNumber(6)+1 : sourceBalance;

			let channel = {
				source: source.id, 
				target: target.id,
				sourceBalance: sourceBalance,
				targetBalance: targetBalance
			}
			channel.id = this._getUniqueChannelId(channel);
			return channel;
		});
		return channels;
	}

	/**
	* TODO:
	*/
	getRandomChannel() {
		return this._channels[getRandomNumber(this._channels.length)];
	}

	getChannelCount() {
		return this._channels.length;
	}

	/**
	 * TODO: 
	 * @returns TODO:
	 */
	removeChannel(sourceId, targetId) {
		this._channels = this._channels.filter((channel) => (channel.source.id !== sourceId && channel.target.id !== targetId));
		this._updateChannels();	
		
		return this;
	}

	getChannels(sourceId, targetId) {
		return this._channels.filter((channel) => 
			(channel.source.id == sourceId && channel.target.id == targetId) ||
			(channel.target.id == sourceId && channel.source.id == targetId)
		);
	}

	_positionBeat(b) {
		console.log("_positionBeat ", b);
		const bead = d3.select(b);
		const index = bead.attr("index");
		const state = bead.attr("channel-state"); // state 0=source, 1=target
		const channel = d3.select(bead.node().parentNode);
		const path = channel.select('path');
		const sourceBalance = +channel.attr("source-balance");
		const targetBalance = +channel.attr("target-balance");
		const balance = sourceBalance + targetBalance;
		const distanceBetweenBeads = this._opt.beads.distance + this._opt.beads.spacing;
		const channelPadding = this._opt.beads.firstPosition +  this._opt.beads.spacing;
	
		var startPosition = channelPadding + (index * distanceBetweenBeads);	
		var endPosition = channelPadding + ((balance-1-index) * distanceBetweenBeads);
		var totalDistance = path.node().getTotalLength() - startPosition - endPosition;
	
		const beadPosition = path.node().getPointAtLength(startPosition + state * totalDistance);
		return `translate(${beadPosition.x},${beadPosition.y})`;
	}

	/**
	 * TODO: 
	 * @private
	 */
	_ticked() {
		if (this._nodeElements) {
			this._nodeElements.attr("transform", (data) => `translate(${data.x},${data.y})`);
		}
		if (this._paths) {
			this._paths.attr("d", (d) => {
				// var count = this._channels.filter((c) => ((d.source.id === d.source.id) && (d.target.id === d.target.id))).length;
				// //console.log(count);

				// if (count <= 1) {
					return `M${d.source.x},${d.source.y} ${d.target.x},${d.target.y}`;
				// } else {
				// 	var dx = d.target.x - d.source.x;
				// 	var dy = d.target.y - d.source.y;
				// 	var dr = Math.sqrt((dx*dx+count) + (dy*dy+count));
				// 	return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
				// }
			});
		}
		this.tickedBeads();
	}

	tickedBeads() {
		var that = this;
		if (!this.beadElements || this.beadElements.length === 0|| this.beadElements.empty()) {
			return;
		}
		this.beadElements.attr("transform", function(d) {
			return that._positionBeat(this);
		});
	}
	
	animateBead(bead, delay) {
		var that = this;
		return bead
			.transition()
				.delay(delay)	
				//.ease(d3.easeLinear)
				.ease(d3.easeQuadInOut)
				.duration(1000)
				.attrTween("channel-state", function(a) { return function(t) { 
					that.tickedBeads();
					return t;
				}});
	}

	moveBeads(sourceId, targetId, beadCount) {
		const channels = this.getChannels(sourceId, targetId);

		const channel = channels[0];

		// TODO: get channel with source and target
		const channelElement = d3.select(`#${channel.id}`);

		const balance = channel.sourceBalance + channel.targetBalance;
	
		var startIndex = channel.sourceBalance - beadCount;
		var endIndex = balance-1 - channel.targetBalance;
		for (let i=endIndex; i>=startIndex; i--) {
			var bead = channelElement.select(`.bead[index="${i}"]`);
			const delay = (endIndex-i)*100;
			this.animateBead(bead, delay).on("end", (channel, a, b) => {
				channel.sourceBalance--;
				channel.targetBalance++;
				d3.select(`.channel[id=${channel.id}]`)
					.attr("source-balance", channel.sourceBalance)
					.attr("target-balance", channel.targetBalance);
			});
		}
	}

	/**
	 * TODO: 
	 * @private
	 */
	_onDragStart(d) {
		if (!d3.event.active) {
			this.simulation
				.alphaTarget(0.1)
				.restart();
		}
		d.fx = d.x;
		d.fy = d.y;
	}
	
	/**
	 * TODO: 
	 * @private
	 */
	_onDragged(d) {
		d.fx = d3.event.x; 
		d.fy = d3.event.y;
	}
	
	/**
	 * TODO: 
	 * @private
	 */
	_onDragendEnd(d) {
		if (!d3.event.active) { 
			this.simulation
				.alphaTarget(0);
		}
		d.fx = null;
		d.fy = null;
	}
}

export default Beadnet;