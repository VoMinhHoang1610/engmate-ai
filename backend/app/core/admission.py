"""Fail-fast per-account and process limits for expensive provider operations."""

import asyncio
from collections import Counter
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import HTTPException


class Admission:
    """Count whole jobs on the event loop, not short-lived HTTP connections."""

    def __init__(self, total: int, per_user: int) -> None:
        """Keep only active owners; rejected requests never enter a queue."""
        self.total = total
        self.per_user = per_user
        self.active = 0
        self.users: Counter[int] = Counter()
        self.tasks: dict[asyncio.Task[object], int] = {}

    @asynccontextmanager
    async def slot(self, user_id: int) -> AsyncIterator[None]:
        """Reserve before any await and release on success, error or cancellation."""
        if self.active >= self.total or self.users[user_id] >= self.per_user:
            raise HTTPException(
                429,
                "Too many active AI operations; try again shortly.",
                headers={"Retry-After": "2"},
            )
        self.active += 1
        self.users[user_id] += 1
        task = asyncio.current_task()
        if task is not None:
            self.tasks[task] = user_id
        try:
            yield
        finally:
            self.active -= 1
            self.users[user_id] -= 1
            if not self.users[user_id]:
                del self.users[user_id]
            if task is not None:
                self.tasks.pop(task, None)

    async def shutdown(self, user_id: int | None = None) -> None:
        """Cancel account-owned operations at logout or app shutdown."""
        tasks = [
            task
            for task, owner in list(self.tasks.items())
            if task is not asyncio.current_task()
            and (user_id is None or owner == user_id)
        ]
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
