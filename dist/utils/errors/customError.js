"use strict";
class CustomError extends Error {
    constructor(message, cause, data, reason, retry) {
        super();
        this.name = this.constructor.name;
        this.message = message;
        this.cause = cause;
        this.data = data;
        this.retry = retry;
    }
}
module.exports = CustomError;
