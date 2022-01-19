const formatDate = (data, keys, format = 'YYYY-MM-DD HH:mm:ss') => {
    return [].concat(keys).reduce((mol, key) => {
        if (typeof mol[key] === 'number') {
            mol[key] = moment(mol[key]).format(format);
        }
        return mol;
    }, data);
}

const filtEmpty = data => {
    const query = {};
    if (data && typeof data === 'object') {
        Object.keys(data).forEach(k => {
            const c = data[k];
            if (typeof c !== 'undefined' && c !== '' && toString.call(c) !== '[object Null]') {
                if (Array.isArray(c) && c.length === 0) {
                    return;
                }
                query[k] = c;
            }
        });
    }
    return query;
}

module.exports = {
    formatDate,
    filtEmpty,
}