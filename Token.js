const Token = {
    None : 1,

    Element : 2,
    EndElement : 3,

    EnterElement : 4,
    AddToLastElement : 5,
    IndentDecrease : 6,

    InlineText : 7,
    MultilineText: 8,
    AttributeName: 9,
    AttributeValue: 10,
    Text: 11
};

module.exports = Token;
