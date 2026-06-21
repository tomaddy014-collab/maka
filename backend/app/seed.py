"""Seed the quotes table from JSON-style data — the SAME placeholders as the
frontend. ⚠️ ALL UNVERIFIED: LLMs misattribute real quotes. Verify wording +
author before trusting; flip `verified` to true once you've confirmed them.
"""
from sqlalchemy.orm import Session

from . import models

SEED_QUOTES = [
    ("pre_workout", "The last three reps is what makes the muscle grow."),
    ("pre_workout", "Everybody wants to be a bodybuilder, but nobody wants to lift heavy-ass weight."),
    ("pre_workout", "Step under the bar like you mean it, or don't step under it at all."),
    ("discipline", "Discipline is doing the work on the day you have every excuse not to."),
    ("discipline", "Motivation gets you started; the routine carries you the rest of the way."),
    ("discipline", "Champions are built in the hours nobody is watching."),
    ("nutrition", "You can't out-train a careless kitchen."),
    ("nutrition", "Eat for the body you are building, not the one you have."),
    ("nutrition", "Protein, patience, and consistency — the rest is detail."),
    ("recovery", "The muscle is broken in the gym and built in your sleep."),
    ("recovery", "Rest is not the reward for the work; it is part of the work."),
    ("recovery", "Listen when the body asks for a quiet day — that is wisdom, not weakness."),
    ("perseverance", "Fall down seven times, load the bar an eighth."),
    ("perseverance", "Strength is the residue of showing up after the failures."),
    ("perseverance", "The weight does not care how you feel; pick it up anyway."),
]


def seed_quotes(db: Session) -> None:
    if db.query(models.Quote).count() > 0:
        return
    for category, text in SEED_QUOTES:
        db.add(models.Quote(category=category, text=text,
                            author="PLACEHOLDER — verify", verified=False))
    db.commit()
