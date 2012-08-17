"use strict";
var isUniqueConstraintViolation = function (dbErr) {
	return dbErr.code == '23505';
};


module.exports = {
	isUniqueConstraintViolation: isUniqueConstraintViolation
};
