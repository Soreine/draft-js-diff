var Draft = require('draft-js');

function editorStateFromText(text) {
    var content = Draft.ContentState.createFromText(text);
    return Draft.EditorState.createWithContent(content);
}

module.exports = {
    editorStateFromText: editorStateFromText,
    text1: 'Hello, this is a first block.\n\nThis is second block.\n\nHere is a third block.',
    text2: 'Hello, this is a splitted,\n\nfirst block.\n\nThis is second modified block.\n\nHere is a third block.'
};
