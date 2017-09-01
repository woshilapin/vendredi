let Canvas = function(args) {
	let reset = function() {
		this.context.fillStyle = Canvas.COLORS.background;
		this.context.fillRect(0, 0, this.width, this.height);
	};

	let convertCoords = function([sx, sy]) {
		let [cx, cy] = this.atlas.center.pixelCoords();
		return [
			this.center.x + (sx - cx) * this.unit,
			this.center.y + (sy - cy) * this.unit
		]
	}

	let drawCircle = function(color, size = 1.0) {
		return function(cell) {
			let [x, y] = convertCoords.call(this, cell.pixelCoords());
			this.context.save();
			this.context.fillStyle = color;
			this.context.beginPath();
			this.context.moveTo(x, y);
			this.context.arc(x, y, size * canvas.unit/2.0, 0, 2*Math.PI);
			this.context.fill();
			this.context.closePath();
			this.context.restore();
		};
	};
	let drawWater = drawCircle(Canvas.COLORS.water);
	let drawVendredi = drawCircle(Canvas.COLORS.vendredi, 0.75);
	let drawCursor = drawCircle(Canvas.COLORS.cursor, 0.5);
	let drawPathStep = drawCircle(Canvas.COLORS.path, 0.5);

	let drawIsland = function(cell) {
		let east = cell.neighbors['east'];
		let northeast = cell.neighbors['northeast'];
		let southeast = cell.neighbors['southeast'];
		let [x, y] = convertCoords.call(this, cell.pixelCoords());
		this.context.save();
		this.context.fillStyle = cell.visited ? Canvas.COLORS.visited : Canvas.COLORS.island;
		if (east && east.type === 'island') {
			let [nx, ny] = convertCoords.call(this, east.pixelCoords());
			this.context.beginPath();
			this.context.moveTo(x, y);
			this.context.arc(x, y, canvas.unit/2.0, Math.PI/2.0, -Math.PI/2.0);
			this.context.arc(nx, ny, canvas.unit/2.0, -Math.PI/2.0, Math.PI/2.0);
			this.context.arc(x, y, canvas.unit/2.0, Math.PI/2.0, -Math.PI/2.0);
			this.context.fill();
			this.context.closePath();
		}
		if (northeast && northeast.type === 'island') {
			let [nx, ny] = convertCoords.call(this, northeast.pixelCoords());
			this.context.beginPath();
			this.context.moveTo(x, y);
			this.context.arc(x, y, canvas.unit/2.0, Math.PI/6.0, -5.0*Math.PI/6.0);
			this.context.arc(nx, ny, canvas.unit/2.0, -5.0*Math.PI/6.0, Math.PI/6.0);
			this.context.arc(x, y, canvas.unit/2.0, Math.PI/6.0, -5.0*Math.PI/6.0);
			this.context.fill();
			this.context.closePath();
		}
		if (southeast && southeast.type === 'island') {
			let [nx, ny] = convertCoords.call(this, southeast.pixelCoords());
			this.context.beginPath();
			this.context.moveTo(x, y);
			this.context.arc(x, y, canvas.unit/2.0, 5.0*Math.PI/6.0, -Math.PI/6.0);
			this.context.arc(nx, ny, canvas.unit/2.0, -Math.PI/6.0, 5.0*Math.PI/6.0);
			this.context.arc(x, y, canvas.unit/2.0, 5.0*Math.PI/6.0, -Math.PI/6.0);
			this.context.fill();
			this.context.closePath();
		} else {
			drawCircle.call(this, this.context.fillStyle).call(this, cell);
		}
		this.context.restore();
	};

	let drawPath = function(path) {
		path.forEach((cell) => {
			drawPathStep.call(this, cell);
		});
	}

	let drawEdges = function() {
		let ccoords = this.atlas.center.pixelCoords();
		this.atlas.onDisk(this.atlas.size).forEach((cell) => {
			let scoords = cell.pixelCoords();
			for (let direction of Cell.DIRECTIONS.slice(0, 3)) {
				let target = cell.neighbors[direction];
				if (target) {
					let tcoords = target.pixelCoords();
					this.context.save();
					this.context.strokeStyle = 'black';
					this.context.beginPath();
					let sx = canvas.center.x + (scoords[0] - ccoords[0]) * canvas.unit;
					let sy = canvas.center.y + (scoords[1] - ccoords[1]) * canvas.unit;
					this.context.moveTo(sx, sy);
					let tx = canvas.center.x + (tcoords[0] - ccoords[0]) * canvas.unit;
					let ty = canvas.center.y + (tcoords[1] - ccoords[1]) * canvas.unit;
					this.context.lineTo(tx, ty);
					this.context.stroke();
					this.context.closePath();
					this.context.restore();
				}
			}
		});
	}

	let drawMesh = function() {
		this.atlas.onMesh().forEach((cell) => {
			let [x, y] = convertCoords.call(this, cell.pixelCoords());
			this.context.save();
			this.context.fillStyle = 'black';
			this.context.beginPath();
			this.context.arc(x, y, 0.1 * this.unit, 0, 2*Math.PI);
			this.context.fill();
			this.context.closePath();
			this.context.restore();
		});
	};

	let drawGradients = function(magnitude) {
		magnitude = magnitude || 1.0;
		this.atlas.onMesh().forEach((cell) => {
			let target = Cell({
				coords: cell.coords.map((n, i) => n + cell.gradient[i] * Math.sqrt(2.0) * magnitude * this.atlas.meshSize),
			});
			let [sx, sy] = convertCoords.call(this, cell.pixelCoords());
			let [tx, ty] = convertCoords.call(this, target.pixelCoords())
			this.context.save();
			this.context.strokeStyle = 'gray';
			this.context.beginPath();
			this.context.moveTo(sx, sy);
			this.context.lineTo(tx, ty);
			this.context.stroke();
			this.context.closePath();
			this.context.restore();
		});
	};

	let drawElevation = function(text) {
		this.atlas.onDisk(this.atlas.size).forEach((cell) => {
			let gray = ( 1.0 - cell.elevation ) * 255;
			let color = `rgb(${gray}, 237, ${gray})`;
			drawCircle.call(this, color).call(this, cell);
			if (text) {
				this.context.save();
				this.context.fillStyle = 'black';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'middle';
				let [x, y] = convertCoords.call(this, cell.pixelCoords());
				let elevation = Math.round(cell.elevation * 10.0);
				this.context.fillText(elevation, x, y);
				this.context.restore();
			}
		});
	};

	let drawDebug = function() {
		drawElevation.call(this);
		drawGradients.call(this, 0.45);
		drawMesh.call(this);
	};
	
	let drawAnimations = function() {
		let animationTime = 1; // Time of the animation in seconds
		let animationMove = 3 * this.unit;
		if (!this.animations) this.animations = [];
		// Remove all finished animations
		this.animations = this.animations.filter((animation) => performance.now() - animation.start < animationTime * 1000);
		this.animations.forEach((animation) => {
			let ratio = (performance.now() - animation.start) / (animationTime * 1000);
			this.context.save();
			let size = Math.floor(8 + (32 - 8) * (1 - ratio));
			this.context.font = `${size}px Flood`;
			this.context.globalAlpha = 1 - ratio * ratio;
			let symbol = '';
			if (animation.type === 'fish') {
				symbol = 'b';
				this.context.fillStyle = 'rgb(128, 128, 237)';
			} else if (animation.type === 'meat') {
				symbol = 'c';
				this.context.fillStyle = 'rgb(237, 128, 128)';
			}
			let [x, y] = convertCoords.call(this, animation.cell.pixelCoords());
			x += ratio * animationMove;
			y -= ratio * animationMove;
			this.context.fillText(symbol, x, y);
			this.context.restore();
		});
	}

	let draw = function() {
		this.reset();
		this.atlas.onDisk(this.atlas.size).forEach((cell) => {
			if (cell.type === 'island') {
				drawIsland.call(this, cell);
			}
		});
		this.atlas.onDisk(this.atlas.size).forEach((cell) => {
			if (cell.type === 'water') {
				drawWater.call(this, cell);
			}
		});
		drawPath.call(this, this.atlas.path)
		drawCursor.call(this, this.atlas.cursor);
		drawVendredi.call(this, this.atlas.center);
		drawAnimations.call(this);
	};

	let foundFish = function(cell) {
		this.animations.push({
			type: 'fish',
			cell,
			start: performance.now()
		});
	};
	let foundMeat = function(cell) {
		this.animations.push({
			type: 'meat',
			cell,
			start: performance.now()
		});
	};

	return {
		reset,
		draw,
		foundFish,
		foundMeat
	};
};
Canvas.COLORS = {
	"background": 'rgb(240, 240, 240)',
	"water": 'rgb(224, 224, 237)',
	"island": 'rgb(128, 237, 128)',
	"visited": 'rgb(16, 64, 16)',
	"vendredi": 'rgb(186, 0, 0)',
	"cursor": 'rgb(186, 128, 128)',
	"path": 'rgb(192, 192, 237)'
};

window.addEventListener('load', () => {
	let canvas = document.getElementById('canvas');
	let context = canvas.getContext('2d');
	Object.assign(canvas, {context}, Canvas());
});
