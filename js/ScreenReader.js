/**
 * @typedef {[number, number]} Vector2D
 */

/**
 * @typedef {[number, number, number]} Color
 */

class ScreenReader {
	constructor(canvas) {
		this.ctx = canvas.getContext("webgl") ?? canvas.getContext("webgl2");
	}

	/**
	 * FInd objects based on pixel color samples
	 * @param {('range'|'set'|'difference')} type type of the data
	 * 												- range: range of rgb values
	 *   										    - set: set of rgb values as their hex values as numbers 
	 * 											    - difference: set of hex values as numbers with the first 2 bits being (red - green) and the next 2 being (green - blue)
	 * @param {object.<string, Set<number>>|ColorRange} colorData
	 * @param {Object} options options
	 * @param {number} options.pixelInterval - integer x and y increment when iterating over pixels 
	 * 										   iterates in a grid like pattern with a gap of (pixelInterval - 1) between each pixel checked
	 * @param {Color[]} options.excludeColors - list of color RGBs to exclude
	 * @param {[Vector2D, Vector2D][]} options.excludeAreas - array of positions from bottom left corner of top left and bottom right corner of rectangle to exclude
	 * 													      positions should be in percentages of width and height
	 */
	findObjects(type, colorData, options) {
		let resolve;
		let promise = new Promise((res) => {
			resolve = res;
		});

		const width = this.ctx.drawingBufferWidth;
		const height = this.ctx.drawingBufferHeight;
		let pixels = new Uint8Array(width * height * PIXEL_BITS);
		const compareFn = {
			range: this._findObjectsRangeFilter,
			set: this._findObjectsSetFilter,
			difference: this._findObjectsDifferenceFilter
		}[type];
		const PIXEL_INTERVAL = options.pixelInterval ?? 5;

		requestAnimationFrame(() => {
			let results = {};
			for (let objType in colorData) results[objType] = [];

			this.ctx.readPixels(
				0,
				0,
				width,
				height,
				this.ctx.RGBA,
				this.ctx.UNSIGNED_BYTE,
				pixels
			);
			for (let y = 0; y < height; y += PIXEL_INTERVAL) {
				for (let x = 0; x < width; x += PIXEL_INTERVAL) {

					// rectangle exclude 
					if(options.excludeAreas && options.excludeAreas.length) {
						let dx = null;

						for(let i = 0; i < options.excludeAreas.length; i++) {
							const e = options.excludeAreas[i];
							if(
								e[0][0] <= x && e[0][1] <= y && // to the right and above the bottom left point
								e[1][0] >= x && e[1][1] >= y	// to the left and bottom to the top right point
							) {
								// skip the excluded areas while ensuring that remains x a multiple of PIXEL_INTERVAL
								dx = Math.floor( (e[1][0] - x) / PIXEL_INTERVAL ) * PIXEL_INTERVAL;
								break;
							}
						}

						if(dx) {
							x += dx;
							continue;
						}
					}

					const i = (y * width + x) * PIXEL_BITS;

					let excluded = false;
					for (let j = 0; j < options.excludeColors.length; j++) {
						const color = options.excludeColors[j];
						if (
							pixels[i] === color[0] &&
							pixels[i + 1] === color[1] &&
							pixels[i + 2] === color[2]
						) {
							excluded = true;
							break;
						}
					}

					if (excluded) continue;

					let objTypeFound = compareFn(pixels, i, colorData);
					if(objTypeFound) results[objTypeFound].push([x, y]);
				}
			}

			resolve(results);
		});

		return promise;
	}

	// findObjects compare functions 
	// returns the object type found
	_findObjectsSetFilter(pixels, i, colorData) {
		const color = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
		for (let objType in colorData) {
			if (colorData[objType].has(color)) return objType;
		}
	}

	_findObjectsRangeFilter(pixels, i, colorData) {
		for (let objType in colorData) {
			const ranges = colorData[objType];

			if (
				ranges.min[0] <= pixels[i] &&
				pixels[i] <= ranges.max[0] &&
				ranges.min[1] <= pixels[i + 1] &&
				pixels[i + 1] <= ranges.max[1] &&
				ranges.min[2] <= pixels[i + 2] &&
				pixels[i + 2] <= ranges.max[2]
			) {
				return objType;
			}
		}
	}

	_findObjectsDifferenceFilter(pixels, i, colorData) {
		const redGreenDiff = pixels[i] - pixels[i + 1];
		const greenBlueDiff = pixels[i + 1] - pixels[i + 2];
		const colorDiff = (redGreenDiff << 8) | greenBlueDiff;
		
		for(let objType in colorData) {
			if(colorData[objType].has(colorDiff)) return objType; 
		}
	}

	/**
	 * Creates a grid of size distance pixels and removes all pixels in the same grid cell
	 * @param {Vector2D[]} points
	 * @param {number} distance minimum distance between points
	 * @param {('first'|'mean')} [mode=first] method of handling duplicate points in the same cell
	 */
	filterNearByPoints(points, distance, mode = "first") {
		let table = {};
		for (let i = 0; i < points.length; i++) {
			const p = points[i];
			let idx = Math.round(p[0] / distance) + "," + Math.round(p[1] / distance);

			switch (mode) {
				case "first":
					if (table.hasOwnProperty(idx)) continue;
					table[idx] = p;
					break;

				case "mean":
					if (table.hasOwnProperty(idx)) {
						table[idx][0] += p[0];
						table[idx][1] += p[1];
						table[idx][2]++;
					}

					table[idx] = p;
					table[idx][2] = 0; // counter for the amount of points added
			}
		}

		const values = Object.values(table);

		if (mode === "mean") {
			for (let i = 0; i < values.length; i++) {
				const e = values[i];
				e[0] = Math.round(e[0] / e[2]);
				e[1] = Math.round(e[1] / e[2]);
			}
		}

		return values;
	}

	/**
	 *
	 * @param {Vector2D} origin
	 * @param {Object.<string, Vector2D[]>} results
	 * @returns
	 */
	getNearestPointFromResults(origin, results) {
		let smallestDistSquare = Infinity;
		let nearestPoint = null;
		for (let type in results) {
			const points = results[type];

			for (let i = 0; i < points.length; i++) {
				const point = points[i];
				const distSquare =
					(point[0] - origin[0]) ** 2 + (point[1] - origin[1]) ** 2;
				if (distSquare >= smallestDistSquare) continue;
				smallestDistSquare = distSquare;
				nearestPoint = point;
			}
		}

		return nearestPoint;
	}

	/**
	 * @param {HTMLElement} container - the container in which to append the indicating elements
	 * @param {[number, number]} offset - position of bottom left corner of canvas in px
	 * @param {[number, number][]} points - list of points to display
	 * @param {[number, number]} size - size of highlighting box
	 * @param {string} [color=200, 20, 20] - comma seperated rgb string representing color
	 */
	static displayPoints(container, offset, points, size, color = "200, 20, 20") {
		for (let i = 0; i < points.length; i++) {
			const p = points[i];
			const element = document.createElement("div");
			element.className = "point-indicator";
			element.style.zIndex = "99999999";
			element.style.width = `${size[0]}px`;
			element.style.height = `${size[1]}px`;
			element.style.left = `${offset[0] + p[0]}px`;
			element.style.top = `${offset[1] - p[1]}px`;
			element.style.border = `2px rgba(${color}, .4) solid`;
			element.style.position = "fixed";
			element.style.transform = "translate(-50%)";
			container.appendChild(element);
		}
	}

	/**
	 * Remove displayed points from displayPoints
	 */
	static removeDisplayedPoints() {
		let oldPoints = document.querySelectorAll(".point-indicator");
		for (let i = 0; i < oldPoints.length; i++) oldPoints[i].remove();
	}

	/**
	 * @typedef {Object} ColorAnalysis
	 * @property {object} range
	 * @property {Color} range.min
	 * @property {Color} range.max
	 * @property {[number, number]} difference - [red - green, green - blue]
	 */

	/**
	 * 
	 * @param {Color[]} colorList 
	 * @returns {ColorAnalysis}
	 */
	static analyseColorList(colorList) {
		// RGB range
		const red = [];
		const green = [];
		const blue = [];
		let difference = [];
		for(let i = 0; i < colorList.length; i++) {
			const rgbArr = this.RGBIntToArray(colorList[i])
			red[i] = rgbArr[0];
			green[i] = rgbArr[1];
			blue[i] = rgbArr[2];

			difference[i] = this.getDifference(rgbArr);
		}

		return {
			range: {
				min: [
					Math.min(...red),
					Math.min(...green),
					Math.min(...blue)
				],
				max: [
					Math.max(...red),
					Math.max(...green),
					Math.max(...blue)
				]
			},
			
			difference
		}
	}

	static getDifference(rgb) {
		return [rgb[0] - rgb[1], rgb[1] - rgb[2]];
	}
	
	static RGBIntToArray(int) {
		const red = int >> 16;
		const green = (int - (red << 16)) >> 8;
		const blue = int - (red << 16) - (green << 8);
		return [red, green, blue];
	}
}