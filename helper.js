exports.decodeEnum = function decodeEnum(value, enumclass) {
	var result = [];
	for (var v in enumclass) {
		var nv = parseInt(v);
		if (!isNaN(nv)) {
			if (nv & value) {
				result.push(enumclass[v]);
			}
				
		}
	}
	return result;
};