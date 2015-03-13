var Token = require('./Token');

const State = {
    Limbo: 1,

    TagName: 2,

    InlineText: 3,
    TagBody: 4,
    MultilineText: 5,

    Attributes: 6,
    AttributeName: 7,
    AttributeValue: 8,
    QuotedText: 9,
    LimboMultilineText: 10
};

function isLetter(x) {
    return (x>='a' && x<='z') || (x>='A' && x<='Z');
}

function Parser(input) {

    var states = [],
        buffer = [];

    var pos = 0,
        prevChar;

    states.push(State.Limbo);

    function clearBuffer(){
        buffer.splice(0, buffer.length);
    }

    function report(token){
        var val = buffer.splice(0, buffer.length).join('');
        return { token: token, value: val };
    }

    function getNextChar () {
        if (pos<input.length)
            return input[pos++];

        if (pos==input.length) {
            pos++;
            return '\n';
        }

        return false;
    }

    this.read = function () {

        var c = '\0';

        function repeatLast(prevChar) {
            pos--;
            c = prevChar;
        }

        while (true) {

            prevChar = c;
            c = getNextChar();
            if (!c)
                return false;

            if (c==='\r') {
                c = prevChar;
                continue;
            }

            var state = states[states.length-1];

            switch (state) {
                case State.Limbo:
                    switch (c) {
                        case '+':
                            return report(Token.AddToLastElement);

                        case '-':
                            return report(Token.IndentDecrease);

                        case '<':
                            states.push(State.LimboMultilineText);
                            continue;

                        default:
                            if (isLetter(c)) {
                                buffer.splice(0, buffer.length);
                                buffer.push(c);
                                states.push(State.TagName);
                            }
                            continue;
                    }

                case State.TagName:
                    switch (c)
                    {
                        case ' ':
                            states.pop();
                            states.push(State.TagBody);
                            return report(Token.Element);

                        case '\n':
                            states.pop();
                            return report(Token.Element);

                        case '+':
                            states.pop();
                            states.push(State.TagBody);
                            c = prevChar;
                            pos--;
                            return report(Token.Element);

                        default:
                            buffer.push(c);
                            continue;
                    }

                case State.TagBody:

                    if (prevChar=='/' && c == '>')
                    {
                        states.pop();
                        continue;
                    }

                    switch (c) {
                        case ' ':
                            continue;

                        case '+':
                            return report(Token.EnterElement);

                        case '\n':
                            states.pop();
                            continue;

                        case '<':
                            states.pop();
                            states.push(State.MultilineText);
                            clearBuffer();
                            continue;

                        case '{':
                            states.push(State.Attributes);
                            continue;

                        case '|':
                            states.pop();
                            continue;

                        case '"':
                            states.pop();
                            states.push(State.InlineText);
                            states.push(State.QuotedText);
                            clearBuffer();
                            continue;
                    }

                    states.pop();
                    states.push(State.InlineText);
                    clearBuffer();
                    buffer.push(c);
                    continue;

                case State.InlineText:

                    if (prevChar == '/' && c == '>')
                    {
                        states.pop();
                        buffer.pop();
                        if (buffer.length > 0)
                            return report(Token.InlineText);
                        continue;
                    }

                    switch (c)
                    {
                        case '\n':
                        case '|':
                            states.pop();
                            if (buffer.length > 0)
                                return report(Token.InlineText);

                            continue;

                        default:
                            buffer.push(c);
                            continue;
                    }

                case State.LimboMultilineText:
                case State.MultilineText:
                    if (prevChar == '<' && isLetter(c))
                    {
                        buffer.pop();

                        var res = report(state == State.LimboMultilineText ? Token.Text : Token.MultilineText);

                        buffer.push(c);
                        states.push(State.TagName);
                        return res;
                    }

                    switch (c)
                    {
                        case '\n':
                            if (buffer.length==0)
                                continue;

                            break;

                        case '"':
                            if (buffer.length==0 && prevChar == '<')
                            {
                                states.push(State.QuotedText);
                                continue;
                            }
                            break;

                        case '>':
                            if (prevChar=='\n' || prevChar == '"') {
                                buffer.pop();
                                states.pop();
                                if (buffer.length > 0)
                                    return report(state == State.LimboMultilineText ? Token.Text : Token.MultilineText);
                                continue;
                            }
                            buffer.push(c);
                            continue;
                    }

                    buffer.push(c);
                    continue;

                case State.Attributes:
                    switch (c)
                    {
                        case '}':
                            states.pop();
                            continue;

                        case '\n':
                        case ' ':
                        case ',':
                        case '\t':
                            continue;

                        default:
                            clearBuffer();
                            buffer.push(c);
                            states.push(State.AttributeName);
                            continue;
                    }

                case State.AttributeName:
                    switch (c)
                    {
                        case ':':
                            states.pop();
                            states.push(State.AttributeValue);
                            return report(Token.AttributeName);

                        case ',':
                            states.pop();
                            return report(Token.AttributeName);

                        case '}':
                            states.pop();
                            states.pop();
                            return report(Token.AttributeName);

                        case ' ':
                            if (buffer.length == 0)
                                continue;
                            buffer.push(c);
                            continue;

                        default:
                            buffer.push(c);
                            continue;
                    }

                case State.AttributeValue:
                    switch (c)
                    {
                        case ' ':
                            if (buffer.length>0){
                                states.pop();
                                return report(Token.AttributeValue);
                            }
                            continue;

                        case ',':
                        case '\n':
                        case '\t':
                            states.pop();
                            return report(Token.AttributeValue);

                        case '}':
                            states.pop();
                            states.pop();
                            return report(Token.AttributeValue);

                        default:
                            if (buffer.length == 0 && c == '\"')
                            {
                                states.push(State.QuotedText);
                                continue;
                            }
                            buffer.push(c);
                            continue;
                    }

                case State.QuotedText:
                    switch (c)
                    {
                        case '\n':
                            if (buffer.length == 0)
                                continue;
                            break;

                        case '"':
                            if (prevChar=='"') {
                                buffer.push('"');
                                c = '\0';
                            }
                            continue;
                    }

                    if (buffer.length>0 && prevChar=='"') {
                        states.pop();
                        repeatLast(prevChar);
                        continue;
                    }

                    buffer.push(c);
                    continue;
            }
        }
    };

    this.parse = function()
    {
        var dummyParent = {},
            currentElement = dummyParent,
            lastElement = dummyParent;

        var parents = [];
        parents.push(dummyParent);

        var addToCurrent = false;
        var lastAttributeName = null;
        var tr;

        function addChild(el, child) {
            if (!el.children)
                el.children = [];
            el.children.push(child);
        }

        while (tr = this.read())
        {
            switch (tr.token)
            {
                case Token.Element:
                    lastElement = { name : tr.value };
                    if (addToCurrent)
                    {
                        addChild(currentElement, lastElement);
                        addToCurrent = false;
                    }
                    else
                    {
                        currentElement = lastElement;
                        addChild(parents[parents.length-1], currentElement);
                    }
                    break;


                case Token.InlineText:
                case Token.MultilineText:
                    addChild(lastElement, { text: tr.value });
                    break;

                case Token.Text:
                    if (addToCurrent)
                    {
                        addChild(currentElement, { text: tr.value });
                        addToCurrent = false;
                    }
                    else
                    {
                        addChild(parents[parents.length-1], { text: tr.value });
                    }
                    break;

                case Token.IndentDecrease:
                    if (parents.length > 1)
                        currentElement = parents.pop();
                    break;

                case Token.EnterElement:
                    parents.push(lastElement);
                    break;

                case Token.AddToLastElement:
                    addToCurrent = true;
                    break;

                case Token.AttributeName:
                    lastAttributeName = tr.value;
                    if (lastAttributeName == '')
                        break;

                    if (lastElement.attributes == null)
                        lastElement.attributes = {};

                    lastElement.attributes[lastAttributeName] = null;
                    break;

                case Token.AttributeValue:
                    lastElement.attributes[lastAttributeName] = tr.value;
                    break;
            }
        }

        return dummyParent.children || [];
    }
};

module.exports = Parser;
