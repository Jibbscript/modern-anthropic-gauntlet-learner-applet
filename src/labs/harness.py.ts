/**
 * The Python side of the code-lab runner, shipped as a string and executed
 * once inside Pyodide (see runner.ts). It must also run unchanged in CPython
 * 3.11+, which is how lab content is validated outside the browser:
 *
 *   result_json = asyncio.run(run_suite(user_code, tests_json, 5.0, report))
 *
 * Contract
 * - The learner's code is compiled as `solution.py` into a fresh module
 *   namespace (`sys.modules['solution']`, `__name__ == 'solution'`), so
 *   tracebacks carry the learner's own line numbers and `if __name__ ==
 *   '__main__':` demo blocks do not run.
 * - Each level's test source is compiled as `tests_l<N>.py` and exec'd into
 *   that same namespace, then its `test_*` functions run in definition order.
 *   Coroutine functions are awaited (with a per-test timeout); anything else
 *   is called directly. Sync tests run while an event loop is running (as in
 *   the browser), so user code must not call `asyncio.run()`.
 * - stdout/stderr are captured (capped) and also streamed to `report` in
 *   throttled chunks so a run killed by the watchdog still shows output.
 * - `report(json)` receives progress events: {type:'plan'}, {type:'start'},
 *   {type:'done'}, {type:'out'}. The final return value is a JSON string:
 *   {results:[{name, level, ok, error?, line?, trace?, ms}], stdout,
 *    error?, errorLine?, ms}
 *
 * Kept free of backticks and dollar-brace so it can live in String.raw.
 */
export const HARNESS_PY = String.raw`
import ast as _ast
import asyncio as _asyncio
import builtins as _builtins
import contextlib as _contextlib
import inspect as _inspect
import io as _io
import json as _json
import linecache as _linecache
import sys as _sys
import time as _time
import types as _types

USER_FILE = 'solution.py'
MAX_OUT = 20000
MAX_ERR = 700
FLUSH_EVERY = 0.12


class _Capture(_io.TextIOBase):
    """stdout/stderr sink: keeps the first MAX_OUT chars, streams chunks."""

    def __init__(self, emit):
        self._parts = []
        self._n = 0
        self._pending = []
        self._last = _time.perf_counter()
        self._flushes = 0
        self._emit = emit
        self.truncated = False

    def writable(self):
        return True

    def write(self, s):
        if not isinstance(s, str):
            s = str(s)
        room = MAX_OUT - self._n
        if room > 0:
            take = s[:room]
            self._parts.append(take)
            self._pending.append(take)
            self._n += len(take)
            if len(take) < len(s):
                self.truncated = True
        elif s:
            self.truncated = True
        now = _time.perf_counter()
        # the first writes go out at once (a hang right after a print still
        # shows it); after that, chunks are throttled
        if self._pending and (self._flushes < 64 or now - self._last > FLUSH_EVERY):
            self.flush_out()
        return len(s)

    def flush_out(self):
        if self._pending:
            chunk = ''.join(self._pending)
            self._pending = []
            self._last = _time.perf_counter()
            self._flushes += 1
            self._emit({'type': 'out', 's': chunk})

    def getvalue(self):
        out = ''.join(self._parts)
        if self.truncated:
            out += '\n... output truncated after %d characters' % MAX_OUT
        return out


def _register(filename, src):
    _linecache.cache[filename] = (len(src), None, src.splitlines(True), filename)


def _src_line(filename, lineno):
    try:
        return _linecache.getline(filename, lineno).strip()
    except Exception:
        return ''


def _frames(tb):
    out = []
    while tb is not None:
        code = tb.tb_frame.f_code
        out.append((code.co_filename, tb.tb_lineno, getattr(code, 'co_qualname', code.co_name)))
        tb = tb.tb_next
    return out


def _clip(s, n=MAX_ERR):
    return s if len(s) <= n else s[: n - 1] + '…'


def _head(e):
    name = type(e).__name__
    try:
        msg = str(e)
    except Exception:
        msg = ''
    return name + ': ' + msg if msg else name


def _trace(e, files):
    lines = []
    for fn, ln, q in _frames(e.__traceback__):
        if fn in files:
            lines.append('%s line %d, in %s' % (fn, ln, q))
            src = _src_line(fn, ln)
            if src:
                lines.append('    ' + src)
    lines.append(_head(e))
    return _clip('\n'.join(lines), 2400)


def _syntax_message(e):
    s = '%s: %s' % (type(e).__name__, e.msg)
    if e.lineno:
        s += ' (line %d)' % e.lineno
    text = (e.text or '').rstrip('\n')
    if text.strip():
        body = text.lstrip()
        s += '\n    ' + body
        if e.offset and e.offset > 0:
            col = e.offset - 1 - (len(text) - len(body))
            if 0 <= col <= len(body):
                s += '\n    ' + ' ' * col + '^'
    return s


def _describe(e, test_file):
    """concise failure text + the learner's line number when known"""
    frames = _frames(e.__traceback__)
    user = [f for f in frames if f[0] == USER_FILE]
    tests = [f for f in frames if f[0] == test_file]
    last = frames[-1] if frames else None
    line = user[-1][1] if user else None
    if isinstance(e, AssertionError) and last is not None and last[0] == test_file:
        msg = str(e)
        if msg:
            return _clip(msg), None
        src = _src_line(test_file, last[1])
        return _clip('Assertion failed: ' + src if src else 'Assertion failed'), None
    text = _head(e)
    if isinstance(e, NotImplementedError) and user and not str(e):
        text = 'NotImplementedError: %s is not implemented yet' % user[-1][2]
    if isinstance(e, RuntimeError) and "can't start new thread" in str(e):
        text += ' (threads cannot start in the browser runtime; locks work, and asyncio is available)'
    if user:
        fn, ln, q = user[-1]
        src = _src_line(USER_FILE, ln)
        text += '\n  at solution.py line %d, in %s' % (ln, q)
        if src:
            text += '\n    ' + src
    elif tests:
        src = _src_line(test_file, tests[-1][1])
        if src:
            text += '\n  in test: ' + src
    return _clip(text), line


def _plan(src):
    try:
        tree = _ast.parse(src)
    except SyntaxError:
        return []
    return [
        n.name
        for n in tree.body
        if isinstance(n, (_ast.FunctionDef, _ast.AsyncFunctionDef)) and n.name.startswith('test_')
    ]


def _load_user(code):
    mod = _types.ModuleType('solution')
    mod.__file__ = USER_FILE
    _sys.modules['solution'] = mod
    ns = mod.__dict__
    ns['__builtins__'] = _builtins
    _register(USER_FILE, code)
    try:
        compiled = compile(code, USER_FILE, 'exec')
    except SyntaxError as e:
        return ns, _syntax_message(e), e.lineno
    except (ValueError, TypeError) as e:
        return ns, _head(e), None
    try:
        exec(compiled, ns)
    except BaseException as e:
        if isinstance(e, SystemExit):
            return ns, 'SystemExit: your code called exit() while loading', None
        msg, line = _describe(e, '')
        frames = [f for f in _frames(e.__traceback__) if f[0] == USER_FILE]
        if frames:
            line = frames[-1][1]
        if isinstance(e, ImportError):
            msg += '\n  Only the Python standard library is available.'
        return ns, msg, line
    return ns, None, None


def _tasks():
    try:
        return set(_asyncio.all_tasks())
    except RuntimeError:
        return set()


async def _call(fn, timeout):
    """run one test; returns None or raises. Async tests get a timeout."""
    if _inspect.iscoroutinefunction(fn):
        aw = fn()
    else:
        aw = fn()
        if not _inspect.isawaitable(aw):
            return
    before = _tasks()
    task = _asyncio.ensure_future(aw)
    try:
        done, _ = await _asyncio.wait({task}, timeout=timeout)
        if not done:
            task.cancel()
            try:
                await _asyncio.wait({task}, timeout=0.5)
            except BaseException:
                pass
            raise _TestTimeout(
                'Timed out after %gs: an await never finished. Look for a missing set(), '
                'release() or task_done(), or a worker that never exits.' % timeout
            )
        task.result()
    finally:
        me = _asyncio.current_task()
        for t in _tasks() - before:
            if t is not me and t is not task and not t.done():
                t.cancel()


class _TestTimeout(Exception):
    pass


async def run_suite(user_code, tests_json, test_timeout=5.0, report=None):
    t_start = _time.perf_counter()
    sources = _json.loads(tests_json) if isinstance(tests_json, str) else list(tests_json)

    def emit(evt):
        if report is None:
            return
        try:
            report(_json.dumps(evt))
        except Exception:
            pass

    plan = [{'level': i + 1, 'names': _plan(src)} for i, src in enumerate(sources)]
    emit({'type': 'plan', 'plan': plan})

    cap = _Capture(emit)
    out = {'results': [], 'stdout': ''}
    results = out['results']
    old_in = _sys.stdin
    _sys.stdin = _io.StringIO('')
    try:
        with _contextlib.redirect_stdout(cap), _contextlib.redirect_stderr(cap):
            ns, err, line = _load_user(user_code)
            if err:
                out['error'] = err
                if line:
                    out['errorLine'] = line
            else:
                for level, src in enumerate(sources, 1):
                    fname = 'tests_l%d.py' % level
                    _register(fname, src)
                    try:
                        exec(compile(src, fname, 'exec'), ns)
                    except BaseException as e:
                        why = 'Could not load the level %d tests: %s' % (level, _head(e))
                        if isinstance(e, SyntaxError):
                            why = 'The level %d tests have a syntax error (a lab bug): %s' % (level, _syntax_message(e))
                        for name in plan[level - 1]['names'] or [fname]:
                            rec = {'name': name, 'level': level, 'ok': False, 'error': _clip(why), 'ms': 0}
                            results.append(rec)
                            emit({'type': 'done', 'result': rec})
                        continue
                    fns = [
                        v
                        for k, v in list(ns.items())
                        if k.startswith('test_')
                        and callable(v)
                        and getattr(getattr(v, '__code__', None), 'co_filename', None) == fname
                    ]
                    fns.sort(key=lambda f: f.__code__.co_firstlineno)
                    for fn in fns:
                        name = fn.__name__
                        emit({'type': 'start', 'name': name, 'level': level})
                        t0 = _time.perf_counter()
                        rec = {'name': name, 'level': level, 'ok': True}
                        try:
                            await _call(fn, test_timeout)
                        except _TestTimeout as e:
                            rec['ok'] = False
                            rec['error'] = str(e)
                            rec['timeout'] = True
                        except BaseException as e:
                            if isinstance(e, (KeyboardInterrupt,)):
                                raise
                            rec['ok'] = False
                            msg, uline = _describe(e, fname)
                            if isinstance(e, SystemExit):
                                msg = 'SystemExit: the code called exit()'
                            rec['error'] = msg
                            if uline:
                                rec['line'] = uline
                            rec['trace'] = _trace(e, (USER_FILE, fname))
                        rec['ms'] = round((_time.perf_counter() - t0) * 1000, 2)
                        results.append(rec)
                        cap.flush_out()
                        emit({'type': 'done', 'result': rec})
    finally:
        _sys.stdin = old_in
    out['stdout'] = cap.getvalue()
    out['ms'] = round((_time.perf_counter() - t_start) * 1000, 1)
    return _json.dumps(out)
`
