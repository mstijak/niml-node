var escape = require('escape-html');

function toHtml(niml) {
    var s = '';

    function process(els) {
        if (!els)
            return false;

        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.name) {
                s += '<' + el.name;
                if (el.attributes)
                    for (var att in el.attributes) {
                        s += ' ' + att;
                        var v = el.attributes[att];
                        if (v != null) {
                            s += '="' + escape(v) + '"';
                        }
                    }

                s += '>';
                process(el.children);
                s += '</' + el.name + '>';
            } else if (el.text) {
                s += escape(el.text);
            }
        }
    }

    process(niml);
    return s;
}

module.exports = toHtml;
