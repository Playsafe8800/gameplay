"use strict";
const newLogger_1 = require("../../newLogger");
class TransformTableGameplay {
    transformTableGameplay(tableGameplayObj) {
        const finalGameplayObj = tableGameplayObj;
        try {
            Object.keys(tableGameplayObj).forEach((tgp) => {
                const value = finalGameplayObj[tgp];
                if (typeof value === 'string') {
                    finalGameplayObj[tgp] = value;
                }
                else {
                    finalGameplayObj[tgp] = JSON.parse(value);
                }
            });
            return finalGameplayObj;
        }
        catch (err) {
            newLogger_1.Logger.error(`INTERNAL_SERVER_ERROR ${err}`);
            return finalGameplayObj;
        }
    }
}
const transform = new TransformTableGameplay();
module.exports = transform;
