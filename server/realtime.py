"""Tiny in-process realtime broker delivered over Server-Sent Events."""
import json
import queue
import threading
import time

_lock = threading.Lock()
_subs = {}  # user_id -> set[Queue]


def subscribe(user_id):
    qu = queue.Queue(maxsize=200)
    with _lock:
        _subs.setdefault(user_id, set()).add(qu)
    return qu


def unsubscribe(user_id, qu):
    with _lock:
        s = _subs.get(user_id)
        if s and qu in s:
            s.discard(qu)
            if not s:
                _subs.pop(user_id, None)


def publish(user_ids, event, data):
    payload = {"type": event, "data": data, "ts": time.time()}
    with _lock:
        targets = [q for uid in set(user_ids) for q in _subs.get(uid, ())]
    for qu in targets:
        try:
            qu.put_nowait(payload)
        except queue.Full:
            pass


def stream(user_id):
    qu = subscribe(user_id)

    def gen():
        try:
            yield "retry: 3000\n\n"
            yield "event: hello\ndata: {}\n\n"
            while True:
                try:
                    item = qu.get(timeout=15)
                    yield f"event: {item['type']}\ndata: {json.dumps(item, ensure_ascii=False)}\n\n"
                except queue.Empty:
                    yield ": ping\n\n"
        finally:
            unsubscribe(user_id, qu)

    return gen()
