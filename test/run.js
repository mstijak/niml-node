var assert = require("assert"),
    html = require("html"),
    fs = require("fs"),
    path = require("path"),
    Parser = require("../Parser"),
    toHtml = require("../toHtml");

describe('Tests', function(){
    var files = fs.readdirSync('./test');

    function test(fn) {
        var npath = path.join('.', 'test', fn);

        it(fn, function () {
            var nimlStr = fs.readFileSync(npath, {encoding: 'utf8'});
            var parser = new Parser(nimlStr);
            var niml = parser.parse(nimlStr);
            var htmlStr = toHtml(niml);
            var actual = html.prettyPrint(htmlStr, { indent_size: 2 });

            fs.writeFileSync(npath.replace('.niml', '.out.html'), actual);
            fs.writeFileSync(npath.replace('.niml', '.out.json'), JSON.stringify(niml, null, 2));

            var expectedStr = fs.readFileSync(npath.replace('.niml', '.html'), {encoding: 'utf8'});
            var expected = html.prettyPrint(expectedStr, { indent_size: 2 });

            assert.equal(actual, expected);
        });
    }

    for (var i = 0; i<files.length; i++)
        if (files[i].substr(-5) === '.niml')
            test(files[i]);
})