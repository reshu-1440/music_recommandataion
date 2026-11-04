"""
Unit tests for listening mood validation and edge cases.
Verifies rejection of numeric queries, keyboard mash, symbols, and off-topic requests.
"""

import pytest
from backend.app.agent.validator import validate_listening_mood
from backend.app.models.schemas import RecommendRequest
from backend.app.main import recommend


def test_validation_empty_query():
    res = validate_listening_mood("")
    assert not res.is_valid
    assert res.reason == "empty_query"

    res_spaces = validate_listening_mood("   \t  ")
    assert not res_spaces.is_valid
    assert res_spaces.reason == "empty_query"


def test_validation_numeric_noise():
    # User's exact prompt from screenshot
    res = validate_listening_mood("23458792345345")
    assert not res.is_valid
    assert res.reason == "numeric_only"
    assert "Numbers alone" in res.error_message

    res2 = validate_listening_mood("123456789")
    assert not res2.is_valid


def test_validation_symbols_only():
    res = validate_listening_mood("!@#$%^&*()")
    assert not res.is_valid
    assert res.reason == "symbols_only"

    res2 = validate_listening_mood("???????")
    assert not res2.is_valid


def test_validation_keyboard_mash():
    res = validate_listening_mood("asdfghjkl")
    assert not res.is_valid
    assert res.reason == "keyboard_mash"

    res2 = validate_listening_mood("qwertyuiop")
    assert not res2.is_valid

    res3 = validate_listening_mood("zxcvbnm")
    assert not res3.is_valid


def test_validation_repetitive_characters():
    res = validate_listening_mood("aaaaaa")
    assert not res.is_valid
    assert res.reason == "repetitive_characters"

    res2 = validate_listening_mood("zzzzzzzzz")
    assert not res2.is_valid


def test_validation_too_short():
    res = validate_listening_mood("a")
    assert not res.is_valid
    assert res.reason == "too_short"

    res2 = validate_listening_mood("x1")
    assert not res2.is_valid

    # Valid short terms must pass
    assert validate_listening_mood("pop").is_valid
    assert validate_listening_mood("rap").is_valid
    assert validate_listening_mood("gym").is_valid
    assert validate_listening_mood("sad").is_valid


def test_validation_off_topic_queries():
    res = validate_listening_mood("what is the capital of France")
    assert not res.is_valid
    assert res.reason == "off_topic_query"

    res2 = validate_listening_mood("write python code to sort an array")
    assert not res2.is_valid
    assert res2.reason == "off_topic_query"

    res3 = validate_listening_mood("how to cook pasta")
    assert not res3.is_valid
    assert res3.reason == "off_topic_query"

    res4 = validate_listening_mood("buy groceries for dinner")
    assert not res4.is_valid


def test_validation_valid_moods():
    assert validate_listening_mood("calm study music").is_valid
    assert validate_listening_mood("something calm for a 3 a.m. study session").is_valid
    assert validate_listening_mood("high energy gym workout hype tracks").is_valid
    assert validate_listening_mood("rainy sunday morning acoustic vibes").is_valid
    assert validate_listening_mood("synthwave night drive with neon retro keys").is_valid
    assert validate_listening_mood("heavy metal guitar riffs").is_valid
    assert validate_listening_mood("deep focus lo-fi beats").is_valid


def test_recommend_endpoint_rejects_numeric_query():
    req = RecommendRequest(
        query="23458792345345",
        discovery_mode="familiar",
        user_id="test_listener"
    )
    resp = recommend(req)
    assert not resp.is_valid
    assert resp.error_message is not None
    assert len(resp.tracks) == 0
    assert "Numbers alone" in resp.error_message or "valid" in resp.error_message
