/**
 * @typedef {[number, number]} Vector2D
 */

class ScreenReader {
	constructor(canvas) {
		this.ctx = canvas.getContext("webgl") ?? canvas.getContext("webgl2");
	}

	/**
	 * FInd objects based on pixel color samples
	 * @param {string} type type of the data
	 * @param {object.<string, Set<number>>|ColorRange} colorData
	 * @param {Vector2D[]} excludeList - list of color RGBs to exclude
	 */
	findObjects(type, colorData, excludeList) {
		let resolve;
		let promise = new Promise((res) => {
			resolve = res;
		});
		const width = ctx.drawingBufferWidth;
		const height = ctx.drawingBufferHeight;
		let pixels = new Uint8Array(width * height * PIXEL_BITS);

		switch (type) {
			case "range":
				requestAnimationFrame(() => {
					let results = {};
					for (let objType in colorData) results[objType] = [];

					ctx.readPixels(
						0,
						0,
						width,
						height,
						ctx.RGBA,
						ctx.UNSIGNED_BYTE,
						pixels
					);
					for (let y = 0; y < height; y += PIXEL_INTERVAL) {
						for (let x = 0; x < width; x += PIXEL_INTERVAL) {
							// exlude minimap area
							if (x > 0.82 * width && y > 0.86 * height) continue;
							// exclude level bar
							if (y < 0.1 * height) continue;
							// exclude crosshair
							if (
								x > 0.48 * width &&
								x < 0.52 * width &&
								y > 0.72 * height &&
								y < 0.78 * height
							)
								continue;

							const i = (y * width + x) * PIXEL_BITS;

							let excluded = false;
							for (let j = 0; j < excludeList.length; j++) {
								const color = excludeList[j];
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
									results[objType].push([x, y]);
									break;
								}
							}
						}
					}

					resolve(results);
				});
				break;
			case "set":
				requestAnimationFrame(() => {
					let results = {};
					for (let objType in colorData) results[objType] = [];

					ctx.readPixels(
						0,
						0,
						width,
						height,
						ctx.RGBA,
						ctx.UNSIGNED_BYTE,
						pixels
					);
					for (let y = 0; y < height; y += PIXEL_INTERVAL) {
						for (let x = 0; x < width; x += PIXEL_INTERVAL) {
							// exlude minimap area
							if (x > 0.82 * width && y > 0.86 * height) continue;
							// exclude level bar
							if (y < 0.1 * height) continue;

							const i = (y * width + x) * PIXEL_BITS;

							let excluded = false;
							for (let j = 0; j < excludeList.length; j++) {
								const color = excludeList[j];
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

							const color =
								(pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
							for (let objType in colorData) {
								if (colorData[objType].has(color))
									results[objType].push([
										pixels[i],
										pixels[i + 1],
										pixels[i + 2],
									]);
							}
						}
					}

					resolve(results);
				});
		}

		return promise;
	}

	/**
	 * Creates a grid of size distance pixels and removes all pixels in the same grid cell
	 * @param {Vector2D[]} points
	 * @param {number} distance minimum distance between points
	 * @param {('first'|'mean')} mode method of handling duplicate points in the same cell
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
	 * @param {HTMLElement} container - the container in which to append the indicating elements
	 * @param {[number, number]} offset - position of bottom left corner of canvas in px
	 * @param {[number, number][]} points - list of points to display
	 * @param {[number, number]} size - size of highlighting box
	 * @param {string} color - comma seperated rgb string representing color
	 */
	displayPoints(container, offset, points, size, color = "200, 20, 20") {
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
	removeDisplayedPoints() {
		let oldPoints = document.querySelectorAll(".point-indicator");
		for (let i = 0; i < oldPoints.length; i++) oldPoints[i].remove();
	}

	getDifference(rgb) {
		return [rgb[0] - rgb[1], rgb[1] - rgb[2]];
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
}