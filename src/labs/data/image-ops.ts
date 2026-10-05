import type { Lab, LabLevel } from '../../core/types'

/** Python source: raw template (backslashes kept as typed), leading newline dropped. */
const py = (s: TemplateStringsArray) => s.raw[0].replace(/^\n/, '')

/** learner code first, then the provided executor (identical in starter and every solution) */
const withExecutor = (code: string) => `${code}\n\n${PROVIDED}`

/* --------------------------------------------------------------- provided */

const PROVIDED = py`
# ---------------------------------------------------------------------------
# Provided: an executor that works in the browser (used from level 4). Don't edit.
# It loads after your code: use these names inside your functions, and quote
# them in type hints (executor: "SequentialExecutor").
# ---------------------------------------------------------------------------


class SequentialExecutor:
    """Runs each task immediately, in the calling thread.

    Same interface as ThreadPoolExecutor and ProcessPoolExecutor:
      future = executor.submit(fn, *args, **kwargs)
      future.result()       fn's return value, or raises fn's exception
      executor.shutdown()
    The browser can't start threads or processes, so this stand-in does the
    work inline. Your code shouldn't care which executor it is given.
    """

    def __init__(self, max_workers=None):
        self.max_workers = max_workers
        self.is_shutdown = False

    def submit(self, fn, *args, **kwargs):
        if self.is_shutdown:
            raise RuntimeError("cannot submit after shutdown")
        try:
            return DoneFuture(value=fn(*args, **kwargs))
        except Exception as exc:
            return DoneFuture(error=exc)

    def shutdown(self, wait=True):
        self.is_shutdown = True

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.shutdown()


class DoneFuture:
    """The outcome of a finished task."""

    def __init__(self, value=None, error=None):
        self._value = value
        self._error = error

    def done(self):
        return True

    def result(self):
        if self._error is not None:
            raise self._error
        return self._value
`

/* ---------------------------------------------------------------- starter */

const STARTER = withExecutor(py`
# An image is a list of rows (top to bottom); a row is a list of pixels (left
# to right). A pixel is an int 0..255 (grayscale) or an (r, g, b) tuple.


def grayscale(img):
    """Convert (r, g, b) pixels to ints: (299*r + 587*g + 114*b + 500) // 1000.

    Grayscale pixels pass through unchanged. Returns a new image.
    """
    raise NotImplementedError


def flip_horizontal(img):
    """Mirror the image left to right. Returns a new image."""
    raise NotImplementedError


def rotate_90(img):
    """Rotate the image 90 degrees clockwise. Returns a new image."""
    raise NotImplementedError


def crop(img, top, left, height, width):
    """The height x width block whose top-left pixel is img[top][left].

    Raises ValueError if the block doesn't fit inside the image or if height
    or width is less than 1. Returns a new image.
    """
    raise NotImplementedError
`)

/* ---------------------------------------------------------------- level 1 */

const L1_TESTS = py`
import copy as _l1_copy
import random as _l1_random


def _l1_img(h, w, seed=0, rgb=False):
    rng = _l1_random.Random(seed)
    if rgb:
        return [[(rng.randrange(256), rng.randrange(256), rng.randrange(256)) for _ in range(w)] for _ in range(h)]
    return [[rng.randrange(256) for _ in range(w)] for _ in range(h)]


def _l1_check(name, got, want):
    assert got == want, f"{name}\n  got:  {got!r}\n  want: {want!r}"


def test_l1_grayscale_primaries():
    img = [[(255, 0, 0), (0, 255, 0), (0, 0, 255)], [(0, 0, 0), (255, 255, 255), (10, 10, 10)]]
    _l1_check("grayscale of red, green, blue / black, white, dark gray", grayscale(img), [[76, 150, 29], [0, 255, 10]])


def test_l1_grayscale_rounds_half_up():
    got = grayscale([[(0, 0, 250), (0, 36, 12)]])
    assert got == [[29, 23]], (
        f"both pixels sit exactly on .5 (28.5 and 22.5) and must round up to [[29, 23]], got {got!r}. "
        "round() rounds halves to even and floats drift: use (299*r + 587*g + 114*b + 500) // 1000"
    )


def test_l1_grayscale_passes_gray_through():
    img = [[0, 128], [255, 7]]
    got = grayscale(img)
    _l1_check("grayscale of a grayscale image", got, [[0, 128], [255, 7]])
    assert got is not img, "return a new image, not the input itself"


def test_l1_grayscale_random_pixels():
    img = _l1_img(12, 9, seed=3, rgb=True)
    want = [[(299 * r + 587 * g + 114 * b + 500) // 1000 for r, g, b in row] for row in img]
    _l1_check("grayscale of a random 12x9 image", grayscale(img), want)


def test_l1_flip_horizontal():
    _l1_check("flip_horizontal([[1, 2, 3], [4, 5, 6]])", flip_horizontal([[1, 2, 3], [4, 5, 6]]), [[3, 2, 1], [6, 5, 4]])
    rgb = [[(1, 1, 1), (2, 2, 2)]]
    _l1_check("flip_horizontal of an RGB row", flip_horizontal(rgb), [[(2, 2, 2), (1, 1, 1)]])


def test_l1_flip_twice_is_identity():
    img = _l1_img(6, 5, seed=4)
    _l1_check("flip_horizontal(flip_horizontal(img))", flip_horizontal(flip_horizontal(img)), img)


def test_l1_rotate_90_clockwise():
    _l1_check("rotate_90([[1, 2, 3], [4, 5, 6]])", rotate_90([[1, 2, 3], [4, 5, 6]]), [[4, 1], [5, 2], [6, 3]])


def test_l1_rotate_changes_shape():
    _l1_check("rotate_90 of a 1x4 image", rotate_90([[1, 2, 3, 4]]), [[1], [2], [3], [4]])
    _l1_check("rotate_90 of a 4x1 image", rotate_90([[1], [2], [3], [4]]), [[4, 3, 2, 1]])
    _l1_check("rotate_90 of a 1x1 image", rotate_90([[(9, 8, 7)]]), [[(9, 8, 7)]])


def test_l1_rotate_four_times_is_identity():
    img = _l1_img(5, 7, seed=5, rgb=True)
    out = img
    for _ in range(4):
        out = rotate_90(out)
    _l1_check("four rotations", out, img)
    rows = rotate_90(img)
    assert all(isinstance(row, list) for row in rows), "rows must be lists (zip gives tuples: convert them)"


def test_l1_crop():
    img = [[10 * y + x for x in range(5)] for y in range(5)]
    _l1_check("crop(img, 1, 2, 2, 3)", crop(img, 1, 2, 2, 3), [[12, 13, 14], [22, 23, 24]])
    _l1_check("crop(img, 4, 0, 1, 1)", crop(img, 4, 0, 1, 1), [[40]])


def test_l1_crop_whole_image():
    img = _l1_img(3, 4, seed=6)
    _l1_check("crop of the whole image", crop(img, 0, 0, 3, 4), img)


def test_l1_crop_out_of_bounds_raises():
    img = [[1, 2, 3], [4, 5, 6]]
    for args in [(0, 0, 3, 1), (0, 0, 1, 4), (-1, 0, 1, 1), (0, -1, 1, 1), (1, 2, 1, 2), (2, 0, 1, 1), (0, 0, 0, 1), (0, 0, 1, 0)]:
        try:
            crop(img, *args)
        except ValueError:
            continue
        raise AssertionError(f"crop(img, {', '.join(map(str, args))}) on a 2x3 image should raise ValueError")


def test_l1_inputs_untouched_outputs_independent():
    for name, fn in [("grayscale", grayscale), ("flip_horizontal", flip_horizontal),
                     ("rotate_90", rotate_90), ("crop", lambda im: crop(im, 0, 0, 2, 2))]:
        img = [[1, 2, 3], [4, 5, 6]]
        before = _l1_copy.deepcopy(img)
        out = fn(img)
        assert img == before, f"{name} modified its input"
        out[0][0] = 99
        assert img == before, f"{name}'s output shares rows with its input: changing the output changed the input"
`

const L1_SOLUTION = withExecutor(py`
# An image is a list of rows (top to bottom); a row is a list of pixels (left
# to right). A pixel is an int 0..255 (grayscale) or an (r, g, b) tuple.


def _luma(pixel):
    if isinstance(pixel, int):
        return pixel
    r, g, b = pixel
    return (299 * r + 587 * g + 114 * b + 500) // 1000  # integer math: halves round up


def grayscale(img):
    return [[_luma(p) for p in row] for row in img]


def flip_horizontal(img):
    return [row[::-1] for row in img]


def rotate_90(img):
    """Clockwise: the bottom row becomes the left column."""
    return [list(column) for column in zip(*img[::-1])]


def crop(img, top, left, height, width):
    if height < 1 or width < 1 or top < 0 or left < 0 or top + height > len(img) or left + width > len(img[0]):
        raise ValueError("the crop rectangle must lie inside the image")
    return [row[left:left + width] for row in img[top:top + height]]
`)

const level1: LabLevel = {
  title: 'Pixels in, pixels out',
  spec: `An image is a list of rows, top to bottom, and each row is a list of pixels, left to right. A pixel is an \`int\` from 0 to 255 (grayscale) or an \`(r, g, b)\` tuple (color). Every image has at least one row and one column, and all its rows have the same length.

Write four transforms. Each returns a **new** image and never modifies its input.

- \`grayscale(img)\`: turn every \`(r, g, b)\` into the int \`(299*r + 587*g + 114*b + 500) // 1000\`. Those are the standard luminance weights (0.299, 0.587, 0.114), rounded half up in integer math. Grayscale pixels pass through unchanged.
- \`flip_horizontal(img)\`: mirror left to right.
- \`rotate_90(img)\`: rotate **clockwise**. An image \`h\` rows tall and \`w\` wide becomes \`w\` rows tall and \`h\` wide.
- \`crop(img, top, left, height, width)\`: the \`height × width\` block whose top-left pixel is \`img[top][left]\`. Raise \`ValueError\` if the block doesn't fit inside the image, or if \`height\` or \`width\` is less than 1.

Examples with \`img = [[1, 2, 3], [4, 5, 6]]\`:

\`flip_horizontal(img)\` → \`[[3, 2, 1], [6, 5, 4]]\`
\`rotate_90(img)\` → \`[[4, 1], [5, 2], [6, 3]]\`
\`crop(img, 0, 1, 2, 2)\` → \`[[2, 3], [5, 6]]\`
\`grayscale([[(255, 0, 0), (10, 10, 10)]])\` → \`[[76, 10]]\``,
  tests: L1_TESTS,
  hints: [
    '`row[::-1]` reverses a row into a new list. Build every output row fresh, so the result never shares a row with the input.',
    'Clockwise, the bottom-left pixel ends up top-left. `zip(*img[::-1])` yields the new rows as tuples; turn each into a list.',
    'Check the crop bounds before slicing. Slices clamp silently: on a 3-row image, `img[5:9]` is just `[]`, not an error.',
  ],
  solution: L1_SOLUTION,
}

/* ---------------------------------------------------------------- level 2 */

const L2_TESTS = py`
import copy as _l2_copy
import random as _l2_random
from functools import partial as _l2_partial


def _l2_reference_blur(img, radius):
    h, w = len(img), len(img[0])
    n = (2 * radius + 1) ** 2
    out = []
    for y in range(h):
        row = []
        for x in range(w):
            total = 0
            for dy in range(-radius, radius + 1):
                src = img[min(max(y + dy, 0), h - 1)]
                for dx in range(-radius, radius + 1):
                    total += src[min(max(x + dx, 0), w - 1)]
            row.append((total + n // 2) // n)
        out.append(row)
    return out


def _l2_check(name, got, want):
    assert got == want, f"{name}\n  got:  {got!r}\n  want: {want!r}"


def test_l2_blur_spec_example():
    img = [[0, 0, 0], [0, 90, 0], [0, 0, 0]]
    _l2_check("box_blur(img, 1)", box_blur(img, 1), [[10, 10, 10], [10, 10, 10], [10, 10, 10]])


def test_l2_blur_clamps_at_edges():
    got = box_blur([[0, 0, 90]], 1)
    assert got == [[0, 30, 60]], (
        f"box_blur([[0, 0, 90]], 1) should be [[0, 30, 60]], got {got!r}. Outside the image, reuse the nearest "
        "edge pixel, so every window has exactly 9 samples"
    )


def test_l2_blur_rounds_to_nearest():
    got = box_blur([[0, 0, 0], [0, 5, 0], [0, 0, 0]], 1)
    assert got == [[1, 1, 1], [1, 1, 1], [1, 1, 1]], (
        f"every window averages 5/9 = 0.56, which rounds to 1; got {got!r}"
    )


def test_l2_blur_constant_image_unchanged():
    img = [[77] * 6 for _ in range(4)]
    _l2_check("box_blur of a constant image", box_blur(img, 2), img)


def test_l2_blur_radius_zero_is_a_copy():
    img = [[1, 2], [3, 4]]
    got = box_blur(img, 0)
    _l2_check("box_blur(img, 0)", got, img)
    got[0][0] = 99
    assert img == [[1, 2], [3, 4]], "box_blur(img, 0) must return a copy, not the input's rows"


def test_l2_blur_radius_bigger_than_image():
    img = [[0, 100], [100, 200]]
    _l2_check("box_blur(img, 5)", box_blur(img, 5), _l2_reference_blur(img, 5))


def test_l2_blur_negative_radius_raises():
    try:
        box_blur([[1]], -1)
    except ValueError:
        return
    raise AssertionError("box_blur with a negative radius should raise ValueError")


def test_l2_blur_random_images():
    rng = _l2_random.Random(11)
    for _ in range(8):
        h, w, r = rng.randrange(1, 12), rng.randrange(1, 12), rng.randrange(0, 4)
        img = [[rng.randrange(256) for _ in range(w)] for _ in range(h)]
        before = _l2_copy.deepcopy(img)
        _l2_check(f"box_blur of a random {h}x{w} image, radius {r}", box_blur(img, r), _l2_reference_blur(img, r))
        assert img == before, "box_blur modified its input"


def test_l2_compose_runs_left_to_right():
    first_pixel = _l2_partial(crop, top=0, left=0, height=1, width=1)
    f = compose(flip_horizontal, first_pixel)
    got = f([[1, 2, 3]])
    assert got == [[3]], f"compose(flip_horizontal, first_pixel) flips first, then crops: want [[3]], got {got!r}"


def test_l2_compose_nothing_is_identity():
    img = [[1, 2], [3, 4]]
    _l2_check("compose()(img)", compose()(img), img)


def test_l2_compose_is_reusable():
    turn_around = compose(rotate_90, rotate_90)
    a = turn_around([[1, 2], [3, 4]])
    b = turn_around([[5, 6, 7]])
    _l2_check("first call", a, [[4, 3], [2, 1]])
    _l2_check("second call", b, [[7, 6, 5]])


def test_l2_apply_pipeline():
    rng = _l2_random.Random(12)
    img = [[(rng.randrange(256), rng.randrange(256), rng.randrange(256)) for _ in range(6)] for _ in range(5)]
    ops = [grayscale, _l2_partial(box_blur, radius=1), flip_horizontal, rotate_90]
    want = rotate_90(flip_horizontal(_l2_reference_blur(grayscale(img), 1)))
    _l2_check("apply_pipeline(img, ops)", apply_pipeline(img, ops), want)
    _l2_check("compose(*ops)(img)", compose(*ops)(img), want)


def test_l2_apply_empty_pipeline():
    _l2_check("apply_pipeline(img, [])", apply_pipeline([[5, 6]], []), [[5, 6]])
`

const L2_SOLUTION = withExecutor(py`
# An image is a list of rows (top to bottom); a row is a list of pixels (left
# to right). A pixel is an int 0..255 (grayscale) or an (r, g, b) tuple.


def _luma(pixel):
    if isinstance(pixel, int):
        return pixel
    r, g, b = pixel
    return (299 * r + 587 * g + 114 * b + 500) // 1000  # integer math: halves round up


def grayscale(img):
    return [[_luma(p) for p in row] for row in img]


def flip_horizontal(img):
    return [row[::-1] for row in img]


def rotate_90(img):
    """Clockwise: the bottom row becomes the left column."""
    return [list(column) for column in zip(*img[::-1])]


def crop(img, top, left, height, width):
    if height < 1 or width < 1 or top < 0 or left < 0 or top + height > len(img) or left + width > len(img[0]):
        raise ValueError("the crop rectangle must lie inside the image")
    return [row[left:left + width] for row in img[top:top + height]]


def box_blur(img, radius):
    """Mean of the (2r+1) x (2r+1) window around each pixel, edges clamped."""
    if radius < 0:
        raise ValueError("radius must be >= 0")
    h, w = len(img), len(img[0])
    n = (2 * radius + 1) ** 2
    offsets = range(-radius, radius + 1)
    out = []
    for y in range(h):
        rows = [img[min(max(y + dy, 0), h - 1)] for dy in offsets]
        out_row = []
        for x in range(w):
            cols = [min(max(x + dx, 0), w - 1) for dx in offsets]
            total = sum(row[c] for row in rows for c in cols)
            out_row.append((total + n // 2) // n)  # n is odd, so there are no .5 ties
        out.append(out_row)
    return out


def compose(*ops):
    """One function that applies ops left to right."""
    def pipeline(img):
        for op in ops:
            img = op(img)
        return img
    return pipeline


def apply_pipeline(img, ops):
    return compose(*ops)(img)
`)

const level2: LabLevel = {
  title: 'Blur and pipelines',
  spec: `Two pieces: a real filter, and a way to chain transforms.

\`box_blur(img, radius)\` works on grayscale images:

- Each output pixel is the **average** of the square window of side \`2*radius + 1\` centered on it, rounded to the nearest int.
- Near the border the window sticks out of the image. **Clamp**: a coordinate past an edge uses the nearest edge pixel, so every window holds exactly \`(2*radius + 1) ** 2\` samples.
- \`radius == 0\` returns a copy. A negative radius raises \`ValueError\`. A radius bigger than the image is fine: clamping handles it.

\`compose(*ops)\` returns one function that applies \`ops\` **left to right**, so \`compose(f, g)(img) == g(f(img))\`. With no ops it returns the image unchanged.

\`apply_pipeline(img, ops)\` applies the list \`ops\` in order. It's \`compose(*ops)(img)\`.

An op is any function that takes one image and returns one. For parameters, use \`functools.partial(box_blur, radius=1)\` or a lambda.

Examples:

\`box_blur([[0, 0, 0], [0, 90, 0], [0, 0, 0]], 1)\` → \`[[10, 10, 10], [10, 10, 10], [10, 10, 10]]\`
Every clamped 3×3 window holds the 90 exactly once, and 90 / 9 = 10.

\`box_blur([[0, 0, 90]], 1)\` → \`[[0, 30, 60]]\`
The right pixel's window repeats the 90 in place of the missing column: 6 × 90 / 9 = 60.`,
  tests: L2_TESTS,
  hints: [
    'Clamp an index with `min(max(i, 0), n - 1)`. Loop `dy` and `dx` over `range(-radius, radius + 1)` and add up the clamped samples.',
    'Round with `(total + n // 2) // n`. Since `n` is odd, the average is never exactly halfway, so `round(total / n)` agrees.',
    '`compose` returns an inner function that loops over `ops`, feeding each output into the next op.',
  ],
  solution: L2_SOLUTION,
}

/* ---------------------------------------------------------------- level 3 */

const L3_TESTS = py`
import copy as _l3_copy
import random as _l3_random


def _l3_numbered(h, w):
    return [[10 * y + x for x in range(w)] for y in range(h)]


def _l3_random_img(rng, h, w):
    return [[rng.randrange(256) for _ in range(w)] for _ in range(h)]


def _l3_tiles(img, th, tw, overlap):
    tiles = split_tiles(img, th, tw, overlap)
    assert isinstance(tiles, list), f"split_tiles should return a list, got {type(tiles).__name__}"
    return tiles


def test_l3_tile_grid_in_row_major_order():
    tiles = _l3_tiles(_l3_numbered(5, 7), 2, 3, 0)
    got = [(t["top"], t["left"]) for t in tiles]
    want = [(0, 0), (0, 3), (0, 6), (2, 0), (2, 3), (2, 6), (4, 0), (4, 3), (4, 6)]
    assert got == want, f"(top, left) of each tile\n  got:  {got}\n  want: {want}"


def test_l3_edge_tiles_are_cut_short():
    tiles = _l3_tiles(_l3_numbered(5, 7), 2, 3, 0)
    got = [(t["height"], t["width"]) for t in tiles]
    want = [(2, 3), (2, 3), (2, 1), (2, 3), (2, 3), (2, 1), (1, 3), (1, 3), (1, 1)]
    assert got == want, f"(height, width) of each tile's core\n  got:  {got}\n  want: {want}"


def test_l3_no_overlap_pixels_are_the_core():
    img = _l3_numbered(5, 7)
    for t in _l3_tiles(img, 2, 3, 0):
        want = [row[t["left"]:t["left"] + t["width"]] for row in img[t["top"]:t["top"] + t["height"]]]
        assert t["pixels"] == want, f"tile at ({t['top']}, {t['left']}) with overlap 0: pixels {t['pixels']}, want {want}"
        assert t["pad_top"] == 0 and t["pad_left"] == 0, "with overlap 0, pad_top and pad_left are 0"


def test_l3_spec_example_middle_tile():
    img = _l3_numbered(5, 7)
    t = _l3_tiles(img, 2, 3, 1)[4]
    got = {k: t[k] for k in ("top", "left", "height", "width", "pad_top", "pad_left")}
    want = {"top": 2, "left": 3, "height": 2, "width": 3, "pad_top": 1, "pad_left": 1}
    assert got == want, f"middle tile\n  got:  {got}\n  want: {want}"
    pixels = [row[2:7] for row in img[1:5]]
    assert t["pixels"] == pixels, f"middle tile pixels: rows 1..4, columns 2..6\n  got:  {t['pixels']}\n  want: {pixels}"


def test_l3_overlap_clipped_at_image_edges():
    img = _l3_numbered(6, 6)
    tiles = _l3_tiles(img, 3, 3, 2)
    first, last = tiles[0], tiles[-1]
    assert (first["pad_top"], first["pad_left"]) == (0, 0), f"the top-left tile has no room for padding above or left: {first}"
    assert first["pixels"] == [row[0:5] for row in img[0:5]], f"top-left tile pixels: {first['pixels']}"
    assert (last["pad_top"], last["pad_left"]) == (2, 2), f"bottom-right tile pads: {last['pad_top']}, {last['pad_left']}"
    assert last["pixels"] == [row[1:6] for row in img[1:6]], f"bottom-right tile pixels: {last['pixels']}"


def test_l3_tile_bigger_than_image():
    img = _l3_numbered(3, 4)
    tiles = _l3_tiles(img, 10, 10, 2)
    assert len(tiles) == 1, f"one tile covers everything, got {len(tiles)}"
    t = tiles[0]
    got = (t["top"], t["left"], t["height"], t["width"], t["pad_top"], t["pad_left"])
    assert got == (0, 0, 3, 4, 0, 0) and t["pixels"] == img, f"got {t}"


def test_l3_tiles_are_copies():
    for th, tw, overlap in [(2, 2, 1), (3, 10, 0), (1, 4, 2)]:
        img = _l3_numbered(4, 4)
        for t in _l3_tiles(img, th, tw, overlap):
            t["pixels"][0][0] = -1
        assert img == _l3_numbered(4, 4), (
            f"changing a tile's pixels changed the image (tile_h={th}, tile_w={tw}, overlap={overlap}): copy the rows"
        )


def test_l3_invalid_arguments():
    img = _l3_numbered(3, 3)
    for args in [(0, 2, 0), (2, 0, 0), (2, 2, -1)]:
        try:
            split_tiles(img, *args)
        except ValueError:
            continue
        raise AssertionError(f"split_tiles(img, {args[0]}, {args[1]}, {args[2]}) should raise ValueError")


def test_l3_round_trip():
    rng = _l3_random.Random(21)
    for _ in range(12):
        h, w = rng.randrange(1, 10), rng.randrange(1, 10)
        img = _l3_random_img(rng, h, w)
        th, tw, overlap = rng.randrange(1, 6), rng.randrange(1, 6), rng.randrange(0, 4)
        got = merge_tiles(split_tiles(img, th, tw, overlap))
        assert got == img, f"merge_tiles(split_tiles(img, {th}, {tw}, {overlap})) on a {h}x{w} image gave back something else"


def test_l3_round_trip_rgb():
    img = [[(y, x, y * x) for x in range(5)] for y in range(4)]
    got = merge_tiles(split_tiles(img, 3, 2, 1))
    assert got == img, "split and merge should work for RGB pixels too"


def test_l3_merge_in_any_order():
    img = _l3_numbered(7, 5)
    tiles = split_tiles(img, 3, 2, 1)
    _l3_random.Random(3).shuffle(tiles)
    assert merge_tiles(tiles) == img, "merge_tiles must place each tile by its top/left, whatever the list order"
    assert merge_tiles([]) == [], "merge_tiles([]) should be []"


def test_l3_blur_tiled_equals_box_blur():
    rng = _l3_random.Random(31)
    img = _l3_random_img(rng, 9, 11)
    got = blur_tiled(img, 2, 4, 3)
    want = box_blur(img, 2)
    assert got == want, "blur_tiled(img, 2, 4, 3) differs from box_blur(img, 2): split with overlap=radius"


def test_l3_blur_tiled_random():
    rng = _l3_random.Random(32)
    for _ in range(10):
        h, w = rng.randrange(1, 13), rng.randrange(1, 13)
        img = _l3_random_img(rng, h, w)
        before = _l3_copy.deepcopy(img)
        r, th, tw = rng.randrange(0, 4), rng.randrange(1, 6), rng.randrange(1, 6)
        got = blur_tiled(img, r, th, tw)
        assert got == box_blur(img, r), f"blur_tiled(img, {r}, {th}, {tw}) on a {h}x{w} image differs from box_blur"
        assert img == before, "blur_tiled modified its input"
`

const L3_SOLUTION = withExecutor(py`
# An image is a list of rows (top to bottom); a row is a list of pixels (left
# to right). A pixel is an int 0..255 (grayscale) or an (r, g, b) tuple.


def _luma(pixel):
    if isinstance(pixel, int):
        return pixel
    r, g, b = pixel
    return (299 * r + 587 * g + 114 * b + 500) // 1000  # integer math: halves round up


def grayscale(img):
    return [[_luma(p) for p in row] for row in img]


def flip_horizontal(img):
    return [row[::-1] for row in img]


def rotate_90(img):
    """Clockwise: the bottom row becomes the left column."""
    return [list(column) for column in zip(*img[::-1])]


def crop(img, top, left, height, width):
    if height < 1 or width < 1 or top < 0 or left < 0 or top + height > len(img) or left + width > len(img[0]):
        raise ValueError("the crop rectangle must lie inside the image")
    return [row[left:left + width] for row in img[top:top + height]]


def box_blur(img, radius):
    """Mean of the (2r+1) x (2r+1) window around each pixel, edges clamped."""
    if radius < 0:
        raise ValueError("radius must be >= 0")
    h, w = len(img), len(img[0])
    n = (2 * radius + 1) ** 2
    offsets = range(-radius, radius + 1)
    out = []
    for y in range(h):
        rows = [img[min(max(y + dy, 0), h - 1)] for dy in offsets]
        out_row = []
        for x in range(w):
            cols = [min(max(x + dx, 0), w - 1) for dx in offsets]
            total = sum(row[c] for row in rows for c in cols)
            out_row.append((total + n // 2) // n)  # n is odd, so there are no .5 ties
        out.append(out_row)
    return out


def compose(*ops):
    """One function that applies ops left to right."""
    def pipeline(img):
        for op in ops:
            img = op(img)
        return img
    return pipeline


def apply_pipeline(img, ops):
    return compose(*ops)(img)


def split_tiles(img, tile_h, tile_w, overlap=0):
    """Row-major tiles: each core plus up to overlap pixels of margin on every side."""
    if tile_h < 1 or tile_w < 1 or overlap < 0:
        raise ValueError("tile sizes must be >= 1 and overlap >= 0")
    h, w = len(img), len(img[0])
    tiles = []
    for top in range(0, h, tile_h):
        for left in range(0, w, tile_w):
            height, width = min(tile_h, h - top), min(tile_w, w - left)
            y0, x0 = max(top - overlap, 0), max(left - overlap, 0)
            y1, x1 = min(top + height + overlap, h), min(left + width + overlap, w)
            tiles.append({
                "top": top, "left": left, "height": height, "width": width,
                "pad_top": top - y0, "pad_left": left - x0,
                "pixels": [row[x0:x1] for row in img[y0:y1]],
            })
    return tiles


def merge_tiles(tiles):
    """Stitch the tiles' cores back into one image."""
    h = max((t["top"] + t["height"] for t in tiles), default=0)
    w = max((t["left"] + t["width"] for t in tiles), default=0)
    out = [[None] * w for _ in range(h)]
    for t in tiles:
        for dy in range(t["height"]):
            src = t["pixels"][t["pad_top"] + dy]
            out[t["top"] + dy][t["left"]:t["left"] + t["width"]] = src[t["pad_left"]:t["pad_left"] + t["width"]]
    return out


def blur_tiled(img, radius, tile_h, tile_w):
    """box_blur computed tile by tile: overlap=radius gives every core pixel its full window."""
    tiles = split_tiles(img, tile_h, tile_w, overlap=radius)
    return merge_tiles([{**t, "pixels": box_blur(t["pixels"], radius)} for t in tiles])
`)

const level3: LabLevel = {
  title: 'Tiles for parallelism',
  spec: `A 50-megapixel photo is one big task. To blur it on 8 cores, cut it into **tiles**, blur each tile independently, and stitch the results back together. The catch: a pixel near a tile's edge needs neighbors from the next tile, so each tile carries an **overlap** margin.

\`split_tiles(img, tile_h, tile_w, overlap=0)\` returns a list of tile dicts in row-major order (left to right, then top to bottom):

- \`"top"\`, \`"left"\`: where the tile's **core** starts in the image. Cores start at multiples of \`tile_h\` and \`tile_w\`, and together they cover every pixel exactly once.
- \`"height"\`, \`"width"\`: the core's size. It's \`tile_h × tile_w\`, cut short at the bottom and right edges.
- \`"pixels"\`: the core plus up to \`overlap\` extra rows and columns on **every** side, clipped to the image. Copy them; don't share rows with \`img\`.
- \`"pad_top"\`, \`"pad_left"\`: how many overlap rows and columns \`pixels\` holds above and to the left of the core.

Raise \`ValueError\` if \`tile_h\` or \`tile_w\` is less than 1, or \`overlap\` is negative.

\`merge_tiles(tiles)\` rebuilds the image from the cores (found in \`pixels\` using the pads), whatever order the tiles come in. \`merge_tiles([])\` is \`[]\`.

\`blur_tiled(img, radius, tile_h, tile_w)\` splits with \`overlap=radius\`, runs \`box_blur\` on each tile's pixels, and merges. The result must equal \`box_blur(img, radius)\` **exactly**: with that much overlap, every core pixel sees the same neighbors it has in the whole image.

Example: a 5×7 image split with \`tile_h=2, tile_w=3, overlap=1\` gives 9 tiles. The middle one has \`top=2, left=3, height=2, width=3, pad_top=1, pad_left=1\`, and its \`pixels\` are rows 1 to 4 and columns 2 to 6 of the image, a 4×5 block.`,
  tests: L3_TESTS,
  hints: [
    'Loop `top` over `range(0, h, tile_h)` and `left` over `range(0, w, tile_w)`. The padded block runs from `max(top - overlap, 0)` to `min(top + height + overlap, h)`, and the same way for columns.',
    "`pad_top` is `top` minus the padded block's first row: `overlap` for an interior tile, less at the image's top edge.",
    "In `merge_tiles`, size the output from the largest `top + height` and `left + width`, then copy each core row: row `pad_top + dy` of `pixels`, sliced from `pad_left` to `pad_left + width`.",
  ],
  solution: L3_SOLUTION,
}

/* ---------------------------------------------------------------- level 4 */

const L4_TESTS = py`
import copy as _l4_copy
from functools import partial as _l4_partial


class _L4Future:
    def __init__(self, executor, fn, args, kwargs):
        self._executor, self._call = executor, (fn, args, kwargs)
        self.ran, self._value, self._error = False, None, None

    def _run(self):
        fn, args, kwargs = self._call
        try:
            self._value = fn(*args, **kwargs)
        except Exception as exc:
            self._error = exc
        self.ran = True

    def done(self):
        return self.ran

    def result(self):
        self._executor._collect(self)
        if self._error is not None:
            raise self._error
        return self._value


class _L4LazyExecutor:
    """A test double for a pool: tasks run only when some result is requested,
    newest first, so they finish in a different order than they were submitted."""

    def __init__(self, probe=None):
        self.submitted = 0
        self.pending = []  # submitted, result() not called yet
        self.peak_pending = 0
        self.shutdown_called = False
        self.probe, self.probed = probe, None

    def submit(self, fn, *args, **kwargs):
        if self.shutdown_called:
            raise RuntimeError("submit after shutdown")
        future = _L4Future(self, fn, args, kwargs)
        self.submitted += 1
        self.pending.append(future)
        self.peak_pending = max(self.peak_pending, len(self.pending))
        return future

    def _collect(self, future):
        if self.probe is not None and self.probed is None:
            self.probed = self.probe()
        for f in reversed(self.pending):
            if not f.ran:
                f._run()
        if future in self.pending:
            self.pending.remove(future)

    def shutdown(self, wait=True):
        self.shutdown_called = True


def _l4_images(n):
    return [[[(i * 7 + x * 3) % 256 for x in range(4)] for _ in range(3)] for i in range(n)]


def _l4_ops():
    return [_l4_partial(box_blur, radius=1), flip_horizontal]


def test_l4_default_executor_results():
    images, ops = _l4_images(5), _l4_ops()
    got = process_batch(images, ops)
    want = [apply_pipeline(img, ops) for img in images]
    assert got == want, "process_batch(images, ops) should equal [apply_pipeline(img, ops) for img in images]"


def test_l4_results_in_input_order():
    images, ops = _l4_images(9), _l4_ops()
    ex = _L4LazyExecutor()
    got = process_batch(images, ops, workers=3, executor=ex)
    want = [apply_pipeline(img, ops) for img in images]
    assert got == want, "results must come back in input order, even when tasks finish in a different order"


def test_l4_one_task_per_image():
    images = _l4_images(7)
    ex = _L4LazyExecutor()
    process_batch(images, _l4_ops(), executor=ex)
    assert ex.submitted == 7, f"submit one task per image (the whole pipeline): 7 images, {ex.submitted} submits"


def test_l4_leaves_callers_executor_open():
    ex = _L4LazyExecutor()
    process_batch(_l4_images(3), _l4_ops(), executor=ex)
    assert not ex.shutdown_called, "the caller passed this executor in and still owns it: don't shut it down"


def test_l4_owns_the_default_executor():
    made = []
    original = SequentialExecutor

    class Spy(original):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            made.append(self)

    def boom(img):
        raise RuntimeError("bad image")

    globals()["SequentialExecutor"] = Spy
    try:
        process_batch(_l4_images(2), _l4_ops(), workers=3)
        try:
            process_batch(_l4_images(2), [boom])
        except RuntimeError:
            pass
    finally:
        globals()["SequentialExecutor"] = original
    assert len(made) == 2, (
        f"with executor=None, create a new SequentialExecutor on each call ({len(made)} created for 2 calls; "
        "a default argument value is created only once)"
    )
    assert made[0].max_workers == 3, f"pass workers through as max_workers: got {made[0].max_workers!r}"
    assert made[0].is_shutdown, "shut down the executor you created once the batch is done"
    assert made[1].is_shutdown, "shut down the executor you created even when a task raises (try/finally)"


def test_l4_bounded_in_flight():
    ex = _L4LazyExecutor()
    got = process_batch(_l4_images(12), [], workers=4, executor=ex, max_in_flight=3)
    assert len(got) == 12, f"expected 12 results, got {len(got)}"
    assert ex.peak_pending <= 3, (
        f"max_in_flight=3, but {ex.peak_pending} tasks were submitted and not yet collected at once"
    )


def test_l4_keeps_the_pool_busy():
    ex = _L4LazyExecutor()
    process_batch(_l4_images(20), [], workers=3, executor=ex)
    assert ex.peak_pending == 6, (
        f"the default window is 2 * workers = 6 tasks in flight; the peak was {ex.peak_pending}. "
        "Fill the whole window before you collect a result: collecting early leaves workers idle"
    )


def test_l4_pulls_input_lazily():
    pulled = [0]

    def stream():
        for img in _l4_images(30):
            pulled[0] += 1
            yield img

    ex = _L4LazyExecutor(probe=lambda: pulled[0])
    got = process_batch(stream(), [], workers=2, executor=ex, max_in_flight=3)
    assert len(got) == 30, f"expected 30 results, got {len(got)}"
    assert ex.probed is not None and ex.probed <= 4, (
        f"images can be a lazy stream: when the first result was collected you had pulled {ex.probed} images, "
        "but with max_in_flight=3 you only need 4"
    )


def test_l4_task_errors_propagate():
    def picky(img):
        if img[0][0] == 3:
            raise ValueError("cannot process this one")
        return img

    try:
        process_batch([[[1]], [[2]], [[3]], [[4]]], [picky], executor=_L4LazyExecutor())
    except ValueError:
        return
    raise AssertionError("a task that raises should make process_batch raise the same exception")


def test_l4_empty_batch():
    ex = _L4LazyExecutor()
    got = process_batch([], _l4_ops(), executor=ex)
    assert got == [] and ex.submitted == 0, f"no images, no tasks: got {got!r} with {ex.submitted} submits"


def test_l4_invalid_arguments():
    for kwargs in ({"workers": 0}, {"max_in_flight": 0}):
        try:
            process_batch(_l4_images(1), [], **kwargs)
        except ValueError:
            continue
        raise AssertionError(f"process_batch(..., {kwargs}) should raise ValueError")


def test_l4_inputs_untouched():
    images = _l4_images(4)
    before = _l4_copy.deepcopy(images)
    process_batch(images, [_l4_partial(box_blur, radius=2), rotate_90], executor=_L4LazyExecutor())
    assert images == before, "process_batch modified the input images"


def test_l4_tiled_blur_in_a_batch():
    images = [[[(x * y + i) % 256 for x in range(9)] for y in range(7)] for i in range(4)]
    rgb = [[[(p, p // 2, 255 - p) for p in row] for row in img] for img in images]
    ops = [grayscale, _l4_partial(blur_tiled, radius=1, tile_h=3, tile_w=4)]
    got = process_batch(rgb, ops, workers=2, executor=_L4LazyExecutor())
    want = [box_blur(grayscale(img), 1) for img in rgb]
    assert got == want, "a batch of grayscale + blur_tiled should match box_blur on each image"
`

const L4_SOLUTION = withExecutor(py`
from collections import deque

# An image is a list of rows (top to bottom); a row is a list of pixels (left
# to right). A pixel is an int 0..255 (grayscale) or an (r, g, b) tuple.


def _luma(pixel):
    if isinstance(pixel, int):
        return pixel
    r, g, b = pixel
    return (299 * r + 587 * g + 114 * b + 500) // 1000  # integer math: halves round up


def grayscale(img):
    return [[_luma(p) for p in row] for row in img]


def flip_horizontal(img):
    return [row[::-1] for row in img]


def rotate_90(img):
    """Clockwise: the bottom row becomes the left column."""
    return [list(column) for column in zip(*img[::-1])]


def crop(img, top, left, height, width):
    if height < 1 or width < 1 or top < 0 or left < 0 or top + height > len(img) or left + width > len(img[0]):
        raise ValueError("the crop rectangle must lie inside the image")
    return [row[left:left + width] for row in img[top:top + height]]


def box_blur(img, radius):
    """Mean of the (2r+1) x (2r+1) window around each pixel, edges clamped."""
    if radius < 0:
        raise ValueError("radius must be >= 0")
    h, w = len(img), len(img[0])
    n = (2 * radius + 1) ** 2
    offsets = range(-radius, radius + 1)
    out = []
    for y in range(h):
        rows = [img[min(max(y + dy, 0), h - 1)] for dy in offsets]
        out_row = []
        for x in range(w):
            cols = [min(max(x + dx, 0), w - 1) for dx in offsets]
            total = sum(row[c] for row in rows for c in cols)
            out_row.append((total + n // 2) // n)  # n is odd, so there are no .5 ties
        out.append(out_row)
    return out


def compose(*ops):
    """One function that applies ops left to right."""
    def pipeline(img):
        for op in ops:
            img = op(img)
        return img
    return pipeline


def apply_pipeline(img, ops):
    return compose(*ops)(img)


def split_tiles(img, tile_h, tile_w, overlap=0):
    """Row-major tiles: each core plus up to overlap pixels of margin on every side."""
    if tile_h < 1 or tile_w < 1 or overlap < 0:
        raise ValueError("tile sizes must be >= 1 and overlap >= 0")
    h, w = len(img), len(img[0])
    tiles = []
    for top in range(0, h, tile_h):
        for left in range(0, w, tile_w):
            height, width = min(tile_h, h - top), min(tile_w, w - left)
            y0, x0 = max(top - overlap, 0), max(left - overlap, 0)
            y1, x1 = min(top + height + overlap, h), min(left + width + overlap, w)
            tiles.append({
                "top": top, "left": left, "height": height, "width": width,
                "pad_top": top - y0, "pad_left": left - x0,
                "pixels": [row[x0:x1] for row in img[y0:y1]],
            })
    return tiles


def merge_tiles(tiles):
    """Stitch the tiles' cores back into one image."""
    h = max((t["top"] + t["height"] for t in tiles), default=0)
    w = max((t["left"] + t["width"] for t in tiles), default=0)
    out = [[None] * w for _ in range(h)]
    for t in tiles:
        for dy in range(t["height"]):
            src = t["pixels"][t["pad_top"] + dy]
            out[t["top"] + dy][t["left"]:t["left"] + t["width"]] = src[t["pad_left"]:t["pad_left"] + t["width"]]
    return out


def blur_tiled(img, radius, tile_h, tile_w):
    """box_blur computed tile by tile: overlap=radius gives every core pixel its full window."""
    tiles = split_tiles(img, tile_h, tile_w, overlap=radius)
    return merge_tiles([{**t, "pixels": box_blur(t["pixels"], radius)} for t in tiles])


def process_batch(images, ops, workers=4, executor=None, max_in_flight=None):
    """Run the pipeline on every image through an executor; results in input order.

    At most max_in_flight tasks (default 2 * workers) are submitted and not yet
    collected, so a lazy stream of images is never pulled faster than needed.
    """
    if workers < 1:
        raise ValueError("workers must be >= 1")
    limit = 2 * workers if max_in_flight is None else max_in_flight
    if limit < 1:
        raise ValueError("max_in_flight must be >= 1")
    pipeline = compose(*ops)
    owned = executor is None
    if owned:
        executor = SequentialExecutor(max_workers=workers)
    results, in_flight = [], deque()
    try:
        for img in images:
            if len(in_flight) >= limit:
                results.append(in_flight.popleft().result())  # oldest first keeps input order
            in_flight.append(executor.submit(pipeline, img))
        while in_flight:
            results.append(in_flight.popleft().result())
    finally:
        if owned:
            executor.shutdown()
    return results
`)

const level4: LabLevel = {
  title: 'Batches through an executor',
  spec: `Now process many images. On a server you'd hand the work to a pool from \`concurrent.futures\`: a \`ThreadPoolExecutor\` or a \`ProcessPoolExecutor\`. The browser can't start threads or processes, so your code takes the executor as a **parameter**, and the tests pass in doubles that check how you use it. \`SequentialExecutor\` (provided) has the same interface and runs each task inline.

Write \`process_batch(images, ops, workers=4, executor=None, max_in_flight=None)\`:

- Apply the pipeline \`ops\` to every image, and return the results as a list **in input order**, whatever order the tasks finish in.
- Submit **one task per image**, with \`executor.submit(fn, img)\`, and collect it with \`future.result()\`. Use only \`submit\` and \`result\`: the doubles don't support \`map\` or \`as_completed\`.
- With \`executor=None\`, create a new \`SequentialExecutor(max_workers=workers)\` and shut it down when you're done, even if a task raises. Never shut down an executor the caller passed in: they own it.
- **Backpressure**: never have more than \`max_in_flight\` tasks submitted but not yet collected. The default is \`2 * workers\`. \`images\` may be a lazy generator over a huge folder, so pull the next image only when there's room for it.
- Keep the pool busy, though: fill the window. Submit until \`max_in_flight\` tasks are in flight (or the images run out) before you wait on a result, rather than waiting for each task before submitting the next.
- If a task raises, \`process_batch\` raises that exception.
- \`workers\` or \`max_in_flight\` below 1 raises \`ValueError\`.

Example: \`process_batch([img1, img2], [grayscale, partial(box_blur, radius=1)])\` returns \`[out1, out2]\`, where each \`out\` equals \`apply_pipeline(img, ops)\`.`,
  tests: L4_TESTS,
  hints: [
    'Picture a sliding window over the input: the futures you have submitted but not collected yet, in submission order. When the window is full, the result you need next is always the **oldest** one, and collecting oldest first is also what keeps the output in input order.',
    "A `collections.deque` holds the window. Before submitting the next image, if it already holds `max_in_flight` futures, `popleft()` the oldest and collect its `result()`. After the loop, drain what's left the same way.",
    'Wrap the loop in `try`/`finally` so an executor you created gets shut down even when a task raises. Create it inside the function: a default argument value is built only once and shared by every call.',
  ],
  solution: L4_SOLUTION,
}

/* -------------------------------------------------------------------- lab */

const lab: Lab = {
  id: 'image-ops',
  title: 'Image transform pipeline',
  area: 'builds',
  summary:
    'Build image transforms on plain lists of pixels, chain them into **pipelines**, split images into overlapping **tiles** that blur in parallel with exactly the same result, then push batches through an injected executor with **backpressure**.',
  minutes: 60,
  starter: STARTER,
  levels: [level1, level2, level3, level4],
  followUps: [
    'With a `ThreadPoolExecutor`, your pure-Python pixel loops barely speed up: the GIL lets only one thread run Python bytecode at a time. Why does `ProcessPoolExecutor` help, and what does it cost to pickle a 50-megapixel list of lists to a worker and back?',
    'NumPy and Pillow release the GIL inside their C loops. How does that change the threads-versus-processes decision? And how much faster is a vectorized box blur built on cumulative sums than your nested loops?',
    "`ProcessPoolExecutor` pickles the function it runs, but your `compose` returns a closure and a lambda can't be pickled. What breaks, and how would you restructure ops so they can cross a process boundary?",
    'Images arrive from a queue faster than you can process them. Where does `max_in_flight` sit in that design, what happens to memory without it, and what should the producer do while the window is full?',
  ],
}

export default lab
