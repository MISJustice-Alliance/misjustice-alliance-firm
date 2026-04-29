"""Tests for crew registry."""

import pytest
from misjustice_crews.bridge.registry import CrewRegistry


def test_list_crews():
    reg = CrewRegistry()
    crews = reg.list_crews()
    assert "intake" in crews
    assert "research" in crews
    assert "drafting" in crews
    assert "advocacy" in crews
    assert "support" in crews


def test_resolve_canonical():
    reg = CrewRegistry()
    assert reg.resolve("intake") == "intake"
    assert reg.resolve("INTAKE") == "intake"


def test_resolve_alias():
    reg = CrewRegistry()
    assert reg.resolve("legal_research") == "research"
    assert reg.resolve("referral") == "advocacy"


def test_resolve_unknown():
    reg = CrewRegistry()
    with pytest.raises(KeyError):
        reg.resolve("nonexistent")


def test_get_crew_config():
    reg = CrewRegistry()
    cfg = reg.get_crew_config("research")
    assert cfg["name"] == "research"
    assert "class" in cfg
