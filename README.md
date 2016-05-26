# draft-js-diff #

Create side-by-side text editors with highlighted diffs, using [DraftJS](http://facebook.github.io/draft-js/).

Table of content:

- [Demo](#demo)
- [Usage](#usage)
  - [Using the DiffEditor](#using-the-diffeditor)
  - [Using Decorators Strategies](#creating-compositedecorator-strategies)
- [Shortcomings](#shortcomings)
- [API Reference](#api-reference)

## Demo

**[Live demo here](//soreine.github.io/draft-js-diff/)**

Or you can serve the demo locally by cloning this repository and:

```bash
> npm install
> npm run start
```

... then visit http://127.0.0.1:9090

## Usage

Adds the NPM package as dependency, then require:

```js
var DraftDiff = require('draft-js-diff');
```

### Using the DiffEditor

You can use the base React component shown in the demo to simply display two side-by-side editors with highlighted differences:

```js
var DiffEditor = DraftDiff.DiffEditor;

ReactDOM.render(
    <DiffEditor left={left}
                right={right}>
    </DiffEditor>,
    document.getElementById('target')
);
```

Differences will be enclosed in span with classes so you can apply styling on it:

```css
.diff-delete {
    background-color: #fee
}
.diff-equal {
    background-color: #ffe
}
.diff-insert {
    background-color: #efe
}
```

Be sure to include the [DraftJS stylesheet](https://facebook.github.io/draft-js/docs/advanced-topics-issues-and-pitfalls.html#missing-draft-css) too.

### Creating CompositeDecorator strategies

You don't have to use the demo `DiffEditor`, you can just create decorators and use them for your  own `Draft.Editor`. To do so, you need to create decorator strategies after diffing both texts. The [source code of the `DiffEditor` is a good example of this](lib/diffEditor.js).

#### Computing the diffs

``` js
var diffs = DraftDiff.diffWordMode(oldText, newText);
```

#### Creating strategies for the diffs

From an array of diff, you can create strategies for a [CompositeDecorator](https://facebook.github.io/draft-js/docs/advanced-topics-decorators.html#compositedecorator). Strategies are different for the editor containing the _old text_ and the editor with the _new text_. And they will only work if the editors contain the whole old or new text. So you need to generate strategies for both editors.

```js
// Create strategies for the old text
var oldTextStrategies = DraftDiff.diffDecoratorStrategies(diffs, false, blockMap1);
// Create strategies for the editor containing the new text
var newTextStrategies = DraftDiff.diffDecoratorStrategies(diffs, true, blockMap2);

// 3 functions that works as strategy to decorate spans of text that were...
newTextStrategies.getEqualStrategy() // ... unchanged
newTextStrategies.getInsertStrategy() // ... inserted
newTextStrategies.getDeleteStrategy() // ... deleted
```

#### Creating decorators

Here is an [example of decorator](lib/diffDecorator.js), based on the created strategies. Just set this decorator on the EditorState used to create the strategies.

#### When content change

When the texts changed (and the diffs too), you need to re-create strategies from the new diff. That's a limitation of using decorators, they are only aware of the blocks they decorate, and not the whole texts, so you need to create them anew to update the diffs.

## Shortcomings

### Can't do more than word-level diffing

We cannot make diffs at a character level because the created spans mess up with the edition (see https://github.com/facebook/draft-js/issues/414). Instead, we limit ourselves to diffs at a word level diffs. That's why we provide a word-level diffing implementation based on the [`diff_match_patch` library](https://www.npmjs.com/package/diff-match-patch), which originally works at a character level.

### Diffing is costly

Everytime one of the diffed text changes, we need to compute a whole new diff (in the future, we could work on optimizing this depending on the kind of change).

Here are rough order of magnitudes for the `diff_match_patch` algorithm with default options.

| Characters count | Diffs count | Time (ms) |
| ---------------- | --------- | --------- |
| 1000 (~5 paragraph) | 40 | 1-5  |
| 6000 (~30 paragraphs) | 300 | 60 |

As the texts grow, the editing becomes laggy. You might want to stop trying to re-compute the diffs as the user types, and instead delay this calculation, for example using debouncing.

## API Reference

#### DiffEditor

```js
/**
 * Displays two Draft.Editor decorated with diffs.
 * @prop {Number} [debounceWait=-1] Milliseconds. Delay for the
 * updating the diffs. -1 to disable debouncing.
 * @prop {Object} [left] Props for the left editor (containing the old text)
 * @prop {Object} [right] Props for the right editor (containing the new text)
 * @prop {String} [left.initial=''] The initial left text
 * @prop {String} [right.initial=''] The initial right text
 * @prop {Boolean} [left.hidden=false] Whether to actually display an editor
 * @prop {Boolean} [right.hidden=false] Whether to actually display an editor
 * @prop {Boolean} [left.readOnly=false] Make the left editor read only.
 * @prop {Boolean} [right.readOnly=false] Make the right editor read only.
 * @prop {Function} [right.onChange] Callback called with the right EditorState changes.
 * @prop {Function} [left.onChange] Callback called when the left EditorState changes.
 * @prop {Draft.EditorState} [right.state] Be sure to pass back the
 * updated state if you listen to right.onChange.
 * @prop {Draft.EditorState} [left.state]  Be sure to pass back the
 * updated state if you listen to left.onChange.
 */
DraftDiff.DiffEditor // React Component
```

#### diffWordMode

``` js
/**
 * Find the differences between two texts, at a word level
 * @param {String} oldText
 * @param {String} newText
 * @returns {Array<diff_match_patch.Diff>} Array of diff tuples
 */
DraftDiff.diffWordMode = function (oldText, newText)
```

#### diffDecoratorStrategies

``` js
/**
 * @param {Array<diff_match_patch.Diff>} diffs
 * @param {Boolean} forNewText True if the text in blockMap is the new text.
 * @param {DraftJS.BlockMap} blockMap The BlockMap of the ContentState to decorate
 * @return {Strategies} Three strategies that identify ranges of text for each type of diff.
 * Only two of them will actually be relevant (equal and insert for
 * new text, or equal and delete for old text).
 */
DraftDiff.diffDecoratorStrategies = function (diffs, forNewText, blockMap)
```
