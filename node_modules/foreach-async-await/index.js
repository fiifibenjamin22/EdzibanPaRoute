
'use strict';

module.exports = async (array, cb) => {

    if (!Array.isArray(array)) {
        throw new Error('must provide an array in first argument.');
    }

    if (typeof cb !== 'function') {
        throw new Error('must provide a callback function in second argument.');
    }

    const promiseSet = [];

    array.forEach((element, index, arr) => {
        promiseSet.push(cb(element, index, arr));
    });

    return Promise.all(promiseSet);
};