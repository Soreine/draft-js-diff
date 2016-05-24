# draftjs-diff #
Experiment to make side by side DraftJS editors with highlighted diffs.

[See it live here](http://soreine.github.io/draftjs-diff/)


## Performances ##

Here are rough order of magnitudes for the `diff_match_patch` algorithm with default options.

| Characters count | Time (ms) | Diff length |
| ---------------- | --------- | --------- |
| 1000 (~5 paragraph) | 1-5       | 40        |
| 6000 (~30 paragraphs) | 60        | 300       |

The decorators calls never takes more than 1ms.
