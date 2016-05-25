# draftjs-diff #

Experiment to make side by side DraftJS editors with highlighted diffs.

## Approach

The diff calculation is made in two passes. A first block-based diff is made on the BlockMaps of both editors. From there, we determine a mapping between blocks from one editor and the other. Then depending on the case:

- Equal blocks are mapped together and do not need highlighting.
- Some blocks are pure additions. They don't have a deleted block as counterpart. So they are highlighted as a whole.
- Same for blocks that are pure deletions.
- If between two equal blocks, there are added and deleted blocks, these blocks are mapped together. We then apply a word-based diff between the two blocks.


## Pitfalls

We cannot make diffs that are character based because the created spans mess up with the edition (see https://github.com/facebook/draft-js/issues/414). Instead, we limit ourselves to word-based diffs.

## Demo

To run a demo, you need NPM. Then clone the repo:

```bash
> npm i
> npm run demo
```

Visit one among:
- http://127.0.0.1:8081
- http://192.168.1.95:8081
- http://192.168.1.147:8081

## Performances indicators ##

Keeping these numbers in mind as we design solutions.

Here are rough order of magnitudes for the `diff_match_patch` algorithm with default options.

| Characters count | Diff length | Time (ms) |
| ---------------- | --------- | --------- |
| 1000 (~5 paragraph) | 40 | 1-5  |
| 6000 (~30 paragraphs) | 300 | 60 |

The decorators calls never takes more than 1ms.
