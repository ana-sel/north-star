"""Tests for the goal-tree builder.

Pure helper test — no DB, no FastAPI client. We feed `_build_tree`
SimpleNamespace stand-ins for ORM Card rows so we don't need a session.
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace

from app.api.cards import _build_tree


def _stub(
    *,
    parent_id: uuid.UUID | None = None,
    title: str = "x",
    level: str = "goal",
):
    return SimpleNamespace(
        id=uuid.uuid4(),
        parent_id=parent_id,
        title=title,
        description=None,
        level=level,
        type="goal",
        status="inbox",
        life_area=None,
        energy_required="medium",
        priority="medium",
        moved_count=0,
        completed_at=None,
    )


def test_empty_input_yields_empty_tree():
    assert _build_tree([]) == []


def test_single_root_card_becomes_one_node():
    card = _stub(title="My Goal")
    tree = _build_tree([card])
    assert len(tree) == 1
    assert tree[0].title == "My Goal"
    assert tree[0].children == []


def test_parent_child_relationship_nests_correctly():
    parent = _stub(title="Goal", level="goal")
    child = _stub(parent_id=parent.id, title="Project", level="project")
    tree = _build_tree([parent, child])
    assert len(tree) == 1
    assert tree[0].title == "Goal"
    assert len(tree[0].children) == 1
    assert tree[0].children[0].title == "Project"


def test_multi_level_hierarchy():
    vision = _stub(title="V", level="vision")
    goal = _stub(parent_id=vision.id, title="G", level="goal")
    project = _stub(parent_id=goal.id, title="P", level="project")
    milestone = _stub(parent_id=project.id, title="M", level="milestone")
    tree = _build_tree([vision, goal, project, milestone])
    assert len(tree) == 1
    assert tree[0].children[0].children[0].children[0].title == "M"


def test_orphan_with_missing_parent_promoted_to_root():
    """If a card's parent isn't in the input set (filtered out), the
    card surfaces as a root rather than disappearing."""
    orphan = _stub(parent_id=uuid.uuid4(), title="Orphan")
    tree = _build_tree([orphan])
    assert len(tree) == 1
    assert tree[0].title == "Orphan"


def test_multiple_roots_preserved():
    a = _stub(title="A")
    b = _stub(title="B")
    tree = _build_tree([a, b])
    assert {n.title for n in tree} == {"A", "B"}


def test_siblings_under_same_parent():
    parent = _stub(title="P")
    c1 = _stub(parent_id=parent.id, title="c1")
    c2 = _stub(parent_id=parent.id, title="c2")
    tree = _build_tree([parent, c1, c2])
    assert len(tree) == 1
    assert {c.title for c in tree[0].children} == {"c1", "c2"}
