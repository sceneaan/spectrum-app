export function isPropertyExistsInObject(object, property) {
	return Object.prototype.hasOwnProperty.call(object, property);
}

export function isDataExists(data) {
	if (data === null || typeof data === 'undefined') {
		return false;
	}
	if (Array.isArray(data)) {
		return data.length > 0;
	}
	if (typeof data === 'object') {
		return Object.keys(data).length > 0;
	}
	if (typeof data === 'string') {
		return data.length > 0;
	}
	if (typeof data === 'number') {
		return data > 0;
	}
	if (typeof data === 'boolean') {
		return data;
	}

	return false;
}

export function compareObjects(obj1, obj2) {
	return Object.keys(obj1).some((key) => obj1[key] !== obj2[key]);
}

export function checkArraysEqual(arr1, arr2) {
	if (arr1.length !== arr2.length) { return false; }
	for (let i in arr1) {
		if (arr1[i] !== arr2[i]) { return false; }
	}
	return true;
}

export function checkArraysEqualKeyValue(arr1, arr2) {
	if (arr1.length !== arr2.length) { return false; }
	for (let i in arr1) {
		if (arr1[i].key !== arr2[i].key) { return false; }
	}
	return true;
}

export function calculateDiscount(percentage, price) {
	const discount = (percentage / 100) * price;
	const discountedPriced = price - discount;
	return `$${discountedPriced % 1 === 0 ? discountedPriced : discountedPriced.toFixed(2)}`;
}

/**
 * Check if user is from Saudi Arabia
 * @param {string} nationality - User's nationality
 * @returns {boolean} - True if user is from Saudi Arabia
 */
export function isSaudiUser(nationality) {
	return nationality === 'Saudi Arabia';
}
